import { format } from 'date-fns';
import type { LucideIcon } from 'lucide-react';
import { Award, Briefcase, File, FileText } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import type { DocumentItem } from '@/lib/db/queries/profile';
import { getDocuments } from '@/lib/db/queries/profile';

// ── Constants ─────────────────────────────────────────────────────────────────

const DATE_FORMAT = 'd MMM yyyy';

type DocConfig = {
  label: string;
  icon: LucideIcon;
};

const DOC_TYPE_CONFIG: Record<string, DocConfig> = {
  CV: { label: 'CV', icon: FileText },
  COVER_LETTER: { label: 'Lettre de motivation', icon: FileText },
  PORTFOLIO: { label: 'Portfolio', icon: Briefcase },
  CERTIFICATE: { label: 'Certificat', icon: Award },
  OTHER: { label: 'Autre', icon: File },
};

const BYTES_PER_KB = 1024;
const BYTES_PER_MB = 1_048_576;

// ── Helpers ───────────────────────────────────────────────────────────────────

const docConfig = (type: string): DocConfig =>
  DOC_TYPE_CONFIG[type] ?? { label: type, icon: File };

const formatFileSize = (bytes: number | null | undefined): string => {
  if (!bytes) {
    return '';
  }
  if (bytes >= BYTES_PER_MB) {
    return `${(bytes / BYTES_PER_MB).toFixed(1)} Mo`;
  }
  return `${Math.round(bytes / BYTES_PER_KB)} Ko`;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
      <FileText
        aria-hidden="true"
        className="mb-3 h-8 w-8 text-muted-foreground/40"
      />
      <p className="font-medium text-sm">Aucun document</p>
      <p className="mt-1 max-w-xs text-muted-foreground text-sm">
        Vos CV et lettres de motivation importés apparaîtront ici.
      </p>
    </div>
  );
}

type DocumentRowProps = {
  document: DocumentItem;
};

function DocumentRow({ document }: DocumentRowProps) {
  const config = docConfig(document.type);
  const Icon = config.icon;
  const sizeLabel = formatFileSize(document.size);

  return (
    <li className="flex items-center gap-4 border-b py-3.5 last:border-0">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
        <Icon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-sm">{document.name}</p>
        <p className="text-muted-foreground text-xs">
          {config.label}
          {sizeLabel && <span> · {sizeLabel}</span>}
          <span> · {format(document.createdAt, DATE_FORMAT)}</span>
          {document.aiGenerated && (
            <span className="ml-1.5 rounded bg-violet-50 px-1.5 py-0.5 text-violet-600">
              IA
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

const documentCountLabel = (count: number): string => {
  if (count === 0) {
    return 'Aucun document importé.';
  }
  if (count === 1) {
    return '1 document';
  }
  return `${count} documents`;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function DocumentsPage() {
  const session = await getSession();
  if (!session) {
    redirect('/auth/login');
  }

  const documents = await getDocuments(session.id);
  const total = documents.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-semibold text-xl tracking-tight">Documents</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          {documentCountLabel(total)}
        </p>
      </div>

      {total === 0 ? (
        <EmptyState />
      ) : (
        <ul aria-label="Liste des documents">
          {documents.map((document) => (
            <DocumentRow document={document} key={document.id} />
          ))}
        </ul>
      )}
    </div>
  );
}
