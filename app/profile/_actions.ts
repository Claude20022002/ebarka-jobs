'use server';

import { revalidatePath } from 'next/cache';
import { getSession, hasRole } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';

const MS_PER_HOUR = 3_600_000;
const WITHDRAW_WINDOW_HOURS = 24;
const TERMINAL_STATUSES = new Set(['REJECTED', 'WITHDRAWN', 'OFFER']);

export const withdrawApplication = async (applicationId: string): Promise<void> => {
  const user = await getSession();
  if (!(user && hasRole(user, 'CANDIDATE', 'ADMIN'))) {
    throw new Error('Authentification requise.');
  }

  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId: user.id },
    select: { createdAt: true, status: true },
  });

  if (!application) {
    throw new Error('Candidature introuvable.');
  }
  if (TERMINAL_STATUSES.has(application.status)) {
    throw new Error('Cette candidature ne peut plus être retirée.');
  }

  const hoursElapsed =
    (Date.now() - application.createdAt.getTime()) / MS_PER_HOUR;
  if (hoursElapsed > WITHDRAW_WINDOW_HOURS) {
    throw new Error('Le délai de retrait de 24 h est dépassé.');
  }

  await prisma.application.update({
    where: { id: applicationId },
    data: { status: 'WITHDRAWN' },
  });

  revalidatePath('/profile/applications');
};

export const unsaveJob = async (savedJobId: string): Promise<void> => {
  const user = await getSession();
  if (!(user && hasRole(user, 'CANDIDATE', 'ADMIN'))) {
    throw new Error('Authentification requise.');
  }

  await prisma.savedJob.deleteMany({
    where: { id: savedJobId, userId: user.id },
  });

  revalidatePath('/profile/saved-jobs');
};
