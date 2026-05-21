import 'server-only';
import type { UserRole } from '@prisma/client';
import { auth } from './utils';

export type SessionUser = {
  id: string;
  email: string | null | undefined;
  role: UserRole;
  companyId: string | null;
};

export const getSession = async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return {
    id: session.user.id,
    email: session.user.email,
    role: session.user.role,
    companyId: session.user.companyId,
  };
};

export const hasRole = (user: SessionUser, ...roles: UserRole[]): boolean =>
  roles.includes(user.role);

export const isOwnerOrAdmin = (
  user: SessionUser,
  ownerCompanyId: string | null
): boolean =>
  user.role === 'ADMIN' ||
  (user.companyId !== null && user.companyId === ownerCompanyId);
