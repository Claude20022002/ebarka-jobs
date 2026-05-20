# Analyse de la Base de Données — Stack cible : PostgreSQL + Prisma + Supabase

## Décision architecturale

**PostgreSQL via Supabase + Prisma ORM** remplace Airtable dès le lancement.

```
Supabase (PostgreSQL managé)
    ├── Backups automatiques
    ├── Row Level Security (RLS)
    ├── Realtime subscriptions
    └── Storage (complémentaire à Cloudinary)

Prisma ORM
    ├── Typage TypeScript fort (type-safe queries)
    ├── Migrations versionnées
    ├── Prisma Studio (UI BDD)
    └── Compatibilité Next.js App Router
```

---

## Schéma Prisma complet

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Supabase: connection pooling séparé
}

// ─── AUTH (NextAuth.js v5) ───────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?   // Cloudinary URL
  role          UserRole  @default(EMPLOYER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations NextAuth
  accounts      Account[]
  sessions      Session[]

  // Relations métier
  company       Company?  @relation(fields: [companyId], references: [id])
  companyId     String?
  savedJobs     SavedJob[]
  applications  Application[]
  documents     Document[]

  @@index([email])
  @@index([companyId])
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─── ENTREPRISES ─────────────────────────────────────────────────

model Company {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logo        String?  // Cloudinary URL
  website     String?
  description String?  @db.Text
  industry    String?
  size        CompanySize?
  location    String?
  verified    Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
  jobs        Job[]

  @@index([slug])
}

enum CompanySize {
  SOLO
  STARTUP      // 2-10
  SMALL        // 11-50
  MEDIUM       // 51-200
  LARGE        // 201-1000
  ENTERPRISE   // 1000+
}

// ─── OFFRES D'EMPLOI ─────────────────────────────────────────────

model Job {
  id                     String        @id @default(cuid())
  title                  String
  slug                   String        @unique
  type                   JobType
  status                 JobStatus     @default(PENDING)
  featured               Boolean       @default(false)

  // Salaire
  salaryMin              Float?
  salaryMax              Float?
  salaryCurrency         String        @default("EUR")
  salaryUnit             SalaryUnit?

  // Contenu
  description            String        @db.Text
  benefits               String?       @db.Text
  applicationRequirements String?      @db.Text
  skills                 String?       @db.Text
  qualifications         String?       @db.Text
  educationRequirements  String?       @db.Text
  experienceRequirements String?       @db.Text
  responsibilities       String?       @db.Text

  // Candidature
  applyUrl               String?       // Lien externe (optionnel)
  applyInApp             Boolean       @default(false) // Candidature in-app

  // Dates
  postedDate             DateTime      @default(now())
  validThrough           DateTime?
  createdAt              DateTime      @default(now())
  updatedAt              DateTime      @updatedAt

  // Localisation
  workplaceType          WorkplaceType @default(NOT_SPECIFIED)
  remoteRegion           String?
  timezoneRequirements   String?
  workplaceCity          String?
  workplaceCountry       String?

  // Metadata
  visaSponsorship        VisaStatus    @default(NOT_SPECIFIED)
  occupationalCategory   String?
  industry               String?
  jobIdentifier          String?

  // Relations
  company                Company       @relation(fields: [companyId], references: [id])
  companyId              String
  careerLevels           JobCareerLevel[]
  languages              JobLanguage[]
  applications           Application[]
  savedBy                SavedJob[]
  payment                Payment?

  // Analytics
  viewCount              Int           @default(0)
  clickCount             Int           @default(0) // Clics sur "Postuler"

  @@index([status, postedDate(sort: Desc)])
  @@index([companyId])
  @@index([workplaceType])
  @@index([featured, status])
  @@index([slug])
}

enum JobType {
  FULL_TIME
  PART_TIME
  CONTRACT
  FREELANCE
  INTERNSHIP
}

enum SalaryUnit {
  HOUR
  DAY
  WEEK
  MONTH
  YEAR
  PROJECT
}

enum JobStatus {
  PENDING      // En attente de paiement/modération
  ACTIVE       // Visible publiquement
  INACTIVE     // Désactivé par l'employeur
  EXPIRED      // Date validThrough dépassée
  REJECTED     // Refusé par la modération
}

enum WorkplaceType {
  ON_SITE
  HYBRID
  REMOTE
  NOT_SPECIFIED
}

enum VisaStatus {
  YES
  NO
  NOT_SPECIFIED
}

model JobCareerLevel {
  id      String      @id @default(cuid())
  jobId   String
  level   CareerLevel
  job     Job         @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([jobId, level])
  @@index([jobId])
}

enum CareerLevel {
  INTERNSHIP
  ENTRY_LEVEL
  ASSOCIATE
  JUNIOR
  MID_LEVEL
  SENIOR
  STAFF
  PRINCIPAL
  LEAD
  MANAGER
  SENIOR_MANAGER
  DIRECTOR
  SENIOR_DIRECTOR
  VP
  SVP
  EVP
  C_LEVEL
  NOT_SPECIFIED
}

model JobLanguage {
  id       String @id @default(cuid())
  jobId    String
  language String // ISO 639-1 code (ex: "fr", "en")
  job      Job    @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([jobId, language])
  @@index([jobId])
}

// ─── CANDIDATURES ────────────────────────────────────────────────

model Application {
  id          String            @id @default(cuid())
  status      ApplicationStatus @default(PENDING)
  coverLetter String?           @db.Text // Peut être généré par Claude
  message     String?           @db.Text
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  // Relations
  job         Job               @relation(fields: [jobId], references: [id])
  jobId       String
  user        User              @relation(fields: [userId], references: [id])
  userId      String
  documents   ApplicationDocument[]

  @@unique([jobId, userId]) // Un candidat ne peut postuler qu'une fois
  @@index([jobId])
  @@index([userId])
}

enum ApplicationStatus {
  PENDING
  REVIEWING
  INTERVIEW
  OFFER
  REJECTED
  WITHDRAWN
}

model ApplicationDocument {
  id            String      @id @default(cuid())
  applicationId String
  documentId    String
  type          DocType
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  document      Document    @relation(fields: [documentId], references: [id])

  @@index([applicationId])
}

// ─── DOCUMENTS (Cloudinary) ───────────────────────────────────────

model Document {
  id           String    @id @default(cuid())
  type         DocType
  name         String
  cloudinaryId String    // Public ID Cloudinary
  url          String    // URL Cloudinary
  size         Int?      // Bytes
  mimeType     String?
  aiGenerated  Boolean   @default(false) // Généré par Claude
  createdAt    DateTime  @default(now())

  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId       String
  applications ApplicationDocument[]

  @@index([userId])
}

enum DocType {
  CV
  COVER_LETTER
  PORTFOLIO
  CERTIFICATE
  OTHER
}

// ─── OFFRES SAUVEGARDÉES ──────────────────────────────────────────

model SavedJob {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  jobId     String

  @@unique([userId, jobId])
  @@index([userId])
}

// ─── PAIEMENTS (Stripe) ───────────────────────────────────────────

model Payment {
  id                String        @id @default(cuid())
  stripeSessionId   String        @unique
  stripePaymentId   String?
  amount            Int           // En centimes
  currency          String        @default("eur")
  status            PaymentStatus @default(PENDING)
  plan              JobPlan
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  job               Job           @relation(fields: [jobId], references: [id])
  jobId             String        @unique

  @@index([stripeSessionId])
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

enum JobPlan {
  STARTER    // Gratuit
  PRO        // ~29€
  BUSINESS   // ~99€
}

// ─── ALERTES EMAIL ────────────────────────────────────────────────

model JobAlert {
  id        String   @id @default(cuid())
  email     String
  name      String
  active    Boolean  @default(true)
  filters   Json?    // { types: [], levels: [], remote: bool, ... }
  createdAt DateTime @default(now())

  @@index([email])
}

// ─── GÉNÉRATION IA ────────────────────────────────────────────────

model AiGeneration {
  id          String       @id @default(cuid())
  type        AiGenType
  prompt      String       @db.Text
  result      String       @db.Text
  model       String       @default("claude-sonnet-4-6")
  tokens      Int?
  createdAt   DateTime     @default(now())

  user        User?        @relation(fields: [userId], references: [id], onDelete: SetNull)
  userId      String?
  document    Document?    @relation(fields: [documentId], references: [id])
  documentId  String?      @unique

  @@index([userId])
}

enum AiGenType {
  CV
  COVER_LETTER
  JOB_DESCRIPTION // Aide employeur à rédiger une offre
}
```

> Ajouter `AiGeneration` à `User` et `Document` :
> ```prisma
> // Dans model User
> aiGenerations AiGeneration[]
> // Dans model Document
> aiGeneration  AiGeneration?
> ```

---

## Configuration Supabase

### Variables d'environnement

```bash
# .env.local
# Supabase — Connection pooling (pour Prisma en serverless)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase — Connexion directe (pour les migrations Prisma)
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"
```

### `lib/db/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

---

## Row Level Security (RLS) Supabase

Activer le RLS pour protéger les données sensibles (applications, documents) :

```sql
-- Seul l'employeur propriétaire peut voir ses jobs
ALTER TABLE "Job" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_own_jobs" ON "Job"
  FOR ALL USING (
    "companyId" IN (
      SELECT id FROM "Company"
      WHERE id IN (SELECT "companyId" FROM "User" WHERE id = auth.uid())
    )
  );

-- Seul le candidat peut voir ses candidatures
ALTER TABLE "Application" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "applicant_own_applications" ON "Application"
  FOR ALL USING ("userId" = auth.uid());
```

---

## Commandes Prisma — Workflow

```bash
# Setup initial
bunx prisma init

# Après modification du schéma
bunx prisma migrate dev --name "add_ai_generation"

# Production
bunx prisma migrate deploy

# Visualiser les données
bunx prisma studio

# Synchroniser les types TypeScript
bunx prisma generate

# Seed données de test
bunx prisma db seed
```

---

## Couche d'accès données — Structure

```
lib/
├── db/
│   ├── prisma.ts           # Singleton PrismaClient
│   └── queries/
│       ├── jobs.ts         # getJobs(), getJob(), createJob()...
│       ├── companies.ts    # getCompany(), createCompany()...
│       ├── users.ts        # getUser(), updateUser()...
│       ├── applications.ts # getApplications(), createApplication()...
│       └── documents.ts    # getDocuments(), createDocument()...
```

### Exemple de query typée

```typescript
// lib/db/queries/jobs.ts
import { prisma } from '@/lib/db/prisma';
import type { Job, Prisma } from '@prisma/client';

export interface JobFilters {
  type?: string[];
  level?: CareerLevel[];
  remote?: boolean;
  search?: string;
  page?: number;
  perPage?: number;
}

export async function getJobs(filters: JobFilters = {}) {
  const { type, level, remote, search, page = 1, perPage = 25 } = filters;

  const where: Prisma.JobWhereInput = {
    status: 'ACTIVE',
    ...(type?.length && { type: { in: type as any } }),
    ...(remote && { workplaceType: 'REMOTE' }),
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' } },
        { company: { name: { contains: search, mode: 'insensitive' } } },
        { workplaceCity: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        company: { select: { name: true, logo: true, slug: true } },
        careerLevels: true,
        languages: true,
      },
      orderBy: [
        { featured: 'desc' },
        { postedDate: 'desc' },
      ],
      take: perPage,
      skip: (page - 1) * perPage,
    }),
    prisma.job.count({ where }),
  ]);

  return { jobs, total, pages: Math.ceil(total / perPage) };
}
```

---

## Migration depuis Airtable (si nécessaire)

```typescript
// scripts/migrate-from-airtable.ts
import { getJobs } from '@/lib/db/airtable.server';
import { prisma } from '@/lib/db/prisma';
import { slugify } from '@/lib/utils/slugify';

async function migrate() {
  const airtableJobs = await getJobs();

  for (const job of airtableJobs) {
    const company = await prisma.company.upsert({
      where: { slug: slugify(job.company) },
      create: { name: job.company, slug: slugify(job.company) },
      update: {},
    });

    await prisma.job.create({
      data: {
        title: job.title,
        slug: `${slugify(job.title)}-at-${slugify(job.company)}`,
        type: mapJobType(job.type),
        status: 'ACTIVE',
        description: job.description,
        applyUrl: job.apply_url,
        postedDate: new Date(job.posted_date),
        companyId: company.id,
        salaryMin: job.salary?.min ?? undefined,
        salaryMax: job.salary?.max ?? undefined,
        salaryCurrency: job.salary?.currency ?? 'EUR',
        workplaceType: mapWorkplace(job.workplace_type),
        workplaceCity: job.workplace_city,
        workplaceCountry: job.workplace_country,
        careerLevels: {
          create: job.career_level.map((l) => ({ level: mapLevel(l) })),
        },
        languages: {
          create: job.languages.map((lang) => ({ language: lang })),
        },
      },
    });
  }

  console.log(`Migrated ${airtableJobs.length} jobs`);
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
```
