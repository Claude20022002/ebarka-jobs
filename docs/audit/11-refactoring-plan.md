# Plan de Refactorisation et Stratégie de Migration

## Vue d'ensemble de la roadmap

```
MAINTENANT          MOIS 1-2             MOIS 3-4            MOIS 5-6+
   │                   │                    │                    │
Phase 0            Phase 1              Phase 2              Phase 3
Stabilisation      Qualité de code      Migration BDD        Plateforme SaaS
   │                   │                    │                    │
- Supprimer        - Tests              - PostgreSQL         - Auth multi-tenant
  ignoreBuild      - Zod validation     - Prisma             - Dashboard employeur
  Errors           - Logger             - API server-side    - Stripe paiements
- Rate limit       - Refacto DRY        - Webhooks           - Analytics
  Redis            - Route groups                            - Job alerts avancées
- Security         - Fonts next/font
  headers
```

---

## Phase 0 — Stabilisation (< 1 semaine)

### 0.1 Supprimer `ignoreBuildErrors`

**Fichier :** [next.config.ts](../../next.config.ts)

```typescript
// AVANT
typescript: {
  ignoreBuildErrors: true,
}

// APRÈS — supprimer complètement ce bloc
// Puis corriger toutes les erreurs TypeScript révélées
```

**Effort :** 30min + temps de correction des erreurs (estimation : 2-4h)

### 0.2 Ajouter Security Headers

**Fichier :** [next.config.ts](../../next.config.ts)

```typescript
// Ajouter dans le bloc headers() existant
{
  source: '/:path*',
  headers: [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ],
},
```

**Effort :** 30min

### 0.3 Corriger l'exposition des erreurs dans l'API

**Fichier :** [app/api/subscribe/route.ts](../../app/api/subscribe/route.ts)

```typescript
// AVANT
return NextResponse.json({ error: errorMessage }, { status: 500 });

// APRÈS
console.error('[subscribe] Internal error:', error);
return NextResponse.json(
  { error: 'An error occurred. Please try again.' },
  { status: 500 }
);
```

**Effort :** 15min

### 0.4 Valider `apply_url`

**Fichier :** [lib/db/airtable.server.ts](../../lib/db/airtable.server.ts)

```typescript
function validateUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? url : null;
  } catch {
    return null;
  }
}

// Dans mapAirtableRecordToJob :
apply_url: validateUrl(fields.apply_url) ?? '#',
```

**Effort :** 1h

---

## Phase 1 — Qualité de code (1-4 semaines)

### 1.1 Migrer vers Redis pour le rate limiting

**Fichier :** [app/api/subscribe/route.ts](../../app/api/subscribe/route.ts)

```typescript
// Installation
// bun add @upstash/ratelimit @upstash/redis

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '60 m'),
  analytics: true,
  prefix: 'subscribe',
});

// Dans POST handler :
const { success, reset } = await ratelimit.limit(clientIp);
if (!success) {
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) },
    }
  );
}
```

**Variables d'env à ajouter :**
```bash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=xxx
```

**Effort :** 2 jours

### 1.2 Ajouter Zod pour la validation

```bash
bun add zod
```

**Fichier :** [app/api/subscribe/route.ts](../../app/api/subscribe/route.ts)

```typescript
import { z } from 'zod';

const SubscribeSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(320),
});

// Dans POST handler :
const body = await request.json();
const parsed = SubscribeSchema.safeParse(body);
if (!parsed.success) {
  return NextResponse.json(
    { error: parsed.error.errors[0].message },
    { status: 400 }
  );
}
const { name, email } = parsed.data;
```

**Effort :** 2h pour l'API, 1 semaine pour valider Airtable data

### 1.3 Refactoriser les fonctions dupliquées

**Fichier :** [lib/db/airtable.server.ts](../../lib/db/airtable.server.ts)

```typescript
// Remplacer normalizeBenefits + normalizeApplicationRequirements par :
function normalizeTextField(value: unknown, maxLength = 1000): string | null {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.length > maxLength ? text.substring(0, maxLength).trim() : text;
}

// Extraire le mapping de record vers Job
function mapRecordToJob(record: Airtable.Record<Airtable.FieldSet>): Job {
  const fields = record.fields;
  return {
    id: record.id,
    title: fields.title as string,
    // ... tout le mapping
  };
}
```

**Effort :** 2h

### 1.4 Migrer les fonts vers `next/font`

**Fichier :** [app/layout.tsx](../../app/layout.tsx)

```typescript
// Supprimer les imports @fontsource dans package.json et layout.tsx
// Ajouter :
import { Inter, IBM_Plex_Serif } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ibm-plex-serif',
  display: 'optional',
});
```

**Effort :** 2h

### 1.5 Supprimer les dépendances inutiles

```bash
# Supprimer
bun remove node-fetch dotenv

# Vérifier si axios peut être remplacé par fetch natif dans encharge.ts
```

**Effort :** 1h

### 1.6 Configurer les tests

```bash
bun add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

**Tests à écrire en priorité :**
```
tests/
├── unit/
│   ├── lib/
│   │   ├── utils/filter-jobs.test.ts
│   │   ├── utils/slugify.test.ts
│   │   ├── utils/salary.test.ts
│   │   └── db/normalizers.test.ts
│   └── api/
│       └── subscribe.test.ts
└── integration/
    └── airtable.test.ts
```

**Effort :** 1 semaine pour coverage de base

### 1.7 Réorganiser la structure des dossiers

```
components/
├── ui/           # Design system pur (primitives)
│   ├── button.tsx
│   ├── input.tsx
│   ├── badge.tsx
│   ├── card.tsx
│   ├── accordion.tsx
│   ├── select.tsx
│   ├── switch.tsx
│   ├── checkbox.tsx
│   ├── label.tsx
│   ├── avatar.tsx
│   ├── dropdown-menu.tsx
│   └── toast/
├── layout/       # Nav, Footer (extraction depuis ui/)
│   ├── nav.tsx
│   └── footer.tsx
├── shared/       # Composants partagés avec logique légère
│   ├── hero-section.tsx
│   ├── pagination.tsx
│   ├── breadcrumb.tsx  (consolidation des 3)
│   ├── collapsible-text.tsx
│   └── post-job-banner.tsx
├── jobs/         # Composants domaine emploi
│   ├── JobCard.tsx
│   ├── JobCardList.tsx
│   ├── JobFilters.tsx
│   ├── JobSearch.tsx
│   └── JobDetailsSidebar.tsx
├── home/
│   └── HomePage.tsx
└── forms/
    └── JobAlertsForm.tsx
```

**Effort :** 3 jours

---

## Phase 2 — Migration Base de Données (1-3 mois)

### 2.1 Setup PostgreSQL + Prisma

```bash
# Installation
bun add prisma @prisma/client
bun add -D prisma

# Initialisation
bunx prisma init --datasource-provider postgresql
```

**Provider recommandé :** Neon (serverless PostgreSQL) ou Supabase

```bash
# Variable d'env
DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
```

### 2.2 Écriture du schéma Prisma

Voir le schéma complet dans [03-database-analysis.md](./03-database-analysis.md).

**Effort :** 2 jours

### 2.3 Script de migration depuis Airtable

```typescript
// scripts/migrate-from-airtable.ts
import { getJobs } from '@/lib/db/airtable.server';
import { prisma } from '@/lib/db/prisma';

async function migrate() {
  console.log('Fetching jobs from Airtable...');
  const jobs = await getJobs();
  
  console.log(`Migrating ${jobs.length} jobs...`);
  
  for (const job of jobs) {
    // Créer ou trouver la company
    const company = await prisma.company.upsert({
      where: { name: job.company },
      create: { name: job.company, slug: slugify(job.company) },
      update: {},
    });
    
    // Créer le job
    await prisma.job.create({
      data: {
        externalId: job.id,
        title: job.title,
        slug: `${slugify(job.title)}-at-${slugify(job.company)}`,
        companyId: company.id,
        // ... tous les champs
      },
    });
  }
  
  console.log('Migration complete!');
}

migrate().catch(console.error);
```

**Effort :** 2 jours

### 2.4 Remplacement de `lib/db/airtable.server.ts`

```typescript
// lib/db/prisma.server.ts
import { prisma } from '@/lib/db/prisma';
import type { Job } from '@prisma/client';

export async function getJobs(filters?: {
  type?: string[];
  level?: string[];
  remote?: boolean;
  page?: number;
  perPage?: number;
}): Promise<{ jobs: Job[], total: number }> {
  const where = {
    status: 'ACTIVE' as const,
    ...(filters?.type && { type: { in: filters.type } }),
    ...(filters?.remote && { workplaceType: 'REMOTE' }),
  };
  
  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: { company: true },
      orderBy: { postedDate: 'desc' },
      take: filters?.perPage ?? 25,
      skip: ((filters?.page ?? 1) - 1) * (filters?.perPage ?? 25),
    }),
    prisma.job.count({ where }),
  ]);
  
  return { jobs, total };
}
```

**Effort :** 3 jours

---

## Phase 3 — Plateforme SaaS (3-6 mois)

### 3.1 Authentification (NextAuth v5)

```bash
bun add next-auth@beta @auth/prisma-adapter
```

**Modèle de données user/employer :**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  emailVerified DateTime?
  name          String?
  image         String?
  role          UserRole  @default(EMPLOYER)
  company       Company?  @relation(fields: [companyId], references: [id])
  companyId     String?
  sessions      Session[]
  accounts      Account[]
}

enum UserRole {
  ADMIN
  EMPLOYER
  MODERATOR
}
```

**Effort :** 1 semaine

### 3.2 Dashboard Employeur

```
/dashboard/
├── page.tsx              # Vue d'ensemble
├── jobs/
│   ├── page.tsx          # Liste des offres
│   ├── new/page.tsx      # Créer une offre
│   └── [id]/
│       ├── page.tsx      # Éditer une offre
│       └── analytics/    # Stats de l'offre
├── company/
│   └── page.tsx          # Profil entreprise
└── billing/
    └── page.tsx          # Abonnement et paiements
```

**Effort :** 3-4 semaines

### 3.3 Stripe pour la monétisation

```bash
bun add stripe @stripe/stripe-js
```

**Plans suggérés :**
| Plan | Prix/mois | Nb d'offres | Durée affichage | Features |
|------|----------|-------------|-----------------|---------|
| Starter | Gratuit | 1 | 30 jours | — |
| Pro | 29€ | 5 | 60 jours | Featured, analytics |
| Business | 99€ | Illimité | 90 jours | Priorité, API, branding |

**Effort :** 2 semaines

---

## Estimation globale

| Phase | Durée | Développeur(s) |
|-------|-------|----------------|
| Phase 0 — Stabilisation | 1 semaine | 1 dev |
| Phase 1 — Qualité | 3-4 semaines | 1 dev |
| Phase 2 — Migration BDD | 6-8 semaines | 1-2 devs |
| Phase 3 — SaaS | 12-16 semaines | 2-3 devs |
| **Total** | **~6 mois** | **2 devs** |

---

## Stratégie de migration sans interruption de service

```
Semaine 1-2 : Stabilisation (hotfixes security)
Semaine 3-6 : Développement de la couche Prisma en parallèle
Semaine 7   : Shadow mode (Airtable + PostgreSQL simultanément)
Semaine 8   : Basculement vers PostgreSQL, Airtable en read-only 48h
Semaine 9   : Désactivation Airtable
```

---

## Priorisation par valeur business

| Action | Valeur business | Effort | Score (valeur/effort) |
|--------|----------------|--------|----------------------|
| Corriger ignoreBuildErrors | Prévention bugs prod | 1h | 10/10 |
| Security headers | Confiance utilisateurs | 30min | 10/10 |
| Redis rate limiting | Sécurité API | 2 jours | 9/10 |
| Zod validation | Robustesse | 3 jours | 8/10 |
| Tests unitaires | Confiance refacto | 1 sem | 8/10 |
| Migration PostgreSQL | Scalabilité | 6 sem | 7/10 |
| Auth + Dashboard | Nouveau revenu | 4 sem | 9/10 |
| Stripe | Monétisation | 2 sem | 9/10 |
