import { Prisma } from '@prisma/client';
import type { NextRequest } from 'next/server';
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  ok,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { getSession, isOwnerOrAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { mutationRateLimit, publicRateLimit } from '@/lib/rate-limit';
import { UpdateJobSchema } from '@/lib/validations/job';

const RETRY_AFTER_SECONDS = 60;

type RouteContext = { params: Promise<{ id: string }> };

const getClientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',').at(0)?.trim() ?? 'unknown';

const JOB_DETAIL_SELECT = {
  id: true,
  title: true,
  slug: true,
  type: true,
  status: true,
  featured: true,
  salaryMin: true,
  salaryMax: true,
  salaryCurrency: true,
  salaryUnit: true,
  description: true,
  benefits: true,
  applicationRequirements: true,
  skills: true,
  qualifications: true,
  educationRequirements: true,
  experienceRequirements: true,
  responsibilities: true,
  applyUrl: true,
  applyInApp: true,
  workplaceType: true,
  workplaceCity: true,
  workplaceCountry: true,
  remoteRegion: true,
  timezoneRequirements: true,
  visaSponsorship: true,
  occupationalCategory: true,
  industry: true,
  jobIdentifier: true,
  postedDate: true,
  validThrough: true,
  updatedAt: true,
  viewCount: true,
  clickCount: true,
  companyId: true,
  company: {
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      website: true,
      description: true,
      industry: true,
      size: true,
      location: true,
      verified: true,
    },
  },
  careerLevels: { select: { level: true } },
  languages: { select: { language: true } },
} satisfies Prisma.JobSelect;

// Whether the current user may see a non-ACTIVE job.
const userMayViewHiddenJob = async (companyId: string) => {
  const user = await getSession();
  return user !== null && isOwnerOrAdmin(user, companyId);
};

// GET /api/v1/jobs/[id] — public job detail
export const GET = async (request: NextRequest, context: RouteContext) => {
  const ip = getClientIp(request);
  const rl = publicRateLimit(ip);
  if (!rl.success) {
    return tooManyRequests(RETRY_AFTER_SECONDS);
  }

  const { id } = await context.params;

  try {
    const job = await prisma.job.findUnique({
      where: { id },
      select: JOB_DETAIL_SELECT,
    });

    if (!job) {
      return notFound('Job');
    }

    if (job.status !== 'ACTIVE') {
      const allowed = await userMayViewHiddenJob(job.companyId);
      if (!allowed) {
        return notFound('Job');
      }
    }

    await prisma.job.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return ok(job);
  } catch {
    return internalError();
  }
};

// PUT /api/v1/jobs/[id] — update a job (owner or ADMIN)
export const PUT = async (request: NextRequest, context: RouteContext) => {
  const ip = getClientIp(request);
  const rl = mutationRateLimit(ip);
  if (!rl.success) {
    return tooManyRequests(RETRY_AFTER_SECONDS);
  }

  const user = await getSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  const existing = await prisma.job.findUnique({
    where: { id },
    select: { companyId: true },
  });
  if (!existing) {
    return notFound('Job');
  }
  if (!isOwnerOrAdmin(user, existing.companyId)) {
    return forbidden();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = UpdateJobSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.at(0)?.message ?? 'Invalid request body.'
    );
  }

  const { careerLevels, languages, validThrough, ...scalarFields } = parsed.data;

  try {
    const job = await prisma.job.update({
      where: { id },
      data: {
        ...scalarFields,
        ...(validThrough !== undefined && { validThrough: new Date(validThrough) }),
        ...(careerLevels !== undefined && {
          careerLevels: {
            deleteMany: {},
            create: careerLevels.map((level) => ({ level })),
          },
        }),
        ...(languages !== undefined && {
          languages: {
            deleteMany: {},
            create: languages.map((language) => ({ language })),
          },
        }),
      },
      select: { id: true, slug: true, title: true, status: true, updatedAt: true },
    });

    return ok(job);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return notFound('Job');
    }
    return internalError();
  }
};

// DELETE /api/v1/jobs/[id] — archive (EMPLOYER) or hard-delete (ADMIN ?permanent=true)
export const DELETE = async (request: NextRequest, context: RouteContext) => {
  const ip = getClientIp(request);
  const rl = mutationRateLimit(ip);
  if (!rl.success) {
    return tooManyRequests(RETRY_AFTER_SECONDS);
  }

  const user = await getSession();
  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;

  const existing = await prisma.job.findUnique({
    where: { id },
    select: { companyId: true },
  });
  if (!existing) {
    return notFound('Job');
  }
  if (!isOwnerOrAdmin(user, existing.companyId)) {
    return forbidden();
  }

  const permanent =
    user.role === 'ADMIN' &&
    request.nextUrl.searchParams.get('permanent') === 'true';

  try {
    if (permanent) {
      await prisma.job.delete({ where: { id } });
      return ok({ id, deleted: true });
    }

    const job = await prisma.job.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: { id: true, status: true },
    });
    return ok(job);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return notFound('Job');
    }
    return internalError();
  }
};
