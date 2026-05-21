import { Prisma } from '@prisma/client';
import type { JobType, CareerLevel, WorkplaceType, VisaStatus } from '@prisma/client';
import type { NextRequest } from 'next/server';
import {
  badRequest,
  conflict,
  created,
  forbidden,
  internalError,
  paginated,
  tooManyRequests,
  unauthorized,
} from '@/lib/api/response';
import { getSession, hasRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { mutationRateLimit, publicRateLimit } from '@/lib/rate-limit';
import { buildPaginationMeta } from '@/lib/validations/shared';
import {
  CreateJobSchema,
  CAREER_LEVELS,
  JOB_TYPES,
  JobQuerySchema,
} from '@/lib/validations/job';
import { generateJobSlug } from '@/lib/utils/slugify';

const RETRY_AFTER_SECONDS = 60;

const getClientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',').at(0)?.trim() ?? 'unknown';

const buildOrderBy = (
  sort: 'newest' | 'oldest' | 'salary_desc'
): Prisma.JobOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return [{ featured: 'desc' }, { postedDate: 'asc' }];
    case 'salary_desc':
      return [
        { featured: 'desc' },
        { salaryMax: { sort: 'desc', nulls: 'last' } },
      ];
    default:
      return [{ featured: 'desc' }, { postedDate: 'desc' }];
  }
};

const buildWhereClause = (
  query: ReturnType<typeof JobQuerySchema.parse>
): Prisma.JobWhereInput => {
  const { q, type, level, remote, visa, featured } = query;

  const types = type
    ? type
        .split(',')
        .filter((t): t is JobType =>
          (JOB_TYPES as readonly string[]).includes(t)
        )
    : undefined;

  const levels = level
    ? level
        .split(',')
        .filter((l): l is CareerLevel =>
          (CAREER_LEVELS as readonly string[]).includes(l)
        )
    : undefined;

  return {
    status: 'ACTIVE',
    ...(q && {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { company: { name: { contains: q, mode: 'insensitive' } } },
        { workplaceCity: { contains: q, mode: 'insensitive' } },
      ],
    }),
    ...(types?.length && { type: { in: types } }),
    ...(levels?.length && {
      careerLevels: { some: { level: { in: levels } } },
    }),
    ...(remote === 'true' && { workplaceType: 'REMOTE' as WorkplaceType }),
    ...(visa === 'true' && { visaSponsorship: 'YES' as VisaStatus }),
    ...(featured === 'true' && { featured: true }),
  };
};

const JOB_LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  type: true,
  status: true,
  salaryMin: true,
  salaryMax: true,
  salaryCurrency: true,
  salaryUnit: true,
  workplaceType: true,
  workplaceCity: true,
  workplaceCountry: true,
  remoteRegion: true,
  visaSponsorship: true,
  featured: true,
  postedDate: true,
  validThrough: true,
  viewCount: true,
  company: {
    select: { id: true, name: true, slug: true, logo: true },
  },
  careerLevels: { select: { level: true } },
  languages: { select: { language: true } },
} satisfies Prisma.JobSelect;

// GET /api/v1/jobs — paginated public list of active jobs
export const GET = async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rl = publicRateLimit(ip);
  if (!rl.success) {
    return tooManyRequests(RETRY_AFTER_SECONDS);
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = JobQuerySchema.safeParse(params);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.at(0)?.message ?? 'Invalid query parameters.');
  }

  const { page, per_page: perPage, sort } = parsed.data;
  const where = buildWhereClause(parsed.data);
  const orderBy = buildOrderBy(sort);

  try {
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        select: JOB_LIST_SELECT,
        orderBy,
        take: perPage,
        skip: (page - 1) * perPage,
      }),
      prisma.job.count({ where }),
    ]);

    return paginated(jobs, buildPaginationMeta(page, perPage, total));
  } catch {
    return internalError();
  }
};

// POST /api/v1/jobs — create a job (EMPLOYER or ADMIN)
export const POST = async (request: NextRequest) => {
  const ip = getClientIp(request);
  const rl = mutationRateLimit(ip);
  if (!rl.success) {
    return tooManyRequests(RETRY_AFTER_SECONDS);
  }

  const user = await getSession();
  if (!user) return unauthorized();
  if (!hasRole(user, 'EMPLOYER', 'ADMIN')) return forbidden();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(parsed.error.issues.at(0)?.message ?? 'Invalid request body.');
  }

  const data = parsed.data;

  // Resolve the company for this job
  const companyId =
    user.role === 'ADMIN'
      ? ((body as Record<string, unknown>).companyId as string | undefined) ??
        user.companyId
      : user.companyId;

  if (!companyId) {
    return badRequest('No company associated with this account.');
  }

  // Verify company exists
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });
  if (!company) {
    return badRequest('Company not found.');
  }

  // Generate a unique slug (base-36 timestamp suffix ensures uniqueness)
  const slug = `${generateJobSlug(data.title, company.name)}-${Date.now().toString(36)}`;

  // ADMIN can publish directly; employers create in PENDING state
  const status = user.role === 'ADMIN' ? 'ACTIVE' : 'PENDING';

  try {
    const job = await prisma.job.create({
      data: {
        title: data.title,
        slug,
        type: data.type,
        status,
        description: data.description,
        benefits: data.benefits,
        applicationRequirements: data.applicationRequirements,
        skills: data.skills,
        qualifications: data.qualifications,
        educationRequirements: data.educationRequirements,
        experienceRequirements: data.experienceRequirements,
        responsibilities: data.responsibilities,
        applyUrl: data.applyUrl,
        applyInApp: data.applyInApp,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        salaryCurrency: data.salaryCurrency,
        salaryUnit: data.salaryUnit,
        workplaceType: data.workplaceType,
        remoteRegion: data.remoteRegion,
        timezoneRequirements: data.timezoneRequirements,
        workplaceCity: data.workplaceCity,
        workplaceCountry: data.workplaceCountry,
        visaSponsorship: data.visaSponsorship,
        validThrough: data.validThrough ? new Date(data.validThrough) : undefined,
        occupationalCategory: data.occupationalCategory,
        industry: data.industry,
        companyId,
        careerLevels: {
          create: data.careerLevels.map((level) => ({ level })),
        },
        languages: {
          create: data.languages.map((language) => ({ language })),
        },
      },
      select: {
        id: true,
        slug: true,
        title: true,
        status: true,
        type: true,
        companyId: true,
      },
    });

    return created(job);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return conflict('A job with this slug already exists.');
      }
    }
    return internalError();
  }
};
