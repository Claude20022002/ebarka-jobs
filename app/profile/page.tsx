import { format } from 'date-fns';
import { Bookmark, Briefcase, FileText, User } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { getProfileCounts, getProfileUser } from '@/lib/db/queries/profile';

const STAT_DATE_FORMAT = 'd MMM yyyy';

type StatCardProps = {
  href: string;
  icon: React.ElementType;
  label: string;
  value: number;
};

function StatCard({ href, icon: Icon, label, value }: StatCardProps) {
  return (
    <Link
      className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-accent/30"
      href={href}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
      </span>
      <div>
        <p className="font-semibold text-2xl tabular-nums">{value}</p>
        <p className="text-muted-foreground text-sm">{label}</p>
      </div>
    </Link>
  );
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    redirect('/auth/login');
  }

  const [user, counts] = await Promise.all([
    getProfileUser(session.id),
    getProfileCounts(session.id),
  ]);

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-semibold text-xl tracking-tight">Mon profil</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Membre depuis le {format(user.createdAt, STAT_DATE_FORMAT)}
        </p>
      </div>

      {/* Profile card */}
      <div className="flex items-center gap-4 rounded-lg border bg-card p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted">
          <User aria-hidden="true" className="h-7 w-7 text-muted-foreground" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">
            {user.name ?? 'Nom non renseigné'}
          </p>
          <p className="truncate text-muted-foreground text-sm">
            {user.email ?? ''}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div>
        <h2 className="mb-3 font-medium text-muted-foreground text-sm uppercase tracking-wide">
          Activité
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            href="/profile/applications"
            icon={Briefcase}
            label={counts.applications === 1 ? 'Candidature' : 'Candidatures'}
            value={counts.applications}
          />
          <StatCard
            href="/profile/saved-jobs"
            icon={Bookmark}
            label={
              counts.savedJobs === 1
                ? 'Offre sauvegardée'
                : 'Offres sauvegardées'
            }
            value={counts.savedJobs}
          />
          <StatCard
            href="/profile/documents"
            icon={FileText}
            label={counts.documents === 1 ? 'Document' : 'Documents'}
            value={counts.documents}
          />
        </div>
      </div>
    </div>
  );
}
