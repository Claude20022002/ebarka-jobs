import type {
  JobStatus,
  Prisma,
  CareerLevel as PrismaCareerLevel,
  JobType as PrismaJobType,
  SalaryUnit as PrismaSalaryUnit,
  WorkplaceType as PrismaWorkplaceType,
  VisaStatus,
} from '@prisma/client';
import { cache } from 'react';
import type { CurrencyCode } from '@/lib/constants/currencies';
import { LANGUAGE_CODES, type LanguageCode } from '@/lib/constants/languages';
import type { RemoteRegion, WorkplaceType } from '@/lib/constants/workplace';
import type {
  CareerLevel,
  Job as PublicJob,
  SalaryUnit,
} from '@/lib/db/airtable';
import { prisma } from '@/lib/db/prisma';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 25;
const MAX_PER_PAGE = 100;
const SIMILAR_JOBS_LIMIT = 3;

const ACTIVE_JOB_STATUS = 'ACTIVE' satisfies JobStatus;

const PUBLIC_JOB_TYPES = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT: 'Contract',
  FREELANCE: 'Freelance',
  // The legacy public Job type has no Internship variant yet.
  INTERNSHIP: 'Contract',
} as const satisfies Record<PrismaJobType, PublicJob['type']>;

const PRISMA_JOB_TYPES: Readonly<Record<string, PrismaJobType>> = {
  'full-time': 'FULL_TIME',
  full_time: 'FULL_TIME',
  fulltime: 'FULL_TIME',
  'Full-time': 'FULL_TIME',
  'Part-time': 'PART_TIME',
  'part-time': 'PART_TIME',
  part_time: 'PART_TIME',
  parttime: 'PART_TIME',
  Contract: 'CONTRACT',
  contract: 'CONTRACT',
  Freelance: 'FREELANCE',
  freelance: 'FREELANCE',
  Internship: 'INTERNSHIP',
  internship: 'INTERNSHIP',
};

const PUBLIC_CAREER_LEVELS = {
  INTERNSHIP: 'Internship',
  ENTRY_LEVEL: 'EntryLevel',
  ASSOCIATE: 'Associate',
  JUNIOR: 'Junior',
  MID_LEVEL: 'MidLevel',
  SENIOR: 'Senior',
  STAFF: 'Staff',
  PRINCIPAL: 'Principal',
  LEAD: 'Lead',
  MANAGER: 'Manager',
  SENIOR_MANAGER: 'SeniorManager',
  DIRECTOR: 'Director',
  SENIOR_DIRECTOR: 'SeniorDirector',
  VP: 'VP',
  SVP: 'SVP',
  EVP: 'EVP',
  C_LEVEL: 'CLevel',
  NOT_SPECIFIED: 'NotSpecified',
} as const satisfies Record<PrismaCareerLevel, Exclude<CareerLevel, 'Founder'>>;

const PRISMA_CAREER_LEVELS: Readonly<Record<string, PrismaCareerLevel>> = {
  Internship: 'INTERNSHIP',
  internship: 'INTERNSHIP',
  INTERNSHIP: 'INTERNSHIP',
  EntryLevel: 'ENTRY_LEVEL',
  entry_level: 'ENTRY_LEVEL',
  ENTRY_LEVEL: 'ENTRY_LEVEL',
  Associate: 'ASSOCIATE',
  associate: 'ASSOCIATE',
  ASSOCIATE: 'ASSOCIATE',
  Junior: 'JUNIOR',
  junior: 'JUNIOR',
  JUNIOR: 'JUNIOR',
  MidLevel: 'MID_LEVEL',
  mid_level: 'MID_LEVEL',
  MID_LEVEL: 'MID_LEVEL',
  Senior: 'SENIOR',
  senior: 'SENIOR',
  SENIOR: 'SENIOR',
  Staff: 'STAFF',
  staff: 'STAFF',
  STAFF: 'STAFF',
  Principal: 'PRINCIPAL',
  principal: 'PRINCIPAL',
  PRINCIPAL: 'PRINCIPAL',
  Lead: 'LEAD',
  lead: 'LEAD',
  LEAD: 'LEAD',
  Manager: 'MANAGER',
  manager: 'MANAGER',
  MANAGER: 'MANAGER',
  SeniorManager: 'SENIOR_MANAGER',
  senior_manager: 'SENIOR_MANAGER',
  SENIOR_MANAGER: 'SENIOR_MANAGER',
  Director: 'DIRECTOR',
  director: 'DIRECTOR',
  DIRECTOR: 'DIRECTOR',
  SeniorDirector: 'SENIOR_DIRECTOR',
  senior_director: 'SENIOR_DIRECTOR',
  SENIOR_DIRECTOR: 'SENIOR_DIRECTOR',
  VP: 'VP',
  vp: 'VP',
  SVP: 'SVP',
  svp: 'SVP',
  EVP: 'EVP',
  evp: 'EVP',
  CLevel: 'C_LEVEL',
  c_level: 'C_LEVEL',
  C_LEVEL: 'C_LEVEL',
  NotSpecified: 'NOT_SPECIFIED',
  not_specified: 'NOT_SPECIFIED',
  NOT_SPECIFIED: 'NOT_SPECIFIED',
};

const PUBLIC_WORKPLACE_TYPES = {
  ON_SITE: 'On-site',
  HYBRID: 'Hybrid',
  REMOTE: 'Remote',
  NOT_SPECIFIED: 'Not specified',
} as const satisfies Record<PrismaWorkplaceType, WorkplaceType>;

const PUBLIC_SALARY_UNITS = {
  HOUR: 'hour',
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  PROJECT: 'project',
} as const satisfies Record<PrismaSalaryUnit, SalaryUnit>;

const PUBLIC_VISA_STATUSES = {
  YES: 'Yes',
  NO: 'No',
  NOT_SPECIFIED: 'Not specified',
} as const satisfies Record<VisaStatus, PublicJob['visa_sponsorship']>;

const JOB_INCLUDE = {
  company: {
    select: {
      name: true,
    },
  },
  careerLevels: {
    select: {
      level: true,
    },
  },
  languages: {
    select: {
      language: true,
    },
  },
} as const satisfies Prisma.JobInclude;

type JobWithRelations = Prisma.JobGetPayload<{
  include: typeof JOB_INCLUDE;
}>;

export type JobSort = 'newest' | 'oldest' | 'salary';

export type JobFilters = {
  q?: string | null;
  type?: string | string[] | null;
  level?: string | string[] | null;
  remote?: boolean | string | null;
  salary?: string | string[] | null;
  visa?: boolean | string | null;
  language?: string | string[] | null;
  page?: number | string | null;
  perPage?: number | string | null;
  sort?: JobSort | string | null;
};

export type PaginatedJobs = {
  jobs: PublicJob[];
  total: number;
  pages: number;
  page: number;
  perPage: number;
};

export type JobStats = {
  total: number;
  active: number;
  featured: number;
  companies: number;
  addedToday: number;
};

function toArray(value: string | string[] | null | undefined): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => item.split(',')).filter(Boolean);
  }

  return value.split(',').filter(Boolean);
}

function parsePositiveInteger(
  value: number | string | null | undefined,
  fallback: number
): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  return fallback;
}

function parseBoolean(value: boolean | string | null | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return value === 'true' || value === '1' || value === 'yes';
}

function normalizePerPage(value: number | string | null | undefined): number {
  const perPage = parsePositiveInteger(value, DEFAULT_PER_PAGE);
  if (perPage > MAX_PER_PAGE) {
    return MAX_PER_PAGE;
  }

  return perPage;
}

function parseJobTypes(
  value: string | string[] | null | undefined
): PrismaJobType[] {
  return toArray(value).flatMap((item) => {
    const type = PRISMA_JOB_TYPES[item.trim()];
    return type ? [type] : [];
  });
}

function parseCareerLevels(
  value: string | string[] | null | undefined
): PrismaCareerLevel[] {
  return toArray(value).flatMap((item) => {
    const level = PRISMA_CAREER_LEVELS[item.trim()];
    return level ? [level] : [];
  });
}

function parseLanguages(
  value: string | string[] | null | undefined
): LanguageCode[] {
  return toArray(value).flatMap((item) => {
    const language = item.trim().toLowerCase();
    return LANGUAGE_CODES.includes(language as LanguageCode)
      ? [language as LanguageCode]
      : [];
  });
}

function buildSalaryRangeWhere(range: string): Prisma.JobWhereInput | null {
  switch (range) {
    case '< $50K':
      return {
        salaryMax: {
          lt: 50_000,
        },
      };
    case '$50K - $100K':
      return {
        OR: [
          {
            salaryMin: {
              gte: 50_000,
              lte: 100_000,
            },
          },
          {
            salaryMax: {
              gte: 50_000,
              lte: 100_000,
            },
          },
        ],
      };
    case '$100K - $200K':
      return {
        OR: [
          {
            salaryMin: {
              gt: 100_000,
              lte: 200_000,
            },
          },
          {
            salaryMax: {
              gt: 100_000,
              lte: 200_000,
            },
          },
        ],
      };
    case '> $200K':
      return {
        OR: [
          {
            salaryMin: {
              gt: 200_000,
            },
          },
          {
            salaryMax: {
              gt: 200_000,
            },
          },
        ],
      };
    default:
      return null;
  }
}

function buildWhere(filters: JobFilters): Prisma.JobWhereInput {
  const jobTypes = parseJobTypes(filters.type);
  const careerLevels = parseCareerLevels(filters.level);
  const languages = parseLanguages(filters.language);
  const salaryRanges = toArray(filters.salary).flatMap((range) => {
    const salaryWhere = buildSalaryRangeWhere(range);
    return salaryWhere ? [salaryWhere] : [];
  });
  const search = filters.q?.trim();
  const where: Prisma.JobWhereInput = {
    status: ACTIVE_JOB_STATUS,
  };

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { company: { name: { contains: search, mode: 'insensitive' } } },
      { workplaceCity: { contains: search, mode: 'insensitive' } },
      { workplaceCountry: { contains: search, mode: 'insensitive' } },
      { industry: { contains: search, mode: 'insensitive' } },
      { skills: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (jobTypes.length > 0) {
    where.type = { in: jobTypes };
  }

  if (careerLevels.length > 0) {
    where.careerLevels = {
      some: {
        level: {
          in: careerLevels,
        },
      },
    };
  }

  if (parseBoolean(filters.remote)) {
    where.workplaceType = 'REMOTE';
  }

  if (salaryRanges.length > 0) {
    where.AND = [...(where.AND ? toArrayWhere(where.AND) : []), {
      OR: salaryRanges,
    }];
  }

  if (parseBoolean(filters.visa)) {
    where.visaSponsorship = 'YES';
  }

  if (languages.length > 0) {
    where.languages = {
      some: {
        language: {
          in: languages,
        },
      },
    };
  }

  return where;
}

function toArrayWhere(
  where: Prisma.JobWhereInput | Prisma.JobWhereInput[]
): Prisma.JobWhereInput[] {
  return Array.isArray(where) ? where : [where];
}

function buildOrderBy(
  sort: string | null | undefined
): Prisma.JobOrderByWithRelationInput[] {
  if (sort === 'oldest') {
    return [{ featured: 'desc' }, { postedDate: 'asc' }];
  }

  if (sort === 'salary') {
    return [{ featured: 'desc' }, { salaryMax: 'desc' }, { salaryMin: 'desc' }];
  }

  return [{ featured: 'desc' }, { postedDate: 'desc' }];
}

function toCurrencyCode(value: string): CurrencyCode {
  return value as CurrencyCode;
}

function toLanguageCode(value: string): LanguageCode | null {
  const language = value.toLowerCase();
  if (LANGUAGE_CODES.includes(language as LanguageCode)) {
    return language as LanguageCode;
  }

  return null;
}

function toRemoteRegion(value: string | null): RemoteRegion {
  const remoteRegions = [
    'Worldwide',
    'Americas Only',
    'Europe Only',
    'Asia-Pacific Only',
    'US Only',
    'EU Only',
    'UK/EU Only',
    'US/Canada Only',
  ] as const satisfies Exclude<RemoteRegion, null>[];

  return remoteRegions.includes(value as Exclude<RemoteRegion, null>)
    ? (value as RemoteRegion)
    : null;
}

function toSalary(job: JobWithRelations): PublicJob['salary'] {
  if (!(job.salaryMin || job.salaryMax || job.salaryUnit)) {
    return null;
  }

  return {
    min: job.salaryMin,
    max: job.salaryMax,
    currency: toCurrencyCode(job.salaryCurrency),
    unit: job.salaryUnit ? PUBLIC_SALARY_UNITS[job.salaryUnit] : 'year',
  };
}

export function toPublicJob(job: JobWithRelations): PublicJob {
  return {
    id: job.id,
    title: job.title,
    company: job.company.name,
    type: PUBLIC_JOB_TYPES[job.type],
    salary: toSalary(job),
    description: job.description,
    benefits: job.benefits,
    application_requirements: job.applicationRequirements,
    apply_url: job.applyUrl,
    posted_date: job.postedDate.toISOString(),
    valid_through: job.validThrough?.toISOString() ?? null,
    job_identifier: job.jobIdentifier,
    job_source_name: null,
    status: job.status === ACTIVE_JOB_STATUS ? 'active' : 'inactive',
    career_level: job.careerLevels.map(
      ({ level }) => PUBLIC_CAREER_LEVELS[level]
    ),
    visa_sponsorship: PUBLIC_VISA_STATUSES[job.visaSponsorship],
    featured: job.featured,
    workplace_type: PUBLIC_WORKPLACE_TYPES[job.workplaceType],
    remote_region: toRemoteRegion(job.remoteRegion),
    timezone_requirements: job.timezoneRequirements,
    workplace_city: job.workplaceCity,
    workplace_country: job.workplaceCountry,
    languages: job.languages.flatMap(({ language }) => {
      const languageCode = toLanguageCode(language);
      return languageCode ? [languageCode] : [];
    }),
    skills: job.skills,
    qualifications: job.qualifications,
    education_requirements: job.educationRequirements,
    experience_requirements: job.experienceRequirements,
    industry: job.industry,
    occupational_category: job.occupationalCategory,
    responsibilities: job.responsibilities,
  };
}

export const getJobs = cache(
  async (filters: JobFilters = {}): Promise<PaginatedJobs> => {
    const page = parsePositiveInteger(filters.page, DEFAULT_PAGE);
    const perPage = normalizePerPage(filters.perPage);
    const where = buildWhere(filters);
    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        include: JOB_INCLUDE,
        orderBy: buildOrderBy(filters.sort),
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.job.count({ where }),
    ]);

    return {
      jobs: jobs.map(toPublicJob),
      total,
      pages: Math.ceil(total / perPage),
      page,
      perPage,
    };
  }
);

export const getJobBySlug = cache(
  async (slug: string): Promise<PublicJob | null> => {
    const job = await prisma.job.findFirst({
      where: {
        slug,
        status: ACTIVE_JOB_STATUS,
      },
      include: JOB_INCLUDE,
    });

    return job ? toPublicJob(job) : null;
  }
);

export const getSimilarJobs = cache(
  async (jobId: string, limit = SIMILAR_JOBS_LIMIT): Promise<PublicJob[]> => {
    const sourceJob = await prisma.job.findFirst({
      where: {
        id: jobId,
        status: ACTIVE_JOB_STATUS,
      },
      include: {
        careerLevels: {
          select: {
            level: true,
          },
        },
        languages: {
          select: {
            language: true,
          },
        },
      },
    });

    if (!sourceJob) {
      return [];
    }

    const levels = sourceJob.careerLevels.map(({ level }) => level);
    const languages = sourceJob.languages.map(({ language }) => language);

    const similarJobs = await prisma.job.findMany({
      where: {
        id: {
          not: sourceJob.id,
        },
        status: ACTIVE_JOB_STATUS,
        OR: [
          { type: sourceJob.type },
          { workplaceType: sourceJob.workplaceType },
          {
            careerLevels: {
              some: {
                level: {
                  in: levels,
                },
              },
            },
          },
          {
            languages: {
              some: {
                language: {
                  in: languages,
                },
              },
            },
          },
        ],
      },
      include: JOB_INCLUDE,
      orderBy: [{ featured: 'desc' }, { postedDate: 'desc' }],
      take: limit,
    });

    return similarJobs.map(toPublicJob);
  }
);

export const getJobStats = cache(async (): Promise<JobStats> => {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [total, active, featured, companies, addedToday] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { status: ACTIVE_JOB_STATUS } }),
    prisma.job.count({
      where: {
        featured: true,
        status: ACTIVE_JOB_STATUS,
      },
    }),
    prisma.company.count(),
    prisma.job.count({
      where: {
        postedDate: {
          gte: startOfToday,
        },
        status: ACTIVE_JOB_STATUS,
      },
    }),
  ]);

  return {
    total,
    active,
    featured,
    companies,
    addedToday,
  };
});
