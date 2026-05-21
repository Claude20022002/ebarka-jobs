import { Prisma } from '@prisma/client';
import type { CareerLevel, JobType, VisaStatus, WorkplaceType } from '@prisma/client';
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
  CAREER_LEVELS,
  CreateJobSchema,
  JOB_TYPES,
  type JobQueryInput,
  JobQuerySchema,
} from '@/lib/validations/job';
import { generateJobSlug } from '@/lib/utils/slugify';

const RETRY_AFTER_SECONDS = 60;
const BASE36 = 36;

const getClientIp = (request: NextRequest) =>
  request.headers.get('x-forwarded-for')?.split(',').at(0)?.trim() ?? 'unknown';

// ── Ordering ────────────────────────────────────────────────────────────────

const buildOrderBy = (
  sort: JobQueryInput['sort']
): Prisma.JobOrderByWithRelationInput[] => {
  if (sort === 'oldest') {
    return [{ featured: 'desc' }, { postedDate: 'asc' }];
  }
  if (sort === 'salary_desc') {
    return [{ featured: 'desc' }, { salaryMax: { sort: 'desc', nulls: 'last' } }];
  }
  return [{ featured: 'desc' }, { postedDate: 'desc' }];
};

// ── Filter helpers ───────────────────────────────────────────────────────────

const parseJobTypes = (type: string | undefined): JobType[] | undefined => {
  if (!type) {
    return;
  }
  const parsed = type
    .split(',')
    .filter((t): t is JobType => (JOB_TYPES as readonly string[]).includes(t));
  return parsed.length ? parsed : undefined;
};

const parseCareerLevels = (
  level: string | undefined
): CareerLevel[] | undefined => {
  if (!level) {
    return;
  }
  const parsed = level
    .split(',')
    .filter((l): l is CareerLevel =>
      (CAREER_LEVELS as readonly string[]).includes(l)
    );
  return parsed.length ? parsed : undefined;
};

const buildWhereClause = (query: JobQueryInput): Prisma.JobWhereInput => {
  const types = parseJobTypes(query.type);
  const levels = parseCareerLevels(query.level);

  return {
    status: 'ACTIVE',
    ...(query.q && {
      OR: [
        { title: { contains: query.q, mode: 'insensitive' } },
        { company: { name: { contains: query.q, mode: 'insensitive' } } },
        { workplaceCity: { contains: query.q, mode: 'insensitive' } },
      ],
    }),
    ...(types && { type: { in: types } }),
    ...(levels && { careerLevels: { some: { level: { in: levels } } } }),
    ...(query.remote === 'true' && { workplaceType: 'REMOTE' as WorkplaceType }),
    ...(query.visa === 'true' && { visaSponsorship: 'YES' as VisaStatus }),
    ...(query.featured === 'true' && { featured: true }),
  };
};

// ── Select shape ─────────────────────────────────────────────────────────────

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
  company: { select: { id: true, name: true, slug: true, logo: true } },
  careerLevels: { select: { level: true } },
  languages: { select: { language: true } },
} satisfies Prisma.JobSelect;

// ── Company resolution ────────────────────────────────────────────────────────

import type { SessionUser } from '@/lib/auth/session';

const resolveCompanyId = (user: SessionUser, body: unknown): string | null => {
  if (user.role !== 'ADMIN') {
    return user.companyId;
  }
  const raw = (body as Record<string, unknown>).companyId;
  return typeof raw === 'string' ? raw : user.companyId;
};

// ── Handlers ─────────────────────────────────────────────────────────────────

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
    return badRequest(
      parsed.error.issues.at(0)?.message ?? 'Invalid query parameters.'
    );
  }

  const { page, per_page: perPage, sort } = parsed.data;

  try {
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where: buildWhereClause(parsed.data),
        select: JOB_LIST_SELECT,
        orderBy: buildOrderBy(sort),
        take: perPage,
        skip: (page - 1) * perPage,
      }),
      prisma.job.count({ where: buildWhereClause(parsed.data) }),
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
  if (!user) {
    return unauthorized();
  }
  if (!hasRole(user, 'EMPLOYER', 'ADMIN')) {
    return forbidden();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = CreateJobSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.at(0)?.message ?? 'Invalid request body.'
    );
  }

  const data = parsed.data;

  const companyId = resolveCompanyId(user, body);

  if (!companyId) {
    return badRequest('No company associated with this account.');
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  });
  if (!company) {
    return badRequest('Company not found.');
  }

  const slug = `${generateJobSlug(data.title, company.name)}-${Date.now().toString(BASE36)}`;
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
        careerLevels: { create: data.careerLevels.map((level) => ({ level })) },
        languages: { create: data.languages.map((language) => ({ language })) },
      },
      select: { id: true, slug: true, title: true, status: true, type: true, companyId: true },
    });

    return created(job);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return conflict('A job with this slug already exists.');
    }
    return internalError();
  }
};
