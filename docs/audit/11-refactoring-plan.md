# Plan de Refactorisation — Stack cible validée

## Stack cible (décision finale)

| Couche | Technologie |
|--------|------------|
| Framework | Next.js 15 (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Base de données | PostgreSQL + Prisma (Supabase) |
| Auth | NextAuth.js v5 + JWT |
| IA | Claude API (Anthropic) |
| Upload | Cloudinary |
| Email | Resend + React Email |
| Hébergement | Vercel + Supabase |
| Monitoring | Sentry + Vercel Analytics |

---

## Roadmap en 4 phases

```
Phase 0 (1 sem)   Phase 1 (3-4 sem)   Phase 2 (4-6 sem)   Phase 3 (4-6 sem)
Stabilisation  →  Infrastructure    →  Fonctionnalités   →  Monétisation & IA
Sécurité          BDD + Auth           core candidat         Stripe + Claude
```

---

## Phase 0 — Stabilisation critique (1 semaine)

Ces corrections ne touchent pas à l'architecture et peuvent être faites immédiatement.

### 0.1 Supprimer `ignoreBuildErrors`

```typescript
// next.config.ts — SUPPRIMER ce bloc
typescript: {
  ignoreBuildErrors: true, // ← À supprimer maintenant
}
// Puis corriger les erreurs TypeScript révélées
```

### 0.2 Ajouter les security headers

```typescript
// next.config.ts — Ajouter dans headers()
{ key: 'X-Frame-Options', value: 'DENY' },
{ key: 'X-Content-Type-Options', value: 'nosniff' },
{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
{ key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
```

### 0.3 Masquer les erreurs internes de l'API

```typescript
// app/api/subscribe/route.ts
catch (error) {
  console.error('[subscribe]', error); // log interne seulement
  return NextResponse.json({ error: 'Une erreur est survenue.' }, { status: 500 });
}
```

### 0.4 Valider les URLs externes (`apply_url`)

```typescript
// lib/db/airtable.server.ts
function validateUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  try {
    const { protocol } = new URL(url);
    return ['http:', 'https:'].includes(protocol) ? url : null;
  } catch { return null; }
}
```

**Livrable Phase 0 :** Codebase stable, sans failles de sécurité évidentes.

---

## Phase 1 — Infrastructure (3-4 semaines)

### 1.1 Setup PostgreSQL + Prisma + Supabase

```bash
# Installer
bun add @prisma/client
bun add -D prisma

# Initialiser
bunx prisma init --datasource-provider postgresql

# Écrire le schéma (voir 03-database-analysis.md)
# Puis appliquer
bunx prisma migrate dev --name "init"
bunx prisma generate
```

**Fichiers à créer :**

```
lib/
├── db/
│   ├── prisma.ts              # Singleton PrismaClient
│   └── queries/
│       ├── jobs.ts
│       ├── companies.ts
│       ├── users.ts
│       ├── applications.ts
│       └── documents.ts
prisma/
├── schema.prisma              # Schéma complet (voir 03-database-analysis.md)
└── seed.ts                    # Données de test
```

### 1.2 Remplacer `lib/db/airtable.server.ts`

```typescript
// AVANT : lib/db/airtable.server.ts (à supprimer après migration)
// APRÈS : lib/db/queries/jobs.ts (Prisma)

export async function getJobs(filters: JobFilters = {}) {
  return prisma.job.findMany({
    where: { status: 'ACTIVE', ...buildWhereClause(filters) },
    include: { company: true, careerLevels: true, languages: true },
    orderBy: [{ featured: 'desc' }, { postedDate: 'desc' }],
    take: filters.perPage ?? 25,
    skip: ((filters.page ?? 1) - 1) * (filters.perPage ?? 25),
  });
}
```

**Avantage immédiat :** Filtrage SQL côté serveur — fin du problème de mémoire O(n).

### 1.3 Authentification NextAuth.js v5

```bash
bun add next-auth@beta @auth/prisma-adapter
```

**Fichiers à créer :**

```
lib/auth/
├── config.ts          # Providers (Google + Resend magic link)
└── utils.ts           # getServerSession() wrapper

app/
├── api/auth/
│   └── [...nextauth]/route.ts
├── auth/
│   ├── login/page.tsx
│   └── error/page.tsx
middleware.ts          # Auth guard pour /dashboard
```

### 1.4 Remplacement email : Encharge → Resend + React Email

```bash
bun add resend @react-email/components
bun add -D react-email
bun remove axios  # Plus nécessaire
```

**Fichiers à créer :**

```
lib/email/
├── resend.ts              # Client Resend singleton
└── index.ts               # API publique (sendJobAlert, sendWelcome...)

emails/
├── job-alert.tsx          # Template alerte emploi
├── welcome.tsx            # Email bienvenue
├── application-received.tsx
└── job-published.tsx
```

### 1.5 Setup Sentry

```bash
bunx @sentry/wizard@latest -i nextjs
```

### 1.6 Rate limiting Upstash Redis

```bash
bun add @upstash/ratelimit @upstash/redis
```

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '60 m'),
});
```

### 1.7 Validation Zod

```bash
bun add zod
```

Créer `lib/validations/` avec les schémas Zod pour chaque endpoint API.

### 1.8 Supprimer les dépendances obsolètes

```bash
bun remove airtable axios node-fetch dotenv @fontsource/inter @fontsource/ibm-plex-serif
```

**Livrable Phase 1 :** App connectée à PostgreSQL, authentification fonctionnelle, emails via Resend, monitoring actif.

---

## Phase 2 — Fonctionnalités core (4-6 semaines)

### 2.1 Dashboard Employeur

```
app/(dashboard)/
├── layout.tsx              # Layout protégé (auth guard)
├── dashboard/
│   ├── page.tsx            # Vue d'ensemble (stats)
│   ├── jobs/
│   │   ├── page.tsx        # Liste des offres de l'employeur
│   │   ├── new/page.tsx    # Formulaire création offre
│   │   └── [id]/
│   │       ├── edit/page.tsx
│   │       └── analytics/page.tsx
│   └── company/page.tsx    # Profil entreprise
```

### 2.2 Candidature in-app

```
app/(candidate)/
├── profile/page.tsx        # Profil candidat
├── saved-jobs/page.tsx     # Offres sauvegardées
├── applications/page.tsx   # Mes candidatures
└── documents/page.tsx      # Mes CV et lettres
```

### 2.3 Upload Cloudinary

```bash
bun add cloudinary next-cloudinary
```

```typescript
// app/api/v1/documents/upload/route.ts
// Voir 04-api-architecture.md pour l'implémentation complète
```

### 2.4 Pagination côté serveur

Remplacer le filtrage client-side de `HomePage.tsx` :

```typescript
// AVANT : filtrage en mémoire (client)
// APRÈS : paramètres URL → API → SQL → résultats paginés

// app/page.tsx (Server Component)
export default async function HomePage({ searchParams }) {
  const { jobs, total } = await getJobs({
    search: searchParams.q,
    type: searchParams.types?.split(','),
    page: Number(searchParams.page) || 1,
    perPage: Number(searchParams.per_page) || 25,
  });
  return <HomePage jobs={jobs} total={total} />;
}
```

**Livrable Phase 2 :** Dashboard employeur, profil candidat, upload fichiers, candidature in-app.

---

## Phase 3 — Monétisation & IA (4-6 semaines)

### 3.1 Génération IA avec Claude API

```bash
bun add @anthropic-ai/sdk
```

**Routes à créer :**

```
app/api/ai/
├── generate-cover-letter/route.ts   # Claude → lettre de motivation
└── generate-cv/route.ts             # Claude → structuration CV
```

**Composants à créer :**

```
app/(candidate)/documents/
├── generate/
│   ├── cover-letter/page.tsx   # Interface génération LM
│   └── cv/page.tsx             # Interface structuration CV
```

**Flux utilisateur :**

```
Candidat sélectionne une offre
    │
    ▼
Clique "Générer une lettre de motivation"
    │
    ▼
POST /api/ai/generate-cover-letter
    { jobId, cvText, language }
    │
    ▼
Claude API (claude-sonnet-4-6)
    Prompt : offre + CV + instructions
    │
    ▼
Lettre générée → affichée + éditée par le candidat
    │
    ▼
Sauvegardée comme Document (Cloudinary PDF)
    │
    ▼
Jointe à la candidature
```

### 3.2 Paiements Stripe

```bash
bun add stripe @stripe/stripe-js
```

**Routes à créer :**

```
app/api/
├── checkout/route.ts           # Création session Stripe
└── webhooks/stripe/route.ts    # Confirmation paiement
```

**Flux :**

```
Employeur soumet une offre
    │ (gratuit pour plan Starter)
    ▼
Stripe Checkout (/api/checkout)
    │
    ▼
Paiement confirmé (webhook)
    │
    ▼
Job.status = 'ACTIVE'
Email confirmation (Resend)
```

**Livrable Phase 3 :** Génération IA de CV et lettres de motivation, paiements Stripe, plans d'abonnement.

---

## Refactorisation structure de dossiers

### Structure actuelle → Structure cible

```
ACTUEL                          CIBLE
───────────────                 ───────────────────────────
components/
  home/                         components/
  jobs/                           ui/          (design system pur)
  contact/                        layout/      (nav, footer)
  job-alerts/                     shared/      (hero, pagination...)
  ui/ (mixte!)                    jobs/        (JobCard, JobFilters...)
                                  forms/       (JobAlertsForm...)
                                  dashboard/   (employer components)
                                  candidate/   (candidate components)
lib/
  db/airtable.server.ts   →     lib/
  db/airtable.ts                  db/
  email/providers/encharge          prisma.ts
  hooks/                            queries/
  utils/                        lib/
                                  auth/
                                  email/
                                  ai/           (Claude helpers)
                                  upload/       (Cloudinary helpers)
                                  validations/  (Zod schemas)
                                  hooks/
                                  utils/
app/
  api/subscribe/          →     app/
                                  api/
                                    v1/         (REST API versionnée)
                                    ai/         (Claude routes)
                                    webhooks/   (Stripe, Resend)
                                    auth/       (NextAuth)
                                  (dashboard)/  (route group auth)
                                  (candidate)/  (route group auth)
                                  (public)/     (route group public)
```

---

## Estimation totale

| Phase | Durée | Dev requis | Priorité |
|-------|-------|-----------|---------|
| Phase 0 — Stabilisation | 1 semaine | 1 | Immédiat |
| Phase 1 — Infrastructure | 3-4 semaines | 1-2 | Fondation |
| Phase 2 — Fonctionnalités | 4-6 semaines | 2 | Core product |
| Phase 3 — IA + Paiements | 4-6 semaines | 2 | Différenciation |
| **Total** | **3-4 mois** | **2** | — |

---

## Stratégie de déploiement sans interruption

```
Semaine 1   : Phase 0 (corrections sécurité — pas de downtime)
Semaine 2-3 : Phase 1 en branche feature/infrastructure
Semaine 4   : Shadow mode — Prisma + Airtable simultanément
              (vérification parité des données)
Semaine 5   : Basculement Prisma, Airtable en lecture seule 48h
Semaine 6   : Suppression Airtable, Phase 2 démarre
```
