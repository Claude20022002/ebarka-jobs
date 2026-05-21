import 'server-only';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

// ── Select shapes ──────────────────────────────────────────────────────────────

const PROFILE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const APPLICATION_SELECT = {
  id: true,
  status: true,
  createdAt: true,
  coverLetter: true,
  job: {
    select: {
      title: true,
      slug: true,
      type: true,
      workplaceType: true,
      workplaceCity: true,
      workplaceCountry: true,
      company: { select: { name: true, logo: true, slug: true } },
    },
  },
} satisfies Prisma.ApplicationSelect;

const SAVED_JOB_SELECT = {
  id: true,
  createdAt: true,
  job: {
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      workplaceType: true,
      workplaceCity: true,
      workplaceCountry: true,
      salaryMin: true,
      salaryMax: true,
      salaryCurrency: true,
      featured: true,
      status: true,
      company: { select: { name: true, logo: true, slug: true } },
    },
  },
} satisfies Prisma.SavedJobSelect;

const DOCUMENT_SELECT = {
  id: true,
  type: true,
  name: true,
  url: true,
  size: true,
  mimeType: true,
  aiGenerated: true,
  createdAt: true,
} satisfies Prisma.DocumentSelect;

// ── Exported payload types ─────────────────────────────────────────────────────

export type ProfileUser = Prisma.UserGetPayload<{
  select: typeof PROFILE_USER_SELECT;
}>;

export type ApplicationItem = Prisma.ApplicationGetPayload<{
  select: typeof APPLICATION_SELECT;
}>;

export type SavedJobItem = Prisma.SavedJobGetPayload<{
  select: typeof SAVED_JOB_SELECT;
}>;

export type DocumentItem = Prisma.DocumentGetPayload<{
  select: typeof DOCUMENT_SELECT;
}>;

// ── Query functions ────────────────────────────────────────────────────────────

export const getProfileUser = (userId: string): Promise<ProfileUser | null> =>
  prisma.user.findUnique({ where: { id: userId }, select: PROFILE_USER_SELECT });

export const getProfileCounts = async (userId: string) => {
  const [applications, savedJobs, documents] = await Promise.all([
    prisma.application.count({ where: { userId } }),
    prisma.savedJob.count({ where: { userId } }),
    prisma.document.count({ where: { userId } }),
  ]);
  return { applications, savedJobs, documents };
};

export const getApplications = (userId: string): Promise<ApplicationItem[]> =>
  prisma.application.findMany({
    where: { userId },
    select: APPLICATION_SELECT,
    orderBy: { createdAt: 'desc' },
  });

export const getSavedJobs = (userId: string): Promise<SavedJobItem[]> =>
  prisma.savedJob.findMany({
    where: { userId },
    select: SAVED_JOB_SELECT,
    orderBy: { createdAt: 'desc' },
  });

export const getDocuments = (userId: string): Promise<DocumentItem[]> =>
  prisma.document.findMany({
    where: { userId },
    select: DOCUMENT_SELECT,
    orderBy: { createdAt: 'desc' },
  });
