import { format } from 'date-fns';
import { ArrowUpRight, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import type { ApplicationItem } from '@/lib/db/queries/profile';
import { getApplications } from '@/lib/db/queries/profile';
import { cn } from '@/lib/utils';
import { WithdrawButton } from './_withdraw-button';

// ── Constants ─────────────────────────────────────────────────────────────────

const DATE_FORMAT = 'd MMM yyyy';
const MS_PER_HOUR = 3_600_000;
const WITHDRAW_WINDOW_HOURS = 24;
const TERMINAL_STATUSES = new Set(['REJECTED', 'WITHDRAWN', 'OFFER']);

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: 'En attente',
    className: 'bg-slate-100 text-slate-600',
  },
  REVIEWING: {
    label: 'En revue',
    className: 'bg-blue-50 text-blue-700',
  },
  INTERVIEW: {
    label: 'Entretien',
    className: 'bg-violet-50 text-violet-700',
  },
  OFFER: {
    label: 'Offre reçue',
    className: 'bg-emerald-50 text-emerald-700',
  },
  REJECTED: {
    label: 'Refusée',
    className: 'bg-red-50 text-red-600',
  },
  WITHDRAWN: {
    label: 'Retirée',
    className: 'bg-slate-50 text-slate-400',
  },
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Temps plein',
  PART_TIME: 'Temps partiel',
  CONTRACT: 'CDD',
  FREELANCE: 'Freelance',
  INTERNSHIP: 'Stage',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusConfig = (status: string) =>
  STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-slate-100 text-slate-600',
  };

const applicationCountLabel = (count: number): string => {
  if (count === 0) {
    return 'Aucune candidature pour le moment.';
  }
  if (count === 1) {
    return '1 candidature envoyée';
  }
  return `${count} candidatures envoyées`;
};

const canWithdraw = (application: ApplicationItem): boolean => {
  if (TERMINAL_STATUSES.has(application.status)) {
    return false;
  }
  const elapsed = (Date.now() - application.createdAt.getTime()) / MS_PER_HOUR;
  return elapsed < WITHDRAW_WINDOW_HOURS;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <Briefcase
        aria-hidden="true"
        className="mb-3 h-8 w-8 text-muted-foreground/40"
      />
      <p className="font-medium text-sm">Aucune candidature</p>
      <p className="mt-1 text-muted-foreground text-sm">
        Vos candidatures envoyées apparaîtront ici.
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

type ApplicationRowProps = {
  application: ApplicationItem;
};

function ApplicationRow({ application }: ApplicationRowProps) {
  const { job } = application;
  const status = statusConfig(application.status);
  const eligible = canWithdraw(application);
  const location = [job.workplaceCity, job.workplaceCountry]
    .filter(Boolean)
    .join(', ');
  const typeLabel = JOB_TYPE_LABELS[job.type] ?? job.type;

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
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded px-2 py-0.5 font-medium text-xs',
              status.className
            )}
          >
            {status.label}
          </span>
        </div>

        <p className="text-muted-foreground text-xs">
          {job.company.name}
          {typeLabel && <span> · {typeLabel}</span>}
          {location && <span> · {location}</span>}
        </p>

        <p className="text-muted-foreground text-xs">
          Postulé le {format(application.createdAt, DATE_FORMAT)}
        </p>
      </div>

      {/* Right: actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Link
          aria-label={`Voir l'offre ${job.title}`}
          className="inline-flex items-center gap-1 text-muted-foreground text-xs underline underline-offset-4 hover:text-foreground"
          href={`/jobs/${job.slug}`}
        >
          Voir l&apos;offre
          <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
        </Link>
        {eligible && <WithdrawButton applicationId={application.id} />}
      </div>
    </li>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ApplicationsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/auth/login');
  }

  const applications = await getApplications(session.id);
  const total = applications.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-xl tracking-tight">Candidatures</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {applicationCountLabel(total)}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState />
      ) : (
        <ul aria-label="Liste des candidatures">
          {applications.map((application) => (
            <ApplicationRow application={application} key={application.id} />
          ))}
        </ul>
      )}
    </div>
  );
}
