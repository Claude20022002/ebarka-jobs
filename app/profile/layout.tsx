import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getProfileCounts } from '@/lib/db/queries/profile';
import { ProfileNav } from './_nav';

type ProfileLayoutProps = {
  children: ReactNode;
};

export default async function ProfileLayout({ children }: ProfileLayoutProps) {
  const user = await getSession();
  if (!user) {
    redirect('/auth/login');
  }

  const counts = await getProfileCounts(user.id);

  const navItems = [
    { href: '/profile', label: 'Mon profil' },
    { href: '/profile/applications', label: 'Candidatures', count: counts.applications },
    { href: '/profile/saved-jobs', label: 'Offres sauvegardées', count: counts.savedJobs },
    { href: '/profile/documents', label: 'Documents', count: counts.documents },
  ] as const;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-8 md:flex-row md:gap-10">
        <aside className="w-full shrink-0 md:w-52 lg:w-60">
          <ProfileNav
            items={navItems}
            userName={user.email ?? 'Mon compte'}
          />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
