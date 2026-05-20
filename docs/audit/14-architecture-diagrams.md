# Diagrammes d'Architecture — Stack cible

## 1. Architecture système complète

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           UTILISATEURS                                  │
├──────────────────┬─────────────────────┬────────────────────────────────┤
│  Visiteurs       │  Candidats          │  Employeurs / Admins           │
│  (anonymes)      │  (NextAuth session) │  (NextAuth session + role)     │
└────────┬─────────┴──────────┬──────────┴──────────────┬─────────────────┘
         │                    │                          │
         └────────────────────┼──────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               VERCEL — CDN EDGE + SERVERLESS                           │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  NEXT.JS 15 — APP ROUTER                                         │  │
│  │                                                                   │  │
│  │  Pages publiques (SSG/ISR)     Pages protégées (SSR + Auth)      │  │
│  │  ─────────────────────────     ──────────────────────────────    │  │
│  │  /                             /dashboard/* (employeur)          │  │
│  │  /jobs/[slug]                  /profile/* (candidat)             │  │
│  │  /jobs/type/[type]             /auth/login                       │  │
│  │  /about, /faq, /pricing        /auth/error                       │  │
│  │                                                                   │  │
│  │  API Routes (Serverless)       Edge Routes                        │  │
│  │  ────────────────────────      ─────────────                     │  │
│  │  /api/auth/[...nextauth]       /api/og/*                         │  │
│  │  /api/v1/jobs (CRUD)           middleware.ts (auth guard)        │  │
│  │  /api/v1/documents/upload                                         │  │
│  │  /api/ai/generate-*                                               │  │
│  │  /api/webhooks/stripe                                             │  │
│  │  /feed.xml, /sitemap.xml                                          │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
          ┌─────────────────────┼──────────────────────┐
          │                     │                      │
          ▼                     ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐
│  SUPABASE        │  │  UPSTASH REDIS   │  │  SERVICES EXTERNES       │
│  PostgreSQL      │  │  Rate limiting   │  │                          │
│                  │  │  Sessions cache  │  │  Anthropic Claude API    │
│  - jobs          │  └──────────────────┘  │  (génération CV/LM)      │
│  - companies     │                        │                          │
│  - users         │  ┌──────────────────┐  │  Cloudinary CDN          │
│  - applications  │  │  SENTRY          │  │  (fichiers PDF/images)   │
│  - documents     │  │  Error tracking  │  │                          │
│  - payments      │  │  Performance     │  │  Resend                  │
│  - ai_generations│  └──────────────────┘  │  (emails transactionnels)│
│                  │                        │                          │
│  RLS activé      │  ┌──────────────────┐  │  Stripe                  │
│  Backups auto    │  │  VERCEL ANALYTICS│  │  (paiements Phase 2)     │
└──────────────────┘  │  Core Web Vitals │  └──────────────────────────┘
                      └──────────────────┘
```

---

## 2. Flux d'authentification (NextAuth v5)

```
┌──────────────┐
│  Utilisateur │
│  clique      │
│  "Connexion" │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  /auth/login                             │
│  (page Next.js)                          │
│                                          │
│  [Se connecter avec Google]              │
│  [Connexion par email (magic link)]      │
└──────┬───────────────────────────────────┘
       │ OAuth redirect / email envoyé via Resend
       ▼
┌──────────────────────────────────────────┐
│  /api/auth/[...nextauth]                 │
│  NextAuth.js v5 handler                  │
│                                          │
│  PrismaAdapter → upsert User en BDD      │
│  JWT créé avec { id, role, companyId }   │
└──────┬───────────────────────────────────┘
       │ Cookie httpOnly (session JWT)
       ▼
┌──────────────────────────────────────────┐
│  middleware.ts (Edge)                    │
│                                          │
│  /dashboard/* → vérifie session          │
│    → role EMPLOYER requis                │
│  /api/v1/* (POST/PUT/DELETE)             │
│    → session requise                     │
│  /api/ai/* → session requise             │
└──────┬───────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────┐
│  Page/API protégée accessible            │
│  session.user = { id, role, companyId }  │
└──────────────────────────────────────────┘
```

---

## 3. Flux génération IA (Claude API)

```
┌─────────────────────────────────────────────────────┐
│  Candidat connecté sur /profile/documents/generate  │
└──────────────────────────┬──────────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
          ▼                                 ▼
┌──────────────────────┐         ┌──────────────────────┐
│  Génération LM       │         │  Structuration CV     │
│                      │         │                      │
│  Input:              │         │  Input:               │
│  - jobId             │         │  - Texte brut         │
│  - cvText            │         │    (copié/collé)      │
│  - language          │         │                      │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           └──────────────┬─────────────────┘
                          │ POST /api/ai/generate-*
                          │ (Auth + Rate limit Upstash)
                          ▼
           ┌──────────────────────────────────┐
           │  Vérification session NextAuth   │
           │  Rate limit: 10 req/jour/user    │
           └──────────────┬───────────────────┘
                          │
                          ▼
           ┌──────────────────────────────────┐
           │  Anthropic Claude API            │
           │  Model: claude-sonnet-4-6        │
           │  Max tokens: 1500                │
           │  Prompt structuré FR/EN          │
           └──────────────┬───────────────────┘
                          │ Texte généré
                          ▼
           ┌──────────────────────────────────┐
           │  Sauvegarde AiGeneration (BDD)   │
           │  { type, tokens, userId, result }│
           └──────────────┬───────────────────┘
                          │
                          ▼
           ┌──────────────────────────────────┐
           │  Affichage résultat              │
           │  + Éditeur rich text             │
           │  + Bouton "Sauvegarder comme PDF"│
           └──────────────┬───────────────────┘
                          │ POST /api/v1/documents/upload
                          ▼
           ┌──────────────────────────────────┐
           │  Cloudinary → PDF stocké         │
           │  Document créé en BDD            │
           │  → Disponible pour candidatures  │
           └──────────────────────────────────┘
```

---

## 4. Flux upload fichier (Cloudinary)

```
┌──────────────────────────────────────────────────────────────┐
│  Client: <input type="file"> + next-cloudinary               │
└─────────────────────────────┬────────────────────────────────┘
                              │ File sélectionné
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Validation client-side                                      │
│  - Type: PDF / JPG / PNG                                     │
│  - Taille: max 10MB                                          │
└─────────────────────────────┬────────────────────────────────┘
                              │ POST /api/v1/documents/upload
                              │ multipart/form-data
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  API Route (Node.js)                                         │
│  - Vérif session NextAuth                                    │
│  - Validation serveur (type + taille)                        │
│  - Upload via cloudinary.uploader.upload_stream()            │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Cloudinary                                                  │
│  Dossier: ebarka-jobs/{userId}/documents                     │
│  Retourne: { public_id, secure_url, format, bytes }          │
└─────────────────────────────┬────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────┐
│  Prisma: Document.create({ cloudinaryId, url, userId, ... }) │
│  Retourne: { id, url, name, type }                           │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. Flux soumission d'offre + paiement

```
Employeur connecté (/dashboard)
         │
         ▼
/dashboard/jobs/new
Formulaire (Zod validé)
         │ POST /api/v1/jobs
         ▼
Création Job { status: PENDING }
         │
         ▼
┌────────────────────┐
│ Plan Starter ?     │─── OUI ──► Job { status: ACTIVE }
│ (1 offre gratuite) │           Email confirmation (Resend)
└────────┬───────────┘
         │ NON (plan Pro/Business)
         ▼
POST /api/checkout
Stripe Checkout Session
{ jobId, plan, amount }
         │
         ▼
Redirect → Stripe Payment Page
         │ Paiement effectué
         ▼
Stripe → POST /api/webhooks/stripe
{ event: checkout.session.completed }
         │
         ▼
Job { status: ACTIVE }
Payment { status: PAID }
Email confirmation (Resend)
         │
         ▼
Redirect → /dashboard/jobs (offre visible)
```

---

## 6. Schéma ERD simplifié (PostgreSQL)

```
User ─────────────────── Company
 │                          │
 │ role: EMPLOYER           │ has many Jobs
 │                          │
 ├── SavedJob ──────────── Job
 │                          │
 ├── Application ─────────► │ has many Applications
 │      │                   │ has one Payment
 │      └── ApplicationDoc  │ has many CareerLevels
 │                          │ has many Languages
 └── Document               │
      │                     │
      └── AiGeneration      │
           (Claude output)  │
                            │
                          Payment
                          (Stripe)
```

---

## 7. Structure des dossiers cible

```
ebarka-jobs/
├── app/
│   ├── (public)/                    # Route group — pages publiques
│   │   ├── layout.tsx               # Nav + Footer
│   │   ├── page.tsx                 # Homepage
│   │   ├── jobs/[slug]/page.tsx
│   │   ├── about/page.tsx
│   │   └── ...
│   ├── (dashboard)/                 # Route group — employeur (auth requis)
│   │   ├── layout.tsx               # Nav admin + auth guard
│   │   └── dashboard/
│   │       ├── page.tsx
│   │       ├── jobs/
│   │       └── company/
│   ├── (candidate)/                 # Route group — candidat (auth requis)
│   │   ├── layout.tsx
│   │   └── profile/
│   │       ├── page.tsx
│   │       ├── documents/
│   │       └── applications/
│   ├── auth/                        # Pages NextAuth
│   │   ├── login/page.tsx
│   │   └── error/page.tsx
│   └── api/
│       ├── auth/[...nextauth]/
│       ├── v1/                      # API REST versionnée
│       │   ├── jobs/
│       │   ├── documents/
│       │   └── alerts/
│       ├── ai/                      # Routes Claude API
│       │   ├── generate-cv/
│       │   └── generate-cover-letter/
│       ├── webhooks/
│       │   └── stripe/
│       └── og/                      # Edge runtime (inchangé)
│
├── components/
│   ├── ui/                          # shadcn primitives
│   ├── layout/                      # Nav, Footer
│   ├── shared/                      # Hero, Pagination, Breadcrumb
│   ├── jobs/                        # JobCard, JobFilters
│   ├── dashboard/                   # Composants employeur
│   ├── candidate/                   # Composants candidat
│   └── ai/                          # Composants génération IA
│
├── emails/                          # Templates React Email
│   ├── job-alert.tsx
│   ├── welcome.tsx
│   └── ...
│
├── lib/
│   ├── db/
│   │   ├── prisma.ts
│   │   └── queries/
│   ├── auth/config.ts               # NextAuth config
│   ├── ai/claude.ts                 # Anthropic SDK helpers
│   ├── upload/cloudinary.ts         # Cloudinary helpers
│   ├── email/resend.ts              # Resend helpers
│   ├── rate-limit.ts                # Upstash rate limiter
│   ├── validations/                 # Schémas Zod
│   ├── hooks/                       # React hooks (nuqs, etc.)
│   └── utils/                       # Utilitaires purs
│
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
│
└── middleware.ts                    # Auth guard NextAuth
```
