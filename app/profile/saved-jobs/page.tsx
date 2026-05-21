import { format } from 'date-fns';
import { ArrowUpRight, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import type { SavedJobItem } from '@/lib/db/queries/profile';
import { getSavedJobs } from '@/lib/db/queries/profile';
import { UnsaveButton } from './_unsave-button';

// ── Constants ─────────────────────────────────────────────────────────────────

const DATE_FORMAT = 'd MMM yyyy';

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Temps plein',
  PART_TIME: 'Temps partiel',
  CONTRACT: 'CDD',
  FREELANCE: 'Freelance',
  INTERNSHIP: 'Stage',
};

const WORKPLACE_LABELS: Record<string, string> = {
  ON_SITE: 'Présentiel',
  HYBRID: 'Hybride',
  REMOTE: 'Télétravail',
  NOT_SPECIFIED: '',
};

// ── Sub-components ────────────────────────────────────────────────────────────

const savedJobCountLabel = (count: number): string => {
  if (count === 0) {
    return 'Aucune offre sauvegardée.';
  }
  if (count === 1) {
    return '1 offre sauvegardée';
  }
  return `${count} offres sauvegardées`;
};

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <Bookmark
        aria-hidden="true"
        className="mb-3 h-8 w-8 text-muted-foreground/40"
      />
      <p className="font-medium text-sm">Aucune offre sauvegardée</p>
      <p className="mt-1 text-muted-foreground text-sm">
        Les offres que vous sauvegardez apparaîtront ici.
      </p>
      <Link
        className="mt-4 text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
        href="/jobs"
      >
        Parcourir les offres
      </Link>
    </div>
  );
}

type SavedJobRowProps = {
  savedJob: SavedJobItem;
};

function SavedJobRow({ savedJob }: SavedJobRowProps) {
  const { job } = savedJob;
  const typeLabel = JOB_TYPE_LABELS[job.type] ?? job.type;
  const workplaceLabel = WORKPLACE_LABELS[job.workplaceType] ?? '';
  const location = [job.workplaceCity, job.workplaceCountry]
    .filter(Boolean)
    .join(', ');

  const isExpired = job.status !== 'ACTIVE';

  return (
    <li className="flex flex-col gap-3 border-b py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between">
      {/* Left: job info */}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="truncate font-medium text-sm underline-offset-4 hover:underline"
            href={`/jobs/${job.slug}`}
          >
            {job.title}
          </Link>
          {isExpired && (
            <span className="inline-flex shrink-0 items-center rounded bg-amber-50 px-2 py-0.5 font-medium text-amber-600 text-xs">
              Offre expirée
            </span>
          )}
        </div>

        <p className="text-muted-foreground text-xs">
          {job.company.name}
          {typeLabel && <span> · {typeLabel}</span>}
          {workplaceLabel && <span> · {workplaceLabel}</span>}
          {location && <span> · {location}</span>}
        </p>

        <p className="text-muted-foreground text-xs">
          Sauvegardé le {format(savedJob.createdAt, DATE_FORMAT)}
        </p>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        {!isExpired && (
          <Link
            aria-label={`Voir l'offre ${job.title}`}
            className="inline-flex items-center gap-1 text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
            href={`/jobs/${job.slug}`}
          >
            Voir l&apos;offre
            <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
          </Link>
        )}
        <UnsaveButton savedJobId={savedJob.id} />
      </div>
    </li>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SavedJobsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/auth/login');
  }

  const savedJobs = await getSavedJobs(session.id);
  const total = savedJobs.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-xl tracking-tight">
          Offres sauvegardées
        </h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {savedJobCountLabel(total)}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState />
      ) : (
        <ul aria-label="Offres sauvegardées">
          {savedJobs.map((savedJob) => (
            <SavedJobRow key={savedJob.id} savedJob={savedJob} />
          ))}
        </ul>
      )}
    </div>
  );
}
