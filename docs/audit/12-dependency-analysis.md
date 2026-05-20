# Analyse des Dépendances — Stack cible

## Vue d'ensemble

```
Package manager : Bun 1.x
TypeScript      : v5.x (strict)
Next.js         : v15 (App Router) — voir note version
React           : v19
```

> **Note version Next.js :** La spec indique v14 mais le codebase actuel tourne sur v15.5. Next.js 15 est supérieur (React 19, Turbopack stable, meilleures perfs). Recommandation : rester sur v15 sauf contrainte explicite.

---

## Dépendances de production — Stack cible complète

### Framework & Runtime

| Package | Version | Rôle | Statut |
|---------|---------|------|--------|
| `next` | ^15.x | Framework principal | Conserver |
| `react` | ^19.x | UI runtime | Conserver |
| `react-dom` | ^19.x | DOM renderer | Conserver |

---

### Base de données

| Package | Version | Rôle | Action |
|---------|---------|------|--------|
| `@prisma/client` | ^5.x | Client ORM typé | Ajouter |
| `prisma` | ^5.x | CLI migrations | Ajouter (dev) |
| `airtable` | ^0.12.2 | SDK Airtable | Supprimer après migration |

```bash
bun add @prisma/client
bun add -D prisma
```

---

### Authentification

| Package | Version | Rôle | Action |
|---------|---------|------|--------|
| `next-auth` | ^5.x (beta) | Auth sessions JWT | Ajouter |
| `@auth/prisma-adapter` | ^1.x | Adapter BDD Prisma | Ajouter |

```bash
bun add next-auth@beta @auth/prisma-adapter
```

---

### Intelligence Artificielle

| Package | Version | Rôle | Action |
|---------|---------|------|--------|
| `@anthropic-ai/sdk` | ^0.x | Claude API (CV, LM) | Ajouter |

```bash
bun add @anthropic-ai/sdk
```

Variables d'env :
```bash
ANTHROPIC_API_KEY=sk-ant-xxxx
```

Usage pattern :
```typescript
// lib/ai/claude.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateCoverLetter(cvText: string, jobDescription: string) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Génère une lettre de motivation professionnelle basée sur ce CV et cette offre d'emploi.
        
CV : ${cvText}
Offre : ${jobDescription}`,
      },
    ],
  });
  return message.content[0].type === 'text' ? message.content[0].text : '';
}
```

---

### Upload de fichiers

| Package | Version | Rôle | Action |
|---------|---------|------|--------|
| `cloudinary` | ^2.x | SDK upload/transformation | Ajouter |
| `next-cloudinary` | ^6.x | Composants Next.js | Ajouter |

```bash
bun add cloudinary next-cloudinary
```

Variables d'env :
```bash
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=xxx
```

---

### Emails

| Package | Version | Rôle | Action |
|---------|---------|------|--------|
| `resend` | ^3.x | Service d'envoi email | Ajouter |
| `@react-email/components` | ^0.x | Composants templates | Ajouter |
| `react-email` | ^3.x | Preview CLI | Ajouter (dev) |
| `axios` | ^1.x | HTTP client Encharge | Supprimer |

```bash
bun add resend @react-email/components
bun add -D react-email
```

Variables d'env :
```bash
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@ebarka-jobs.com
```

Usage :
```typescript
// lib/email/resend.ts
import { Resend } from 'resend';
import { JobAlertEmail } from '@/emails/job-alert';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendJobAlert(to: string, jobs: Job[]) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: 'Nouvelles offres pour vous',
    react: JobAlertEmail({ jobs }),
  });
}
```

---

### Paiements (futur — Phase 2)

| Package | Version | Rôle | Action |
|---------|---------|------|--------|
| `stripe` | ^16.x | Paiements + webhooks | Ajouter Phase 2 |
| `@stripe/stripe-js` | ^4.x | Client-side Stripe | Ajouter Phase 2 |

```bash
bun add stripe @stripe/stripe-js
```

Variables d'env :
```bash
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
```

---

### Monitoring

| Package | Version | Rôle | Action |
|---------|---------|------|--------|
| `@sentry/nextjs` | ^8.x | Error tracking + traces | Ajouter |

```bash
bun add @sentry/nextjs
bunx @sentry/wizard@latest -i nextjs  # Setup automatique
```

Variables d'env :
```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ORG=ebarka
SENTRY_PROJECT=ebarka-jobs
```

Vercel Analytics est activé dans le dashboard Vercel — pas de package requis.

---

### Rate Limiting

| Package | Version | Rôle | Action |
|---------|---------|------|--------|
| `@upstash/ratelimit` | ^2.x | Rate limiting distribué | Ajouter |
| `@upstash/redis` | ^1.x | Redis serverless | Ajouter |

```bash
bun add @upstash/ratelimit @upstash/redis
```

Variables d'env :
```bash
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

---

### Validation

| Package | Version | Rôle | Action |
|---------|---------|------|--------|
| `zod` | ^3.x | Validation schéma TypeScript | Ajouter |

```bash
bun add zod
```

---

### UI & Design System (conserver)

| Package | Statut |
|---------|--------|
| `@radix-ui/react-*` | Conserver tout |
| `class-variance-authority` | Conserver |
| `clsx` + `tailwind-merge` | Conserver |
| `lucide-react` | Conserver |
| `tailwindcss-animate` | Conserver |
| `nuqs` | Conserver |

---

### Fonts (migration)

| Package | Action |
|---------|--------|
| `@fontsource/inter` | Supprimer → `next/font/google` |
| `@fontsource/ibm-plex-serif` | Supprimer → `next/font/google` |
| `geist` | Conserver (compatible `next/font`) |

---

### Packages à supprimer

| Package | Raison |
|---------|--------|
| `airtable` | Remplacé par Prisma + PostgreSQL |
| `axios` | Remplacé par `fetch` natif + Resend SDK |
| `node-fetch` | Inutile — `fetch` global natif dans Next.js 15 |
| `dotenv` | Inutile — Next.js charge `.env` automatiquement |
| `@fontsource/inter` | Remplacé par `next/font/google` |
| `@fontsource/ibm-plex-serif` | Remplacé par `next/font/google` |

```bash
bun remove airtable axios node-fetch dotenv @fontsource/inter @fontsource/ibm-plex-serif
```

---

### Tests

| Package | Rôle | Action |
|---------|------|--------|
| `vitest` | Test runner | Ajouter |
| `@vitejs/plugin-react` | Plugin React | Ajouter |
| `@testing-library/react` | Tests composants | Ajouter |
| `@testing-library/user-event` | Simulations user | Ajouter |
| `jsdom` | DOM virtuel | Ajouter |
| `@playwright/test` | Tests e2e | Ajouter (Phase 2) |

```bash
bun add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom
```

---

## Tableau récapitulatif des actions

| Action | Packages | Priorité |
|--------|---------|---------|
| Ajouter BDD | `@prisma/client`, `prisma` | P0 |
| Ajouter Auth | `next-auth`, `@auth/prisma-adapter` | P0 |
| Ajouter Email | `resend`, `@react-email/components` | P0 |
| Ajouter IA | `@anthropic-ai/sdk` | P0 |
| Ajouter Upload | `cloudinary`, `next-cloudinary` | P0 |
| Ajouter Monitoring | `@sentry/nextjs` | P1 |
| Ajouter Validation | `zod` | P1 |
| Ajouter Rate limit | `@upstash/ratelimit`, `@upstash/redis` | P1 |
| Supprimer obsolètes | `airtable`, `axios`, `node-fetch`, `dotenv` | P1 |
| Migrer fonts | Supprimer `@fontsource/*` | P2 |
| Ajouter Tests | `vitest`, `@testing-library/react` | P2 |
| Ajouter Paiements | `stripe` | P2 (Phase 2) |
| Automatiser updates | Dependabot / Renovate | P2 |

---

## `.env.local` complet cible

```bash
# === BASE DE DONNÉES ===
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# === AUTH (NextAuth.js v5) ===
NEXTAUTH_SECRET="random-32-char-string"
NEXTAUTH_URL="https://ebarka-jobs.com"
GOOGLE_CLIENT_ID="xxx.googleusercontent.com"
GOOGLE_CLIENT_SECRET="xxx"

# === IA ===
ANTHROPIC_API_KEY="sk-ant-xxx"

# === UPLOAD ===
CLOUDINARY_CLOUD_NAME="xxx"
CLOUDINARY_API_KEY="xxx"
CLOUDINARY_API_SECRET="xxx"
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="xxx"

# === EMAIL ===
RESEND_API_KEY="re_xxx"
EMAIL_FROM="noreply@ebarka-jobs.com"

# === RATE LIMITING ===
UPSTASH_REDIS_REST_URL="https://xxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxx"

# === MONITORING ===
SENTRY_DSN="https://xxx@sentry.io/xxx"

# === APP ===
NEXT_PUBLIC_APP_URL="https://ebarka-jobs.com"

# === PAIEMENTS (Phase 2) ===
STRIPE_SECRET_KEY="sk_live_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_live_xxx"
```
