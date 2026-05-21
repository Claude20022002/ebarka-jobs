import { z } from 'zod';

export const JOB_TYPES = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'FREELANCE',
  'INTERNSHIP',
] as const;

export const SALARY_UNITS = [
  'HOUR',
  'DAY',
  'WEEK',
  'MONTH',
  'YEAR',
  'PROJECT',
] as const;

export const WORKPLACE_TYPES = [
  'ON_SITE',
  'HYBRID',
  'REMOTE',
  'NOT_SPECIFIED',
] as const;

export const VISA_STATUSES = ['YES', 'NO', 'NOT_SPECIFIED'] as const;

export const CAREER_LEVELS = [
  'INTERNSHIP',
  'ENTRY_LEVEL',
  'ASSOCIATE',
  'JUNIOR',
  'MID_LEVEL',
  'SENIOR',
  'STAFF',
  'PRINCIPAL',
  'LEAD',
  'MANAGER',
  'SENIOR_MANAGER',
  'DIRECTOR',
  'SENIOR_DIRECTOR',
  'VP',
  'SVP',
  'EVP',
  'C_LEVEL',
  'NOT_SPECIFIED',
] as const;

export const MUTABLE_JOB_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING'] as const;

const TITLE_MIN = 5;
const TITLE_MAX = 200;
const DESCRIPTION_MIN = 50;
const DESCRIPTION_MAX = 10_000;
const TEXT_FIELD_MAX = 2_000;
const LOCATION_MAX = 100;
const CURRENCY_LENGTH = 3;
const LANGUAGE_CODE_MIN = 2;
const LANGUAGE_CODE_MAX = 5;
const SEARCH_MAX = 200;
const PER_PAGE_MAX = 100;

const SalarySchema = z.coerce.number().positive();

const optionalText = (max: number) =>
  z.string().max(max).trim().optional();

export const CreateJobSchema = z
  .object({
    title: z.string().min(TITLE_MIN).max(TITLE_MAX).trim(),
    type: z.enum(JOB_TYPES),
    description: z.string().min(DESCRIPTION_MIN).max(DESCRIPTION_MAX).trim(),
    salaryMin: SalarySchema.optional(),
    salaryMax: SalarySchema.optional(),
    salaryCurrency: z
      .string()
      .length(CURRENCY_LENGTH)
      .transform((s) => s.toUpperCase())
      .default('EUR'),
    salaryUnit: z.enum(SALARY_UNITS).optional(),
    benefits: optionalText(TEXT_FIELD_MAX),
    applicationRequirements: optionalText(TEXT_FIELD_MAX),
    skills: optionalText(TEXT_FIELD_MAX),
    qualifications: optionalText(TEXT_FIELD_MAX),
    educationRequirements: optionalText(TEXT_FIELD_MAX),
    experienceRequirements: optionalText(TEXT_FIELD_MAX),
    responsibilities: optionalText(TEXT_FIELD_MAX),
    applyUrl: z.string().url().optional(),
    applyInApp: z.boolean().default(false),
    workplaceType: z.enum(WORKPLACE_TYPES).default('NOT_SPECIFIED'),
    remoteRegion: optionalText(LOCATION_MAX),
    timezoneRequirements: optionalText(LOCATION_MAX),
    workplaceCity: optionalText(LOCATION_MAX),
    workplaceCountry: optionalText(LOCATION_MAX),
    visaSponsorship: z.enum(VISA_STATUSES).default('NOT_SPECIFIED'),
    careerLevels: z
      .array(z.enum(CAREER_LEVELS))
      .min(1)
      .default(['NOT_SPECIFIED']),
    languages: z
      .array(
        z
          .string()
          .min(LANGUAGE_CODE_MIN)
          .max(LANGUAGE_CODE_MAX)
          .transform((s) => s.toLowerCase())
      )
      .default([]),
    validThrough: z.string().datetime({ offset: true }).optional(),
    occupationalCategory: optionalText(LOCATION_MAX),
    industry: optionalText(LOCATION_MAX),
  })
  .refine((data) => data.applyUrl !== undefined || data.applyInApp, {
    message: 'Provide either applyUrl or set applyInApp to true.',
    path: ['applyUrl'],
  })
  .refine(
    (data) =>
      data.salaryMin === undefined ||
      data.salaryMax === undefined ||
      data.salaryMin <= data.salaryMax,
    {
      message: 'salaryMin must be less than or equal to salaryMax.',
      path: ['salaryMin'],
    }
  );

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

export const UpdateJobSchema = z
  .object({
    title: z.string().min(TITLE_MIN).max(TITLE_MAX).trim().optional(),
    type: z.enum(JOB_TYPES).optional(),
    description: z
      .string()
      .min(DESCRIPTION_MIN)
      .max(DESCRIPTION_MAX)
      .trim()
      .optional(),
    salaryMin: SalarySchema.optional(),
    salaryMax: SalarySchema.optional(),
    salaryCurrency: z
      .string()
      .length(CURRENCY_LENGTH)
      .transform((s) => s.toUpperCase())
      .optional(),
    salaryUnit: z.enum(SALARY_UNITS).optional(),
    benefits: optionalText(TEXT_FIELD_MAX),
    applicationRequirements: optionalText(TEXT_FIELD_MAX),
    skills: optionalText(TEXT_FIELD_MAX),
    qualifications: optionalText(TEXT_FIELD_MAX),
    educationRequirements: optionalText(TEXT_FIELD_MAX),
    experienceRequirements: optionalText(TEXT_FIELD_MAX),
    responsibilities: optionalText(TEXT_FIELD_MAX),
    applyUrl: z.string().url().optional(),
    applyInApp: z.boolean().optional(),
    workplaceType: z.enum(WORKPLACE_TYPES).optional(),
    remoteRegion: optionalText(LOCATION_MAX),
    timezoneRequirements: optionalText(LOCATION_MAX),
    workplaceCity: optionalText(LOCATION_MAX),
    workplaceCountry: optionalText(LOCATION_MAX),
    visaSponsorship: z.enum(VISA_STATUSES).optional(),
    careerLevels: z.array(z.enum(CAREER_LEVELS)).min(1).optional(),
    languages: z
      .array(
        z
          .string()
          .min(LANGUAGE_CODE_MIN)
          .max(LANGUAGE_CODE_MAX)
          .transform((s) => s.toLowerCase())
      )
      .optional(),
    validThrough: z.string().datetime({ offset: true }).optional(),
    occupationalCategory: optionalText(LOCATION_MAX),
    industry: optionalText(LOCATION_MAX),
    status: z.enum(MUTABLE_JOB_STATUSES).optional(),
  })
  .refine(
    (data) =>
      data.salaryMin === undefined ||
      data.salaryMax === undefined ||
      data.salaryMin <= data.salaryMax,
    {
      message: 'salaryMin must be less than or equal to salaryMax.',
      path: ['salaryMin'],
    }
  );

export type UpdateJobInput = z.infer<typeof UpdateJobSchema>;

export const JobQuerySchema = z.object({
  q: z.string().max(SEARCH_MAX).trim().optional(),
  type: z.string().optional(),
  level: z.string().optional(),
  remote: z.enum(['true', 'false'] as const).optional(),
  visa: z.enum(['true', 'false'] as const).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(PER_PAGE_MAX).default(25),
  sort: z
    .enum(['newest', 'oldest', 'salary_desc'] as const)
    .default('newest'),
  featured: z.enum(['true', 'false'] as const).optional(),
});

export type JobQueryInput = z.infer<typeof JobQuerySchema>;
