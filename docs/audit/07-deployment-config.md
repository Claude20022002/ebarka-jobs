# Configuration de Déploiement

## État actuel : Minimal / Non formalisé

Le projet **n'a pas** de configuration de déploiement explicite. Il se base sur des conventions Vercel implicites via le Edge Runtime utilisé dans les routes OG.

---

## Analyse des composants de déploiement

### Ce qui existe

| Fichier | Rôle | État |
|---------|------|------|
| `package.json` | Scripts de build/start | Présent, incomplet |
| `next.config.ts` | Config Next.js | Présent, problématique |
| `.env.example` | Template variables d'env | Présent, bien documenté |
| `bun.lock` | Lock file | Présent |
| `tsconfig.json` | Config TypeScript | Présent |
| `biome.jsonc` | Config linter/formatter | Présent |

### Ce qui manque

| Fichier | Rôle | Priorité |
|---------|------|----------|
| `vercel.json` | Config Vercel explicite | HAUTE |
| `Dockerfile` | Containerisation | MOYENNE |
| `.github/workflows/*.yml` | CI/CD GitHub Actions | HAUTE |
| `.env.production.example` | Vars prod spécifiques | MOYENNE |
| `scripts/migrate.ts` | Script de migration BDD | FUTURE |

---

## Scripts npm actuels

```json
{
  "scripts": {
    "dev": "TURBOPACK=1 bun --bun next dev --turbopack",
    "build": "bun --bun next build",
    "start": "bun --bun next start",
    "lint": "bunx ultracite check",
    "format": "bunx ultracite format"
  }
}
```

**Manquants :**
```json
{
  "scripts": {
    "test": "vitest",                           // Tests unitaires
    "test:e2e": "playwright test",              // Tests e2e
    "type-check": "tsc --noEmit",               // Vérification des types
    "build:analyze": "ANALYZE=true next build", // Bundle analyzer
    "db:generate": "prisma generate",           // (futur) Génération Prisma
    "db:push": "prisma db push",                // (futur) Migration BDD
    "db:seed": "bun scripts/seed.ts",           // (futur) Seed données
    "preview": "next build && next start"       // Preview local de prod
  }
}
```

---

## Variables d'environnement

### Actuelles (`.env.example`)

```bash
# === REQUIS ===
AIRTABLE_ACCESS_TOKEN=pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
NEXT_PUBLIC_APP_URL=https://your-domain.com

# === OPTIONNEL ===
AIRTABLE_TABLE_NAME=Jobs              # Défaut: "Jobs"
EMAIL_PROVIDER=encharge               # Défaut: "encharge"
ENCHARGE_WRITE_KEY=xxxxxxxxxxxx       # Si job alerts activé
```

### Recommandées pour la production

```bash
# === SÉCURITÉ ===
NEXTAUTH_SECRET=random-32-char-secret  # Si auth ajoutée
NEXTAUTH_URL=https://your-domain.com

# === PERFORMANCE ===
REDIS_URL=redis://...                  # Pour rate limiting distribué

# === MONITORING ===
SENTRY_DSN=https://xxx@sentry.io/xxx  # Error tracking
UMAMI_WEBSITE_ID=xxxx                  # Analytics (déjà dans config)

# === PAIEMENTS (futur) ===
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

---

## Architecture de déploiement recommandée

### Option A — Vercel (recommandé pour la vitesse)

```
GitHub Repository
    │
    ▼ (push to main)
Vercel CI/CD
    ├── Install (bun install)
    ├── Build (bun run build)
    ├── Static pages → CDN Edge Network (176+ PoPs)
    ├── API Routes → Serverless Functions (Node.js runtime)
    └── OG Routes → Edge Functions (Edge runtime)
```

**Configuration `vercel.json` recommandée :**
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "bun run build",
  "installCommand": "bun install",
  "framework": "nextjs",
  "regions": ["cdg1", "iad1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-store, max-age=0"
        }
      ]
    },
    {
      "source": "/(feed.xml|atom.xml|feed.json)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=300, stale-while-revalidate=60"
        }
      ]
    }
  ]
}
```

### Option B — Self-hosted (Docker)

```dockerfile
# Dockerfile recommandé (multi-stage build)
FROM oven/bun:1 AS base
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

# Runner
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["bun", "server.js"]
```

**Note :** Le mode standalone de Next.js doit être activé :
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone',
  // ...
};
```

### Option C — VPS avec PM2

```bash
# Déploiement simple sur VPS
pm2 start "bun run start" --name "ebarka-jobs" \
  --env production \
  --max-memory-restart 500M \
  --instances max \
  --exec-mode cluster
```

---

## Pipeline CI/CD recommandé (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run type-check  # À ajouter aux scripts
      
  build:
    name: Build
    needs: quality
    runs-on: ubuntu-latest
    env:
      AIRTABLE_ACCESS_TOKEN: ${{ secrets.AIRTABLE_ACCESS_TOKEN }}
      AIRTABLE_BASE_ID: ${{ secrets.AIRTABLE_BASE_ID }}
      NEXT_PUBLIC_APP_URL: https://ebarka-jobs.com
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run build
      
  deploy:
    name: Deploy to Vercel
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

## Analyse du `next.config.ts` actuel

```typescript
const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,  // ❌ SUPPRIMER IMMÉDIATEMENT
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',           // ✅ Bon pour SEO
            value: 'index, follow, ...',
          },
        ],
      },
      // ... règles par extension de fichier
    ];
  },
};
```

**Configuration enrichie recommandée :**
```typescript
const nextConfig: NextConfig = {
  // ✅ Supprimer ignoreBuildErrors
  
  output: 'standalone',  // Pour Docker
  
  // Optimisations images
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.airtableusercontent.com' },
    ],
  },
  
  // Compression
  compress: true,
  
  // Power Headers de sécurité
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=()' },
          { key: 'X-Robots-Tag', value: 'index, follow, max-image-preview:large' },
        ],
      },
    ];
  },
  
  // Logging
  logging: {
    fetches: { fullUrl: true },
  },
};
```

---

## Monitoring et observabilité (absents)

| Outil | Rôle | Priorité |
|-------|------|----------|
| Sentry | Error tracking | HAUTE |
| Umami/Plausible | Analytics (déjà dans config) | MOYENNE |
| Vercel Analytics | Core Web Vitals | MOYENNE |
| Uptime Robot | Monitoring uptime | HAUTE |
| Axiom/Datadog | Logs structurés | BASSE |

---

## Performance des builds

**Optimisations Turbopack déjà actives :**
```bash
TURBOPACK=1 bun --bun next dev --turbopack
```

**Analyse bundle recommandée :**
```bash
# Installer @next/bundle-analyzer
ANALYZE=true bun run build
# → Génère des rapports HTML du bundle côté client et serveur
```
