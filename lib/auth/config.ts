import type { UserRole } from '@prisma/client';
import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend';

const DEFAULT_ROLE = 'CANDIDATE' satisfies UserRole;
const USER_ROLES = [
  'ADMIN',
  'EMPLOYER',
  'CANDIDATE',
] as const satisfies readonly UserRole[];

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.includes(value as UserRole);
}

function getCompanyId(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function createProviders(): NextAuthConfig['providers'] {
  const providers: NextAuthConfig['providers'] = [];
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;

  if (googleClientId && googleClientSecret) {
    providers.push(
      Google({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
      })
    );
  }

  if (resendApiKey && emailFrom) {
    providers.push(
      Resend({
        apiKey: resendApiKey,
        from: emailFrom,
      })
    );
  }

  return providers;
}

export const authConfig = {
  providers: createProviders(),
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
  trustHost: true,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.companyId = user.companyId ?? null;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.role = isUserRole(token.role) ? token.role : DEFAULT_ROLE;
        session.user.companyId = getCompanyId(token.companyId);
      }

      return session;
    },
  },
} satisfies NextAuthConfig;

export function getEnabledAuthProviders() {
  return {
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ),
    email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
  };
}
