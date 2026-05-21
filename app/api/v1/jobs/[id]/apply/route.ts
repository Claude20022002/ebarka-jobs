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

type JobForApply = {
  id: string;
  status: string;
  applyInApp: boolean;
  companyId: string;
};

const fetchJobForApply = async (jobId: string): Promise<JobForApply | null> =>
  prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, applyInApp: true, companyId: true },
  });

const checkJobEligibility = (
  job: JobForApply | null,
  userCompanyId: string | null
): string | null => {
  if (!job || job.status !== 'ACTIVE') {
    return 'not_found';
  }
  if (!job.applyInApp) {
    return 'no_inapp';
  }
  if (userCompanyId !== null && userCompanyId === job.companyId) {
    return 'own_company';
  }
  return null;
};

// POST /api/v1/jobs/[id]/apply — submit a candidature (CANDIDATE only)
export const POST = async (request: NextRequest, context: RouteContext) => {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',').at(0)?.trim() ?? 'unknown';
  const rl = mutationRateLimit(ip);
  if (!rl.success) {
    return tooManyRequests(RETRY_AFTER_SECONDS);
  }

  const user = await getSession();
  if (!user) {
    return unauthorized();
  }
  if (!hasRole(user, 'CANDIDATE')) {
    return forbidden();
  }

  const { id: jobId } = await context.params;
  const job = await fetchJobForApply(jobId);
  const issue = checkJobEligibility(job, user.companyId);

  if (issue === 'not_found') {
    return notFound('Job');
  }
  if (issue === 'no_inapp') {
    return badRequest('This job does not accept in-app applications.');
  }
  if (issue === 'own_company') {
    return forbidden();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = CreateApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.at(0)?.message ?? 'Invalid request body.'
    );
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
        documents: {
          create: documentIds.map((documentId) => ({ documentId })),
        },
      },
      select: { id: true, status: true, jobId: true, createdAt: true },
    });

    return created(application);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return conflict('You have already applied to this position.');
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2003'
    ) {
      return badRequest('One or more documents were not found.');
    }
    return internalError();
  }
};
