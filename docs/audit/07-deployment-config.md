# Configuration de Déploiement — Stack cible : Vercel + Supabase

## Architecture d'hébergement

```
GitHub Repository
       │
       ▼ (push main)
Vercel CI/CD
       ├── bun install
       ├── bunx prisma generate
       ├── bun run build
       └── Deploy
             ├── Pages statiques → Vercel Edge Network (CDN mondial)
             ├── API Routes      → Serverless Functions (Node.js)
             ├── OG Routes       → Edge Functions
             └── Middleware      → Edge (auth guard)

Supabase (PostgreSQL managé)
       ├── Connection pooling (PgBouncer)
       ├── Backups automatiques quotidiens
       ├── Point-in-time recovery
       └── Realtime (optionnel)

Cloudinary
       └── CDN fichiers (CV PDF, images profils, logos)

Upstash Redis
       └── Rate limiting distribué (serverless-compatible)

Sentry
       └── Error tracking + performance monitoring

Vercel Analytics
       └── Core Web Vitals + page views
```

---

## `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "bunx prisma generate && bun run build",
  "installCommand": "bun install --frozen-lockfile",
  "framework": "nextjs",
  "regions": ["cdg1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store, max-age=0" }
      ]
    },
    {
      "source": "/(feed.xml|atom.xml|feed.json)",
      "headers": [
        { "key": "Cache-Control", "value": "public, s-maxage=300, stale-while-revalidate=60" }
      ]
    }
  ]
}
```

---

## `next.config.ts` — Configuration cible

```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Supprimer ignoreBuildErrors — les erreurs TypeScript doivent bloquer le build
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },

  compress: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
          },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  logging: {
    fetches: { fullUrl: process.env.NODE_ENV === 'development' },
  },
};

export default nextConfig;
```

---

## Variables d'environnement — Vercel Dashboard

### Production (à configurer dans Vercel)

```bash
# === BASE DE DONNÉES (Supabase) ===
DATABASE_URL="postgresql://postgres.[ref]:[pwd]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[pwd]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# === AUTH (NextAuth.js v5) ===
NEXTAUTH_SECRET="[openssl rand -base64 32]"
NEXTAUTH_URL="https://ebarka-jobs.com"
GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"

# === IA (Claude API) ===
ANTHROPIC_API_KEY="sk-ant-xxx"

# === UPLOAD (Cloudinary) ===
CLOUDINARY_CLOUD_NAME="ebarka"
CLOUDINARY_API_KEY="xxx"
CLOUDINARY_API_SECRET="xxx"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="ebarka"

# === EMAIL (Resend) ===
RESEND_API_KEY="re_xxx"
EMAIL_FROM="noreply@ebarka-jobs.com"

# === RATE LIMITING (Upstash Redis) ===
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"

# === MONITORING (Sentry) ===
SENTRY_DSN="https://xxx@sentry.io/xxx"
SENTRY_ORG="ebarka"
SENTRY_PROJECT="ebarka-jobs"
SENTRY_AUTH_TOKEN="xxx"

# === APP ===
NEXT_PUBLIC_APP_URL="https://ebarka-jobs.com"

# === PAIEMENTS (Stripe — Phase 2) ===
STRIPE_SECRET_KEY="sk_live_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_xxx"
```

### Preview / Staging

Vercel crée automatiquement des environnements preview pour chaque PR. Configurer un set de variables séparées (base de données Supabase staging, Stripe test mode, etc.).

---

## Scripts `package.json` — Complets

```json
{
  "scripts": {
    "dev": "bun --bun next dev --turbopack",
    "build": "bunx prisma generate && bun --bun next build",
    "start": "bun --bun next start",
    "lint": "bunx ultracite check",
    "format": "bunx ultracite format",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "db:generate": "bunx prisma generate",
    "db:migrate": "bunx prisma migrate dev",
    "db:migrate:prod": "bunx prisma migrate deploy",
    "db:push": "bunx prisma db push",
    "db:studio": "bunx prisma studio",
    "db:seed": "bun run prisma/seed.ts",
    "email:dev": "bunx react-email dev",
    "sentry:wizard": "bunx @sentry/wizard@latest -i nextjs"
  }
}
```

---

## Pipeline CI/CD GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Qualité du code
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run type-check

  test:
    name: Tests unitaires
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bun run test

  build:
    name: Build de production
    needs: [quality, test]
    runs-on: ubuntu-latest
    env:
      DATABASE_URL: ${{ secrets.DATABASE_URL }}
      NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
      NEXTAUTH_URL: "https://ebarka-jobs.com"
      NEXT_PUBLIC_APP_URL: "https://ebarka-jobs.com"
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: ${{ secrets.CLOUDINARY_CLOUD_NAME }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx prisma generate
      - run: bun run build

  migrate:
    name: Migration BDD (production uniquement)
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    env:
      DIRECT_URL: ${{ secrets.DIRECT_URL }}
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - run: bunx prisma migrate deploy
```

---

## Sentry — Configuration Next.js

```bash
# Setup automatique
bunx @sentry/wizard@latest -i nextjs
```

Fichiers générés automatiquement :
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `next.config.ts` modifié avec `withSentryConfig`

```typescript
// Exemple sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,         // 10% des transactions en prod
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,  // 100% des sessions avec erreur
  integrations: [
    Sentry.replayIntegration(),
  ],
});
```

---

## Supabase — Setup initial

```bash
# 1. Créer un projet sur supabase.com
# 2. Récupérer les URLs de connexion dans Settings > Database

# 3. Initialiser Prisma avec Supabase
bunx prisma migrate dev --name "init"

# 4. Activer le RLS pour les tables sensibles
# (via Supabase Dashboard > Table Editor > RLS)

# 5. Configurer les backups
# Supabase Pro : backups automatiques quotidiens (7 jours de rétention)
```

### `prisma/schema.prisma` — Connection Supabase

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooler (PgBouncer) - pour l'app
  directUrl = env("DIRECT_URL")        // Direct - pour les migrations
}
```

---

## Monitoring — Tableau de bord

| Outil | URL | Alertes configurées |
|-------|-----|---------------------|
| Sentry | sentry.io/ebarka/ebarka-jobs | Erreurs critiques, p95 > 3s |
| Vercel Analytics | vercel.com/dashboard | CLS > 0.1, LCP > 2.5s |
| Supabase Dashboard | supabase.com/dashboard | Connexions > 80%, stockage > 80% |
| Upstash Console | console.upstash.com | Rate limit hits > 100/h |

---

## Environnements

| Env | Branche | URL | BDD | Stripe |
|-----|---------|-----|-----|--------|
| Production | `main` | ebarka-jobs.com | Supabase prod | Live keys |
| Preview | PR branches | `xxx.vercel.app` | Supabase staging | Test keys |
| Local | — | localhost:3000 | Supabase local / Docker | Test keys |

### Supabase local (développement)

```bash
# Lancer PostgreSQL local via Supabase CLI
bunx supabase start

# Applique les migrations localement
bunx prisma migrate dev

# Reset la BDD locale
bunx supabase db reset
```
