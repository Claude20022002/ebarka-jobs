import { Prisma } from '@prisma/client';
import type { NextRequest } from 'next/server';
import {
  badRequest,
  conflict,
  created,
  forbidden,
  internalError,
  notFound,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { getSession, hasRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { mutationRateLimit } from '@/lib/rate-limit';
import { CreateApplicationSchema } from '@/lib/validations/application';

const RETRY_AFTER_SECONDS = 60;

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/v1/jobs/[id]/apply — submit a candidature (CANDIDATE only)
export const POST = async (request: NextRequest, context: RouteContext) => {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',').at(0)?.trim() ?? 'unknown';
  const rl = mutationRateLimit(ip);
  if (!rl.success) {
    return tooManyRequests(RETRY_AFTER_SECONDS);
  }

  const user = await getSession();
  if (!user) return unauthorized();
  if (!hasRole(user, 'CANDIDATE')) {
    return forbidden();
  }

  const { id: jobId } = await context.params;

  // Ensure the job exists and is active
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, applyInApp: true, companyId: true },
  });

  if (!job || job.status !== 'ACTIVE') return notFound('Job');

  if (!job.applyInApp) {
    return badRequest('This job does not accept in-app applications.');
  }

  // Candidates cannot apply to a job from their own company
  if (user.companyId && user.companyId === job.companyId) {
    return forbidden();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Body is optional — default to empty object when not provided
    body = {};
  }

  const parsed = CreateApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.at(0)?.message ?? 'Invalid request body.');
  }

  const { coverLetter, message, documentIds } = parsed.data;

  try {
    const application = await prisma.application.create({
      data: {
        jobId,
        userId: user.id,
        coverLetter,
        message,
        status: 'PENDING',
        ...(documentIds.length > 0 && {
          documents: {
            create: documentIds.map((documentId) => ({ documentId })),
          },
        }),
      },
      select: {
        id: true,
        status: true,
        jobId: true,
        createdAt: true,
      },
    });

    return created(application);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return conflict('You have already applied to this position.');
      }
      if (error.code === 'P2003') {
        return badRequest('One or more documents were not found.');
      }
    }
    return internalError();
  }
};
