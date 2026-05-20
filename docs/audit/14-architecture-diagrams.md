# Diagrammes d'Architecture

## 1. Architecture Actuelle

### 1.1 Vue d'ensemble système

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        UTILISATEUR FINAL                                │
│                    Navigateur Web / RSS Reader                          │
└─────────────────────────┬───────────────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     CDN EDGE (Vercel/Cloudflare)                        │
│              Pages statiques pré-générées (HTML/CSS/JS)                │
│              Cache TTL: 5 minutes (ISR revalidation)                   │
└────────┬────────────────────────────────────────────┬───────────────────┘
         │ Miss cache / API routes                    │ Hit cache
         ▼                                            ▼
┌────────────────────────┐                ┌─────────────────────────────┐
│   NEXT.JS SERVER       │                │     HTML STATIQUE SERVÉ     │
│   (Serverless/Node.js) │                │     depuis le CDN           │
│                        │                └─────────────────────────────┘
│  ┌──────────────────┐  │
│  │  App Router SSG  │  │   ISR Revalidation (5min)
│  │  - / (homepage)  │◄─┼───────────────────────────────┐
│  │  - /jobs/[slug]  │  │                               │
│  │  - /jobs/type/.. │  │                               │
│  └────────┬─────────┘  │                               │
│           │             │                               │
│  ┌────────▼─────────┐  │                   ┌───────────▼───────────┐
│  │   API Routes     │  │                   │      AIRTABLE API     │
│  │ /api/subscribe   │  │                   │   REST API (HTTPS)    │
│  │ /api/og          │  │                   │   Bearer Token Auth   │
│  │ /feed.xml        │  │──────────────────►│   Table: Jobs         │
│  │ /sitemap.xml     │  │                   │   ~100-5000 records   │
│  └────────┬─────────┘  │                   └───────────────────────┘
└───────────┼────────────┘
            │ (subscribe uniquement)
            ▼
┌─────────────────────────┐
│   ENCHARGE EMAIL API    │
│   (Newsletter/Alerts)   │
└─────────────────────────┘
```

---

### 1.2 Flux de données détaillé

```
╔══════════════════════════════════════════════════════════════════╗
║                      BUILD TIME (SSG)                           ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Airtable API ──► getJobs() ──► generateStaticParams()          ║
║                      │                    │                     ║
║                  React.cache()    Routes générées :             ║
║                  (déduplication)  /jobs/react-dev-at-acme       ║
║                                   /jobs/backend-at-corp         ║
║                                   ...                           ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║                    RUNTIME (Client Browser)                     ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  HTML pré-rendu ──► Hydration React 19 ──► Client State         ║
║                                                │                 ║
║                                    ┌───────────▼────────────┐   ║
║                                    │   URL State (nuqs)     │   ║
║                                    │   ?q=&page=&sort=...   │   ║
║                                    └───────────┬────────────┘   ║
║                                                │                 ║
║                            ┌───────────────────▼──────────────┐ ║
║                            │  Filter en mémoire (client-side) │ ║
║                            │  filterJobsBySearch()            │ ║
║                            │  filterJobsByType()              │ ║
║                            │  sortJobs()                      │ ║
║                            │  paginateJobs()                  │ ║
║                            └───────────────────┬──────────────┘ ║
║                                                │                 ║
║                                    ┌───────────▼────────────┐   ║
║                                    │   Rendu des résultats  │   ║
║                                    │   <JobListings />      │   ║
║                                    └────────────────────────┘   ║
╚══════════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════════╗
║                    REVALIDATION (ISR)                           ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Timer 5min ──► Next.js revalidation ──► Airtable API          ║
║                         │                     │                  ║
║                  Pages régénérées       Nouvelles offres        ║
║                  en arrière-plan        récupérées              ║
║                         │                                        ║
║                  CDN mis à jour ──► Utilisateurs voient         ║
║                                     les nouvelles offres        ║
╚══════════════════════════════════════════════════════════════════╝
```

---

### 1.3 Arbre de composants (page d'accueil)

```
app/page.tsx (Server Component)
└── <HomePage jobs={jobs} config={config} />  (Client Component)
    ├── <HeroSection />
    │   └── Badge, Title, Description
    │
    ├── <JobSearchInput />  ──── useJobSearch() ──── URL: ?q=
    │
    ├── <JobFilters />  ──────── useState local ───── URL: ?types=&roles=...
    │   ├── Type checkboxes
    │   ├── Career level checkboxes
    │   ├── Remote switch
    │   ├── Salary range select
    │   ├── Visa switch
    │   └── Languages select
    │
    ├── <SortOrderSelect />  ─── useSortOrder() ───── URL: ?sort=
    ├── <JobsPerPageSelect /> ── useJobsPerPage() ──── URL: ?per_page=
    │
    ├── [Filtering logic: useMemo]
    │   filterJobsBySearch() → filterJobsByType() → ... → sortJobs()
    │
    ├── <JobListings filteredJobs={...} />
    │   ├── <JobCard job={job} />  (× n)
    │   │   ├── Company Avatar
    │   │   ├── Job Title
    │   │   ├── Company Name
    │   │   ├── <JobBadge type={type} />
    │   │   ├── Salary display
    │   │   ├── Location badges
    │   │   └── Posted date
    │   └── <PostJobBanner />  (inséré toutes les N offres)
    │
    └── <PaginationControl />  ── usePagination() ─── URL: ?page=
```

---

### 1.4 Flux d'abonnement email

```
┌──────────────────┐
│  /job-alerts     │
│  (page)          │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│  <JobAlertsForm />               │
│  (Client Component)              │
│  - useState: name, email, loading│
│  - useToast() pour notifications  │
└────────┬─────────────────────────┘
         │ POST { name, email }
         ▼
┌──────────────────────────────────┐
│  /api/subscribe                  │
│  (Route Handler - Node.js)       │
│                                  │
│  1. Check jobAlerts.enabled      │
│  2. Extract IP                   │
│  3. Rate limit check (Map)       │
│  4. Validate email (regex)       │
│  5. Validate name (non-empty)    │
│  6. emailProvider.subscribe()    │
└────────┬─────────────────────────┘
         │ HTTP POST
         ▼
┌──────────────────────────────────┐
│  Encharge API                    │
│  POST https://ingest.encharge.io │
│  /v1/{ENCHARGE_WRITE_KEY}        │
│                                  │
│  Payload:                        │
│  { event, user: { email, name }, │
│    properties: { source, ip } }  │
└──────────────────────────────────┘
```

---

## 2. Architecture Cible (SaaS)

### 2.1 Vision architecture SaaS complète

```
┌─────────────────────────────────────────────────────────────────────┐
│                    UTILISATEURS                                      │
├──────────────────┬──────────────────┬───────────────────────────────┤
│   Visiteurs      │   Candidats      │   Employeurs / Admins         │
│   (anonymes)     │   (authentifiés) │   (authentifiés)              │
└────────┬─────────┴────────┬─────────┴───────────────┬───────────────┘
         │                  │                          │
         ▼                  ▼                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   NEXT.JS APP (Vercel)                              │
│                                                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  Pages publiques│  │  Pages candidat  │  │  Dashboard admin  │  │
│  │  (SSG/ISR)      │  │  (SSR/Auth)      │  │  (SSR/Auth)       │  │
│  │  /              │  │  /profile        │  │  /dashboard/jobs  │  │
│  │  /jobs/...      │  │  /saved-jobs     │  │  /dashboard/new   │  │
│  │  /about         │  │  /applications   │  │  /dashboard/pay   │  │
│  └─────────────────┘  └──────────────────┘  └───────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                      API Routes                               │  │
│  │  /api/v1/jobs (CRUD)     /api/auth/[...nextauth]             │  │
│  │  /api/v1/employers       /api/webhooks/stripe                │  │
│  │  /api/subscribe          /api/og/...                         │  │
│  │  /feed.xml               /sitemap.xml                        │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│  PostgreSQL   │  │  Upstash Redis│  │  Stripe       │
│  (Neon/Supa)  │  │  (Rate limit, │  │  (Paiements,  │
│               │  │   Sessions)   │  │   Webhooks)   │
│  - Jobs       │  └───────────────┘  └───────────────┘
│  - Companies  │
│  - Users      │  ┌───────────────┐  ┌───────────────┐
│  - Sessions   │  │  Encharge /   │  │  Sentry       │
│  - Payments   │  │  Brevo Email  │  │  (Monitoring) │
└───────────────┘  └───────────────┘  └───────────────┘
```

---

### 2.2 Flux d'authentification cible (NextAuth v5)

```
Employeur clique "Se connecter"
         │
         ▼
┌─────────────────────┐
│  /login             │
│  (Page NextAuth)    │
└────────┬────────────┘
         │ Google OAuth / Email Magic Link
         ▼
┌─────────────────────┐
│  NextAuth Handler   │
│  /api/auth/callback │
└────────┬────────────┘
         │ JWT + Session
         ▼
┌─────────────────────┐      ┌──────────────────────┐
│  Session Cookie     │─────►│  Middleware Auth      │
│  (httpOnly, secure) │      │  middleware.ts        │
└─────────────────────┘      │  - Protège /dashboard │
                             │  - Redirige si non-auth│
                             └──────────────────────┘
```

---

### 2.3 Flux de soumission d'offre (cible)

```
Employeur connecté
│
▼
/dashboard/jobs/new
│
▼
<JobSubmissionForm />
  - Titre, description, type, salaire
  - Localisation, langues, niveaux
  - URL de candidature
│
▼ POST /api/v1/jobs
│
▼
Validation Zod (server-side)
│
├── Échec → 422 + erreurs
│
└── Succès
    │
    ▼
    Vérification plan Stripe
    ├── Plan gratuit → offre en file d'attente
    └── Plan payant → offre activée immédiatement
        │
        ▼
        Prisma: INSERT INTO jobs (...)
        │
        ▼
        Revalidation ISR: revalidatePath('/jobs')
        │
        ▼
        Email confirmation employeur
        │
        ▼
        Redirect → /dashboard/jobs (liste)
```

---

## 3. Schéma de base de données cible (ERD)

```
┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
│   Company    │       │      Job         │       │    User      │
├──────────────┤       ├──────────────────┤       ├──────────────┤
│ id (cuid)    │◄──────│ companyId        │       │ id (cuid)    │
│ name         │       │ id (cuid)        │       │ email        │
│ slug         │       │ title            │       │ name         │
│ logo         │       │ slug             │       │ role         │
│ website      │       │ type (enum)      │       │ companyId    │─┐
│ description  │       │ status (enum)    │       │ emailVerified│ │
│ createdAt    │       │ salaryMin        │       │ image        │ │
└──────────────┘       │ salaryMax        │       └──────────────┘ │
       ▲               │ salaryCurrency   │                        │
       └───────────────│ salaryUnit       │◄───────────────────────┘
                       │ description      │
                       │ applyUrl         │       ┌──────────────┐
                       │ postedDate       │       │JobCareerLevel│
                       │ validThrough     │       ├──────────────┤
                       │ featured         │◄──────│ jobId        │
                       │ workplaceType    │       │ level (enum) │
                       │ remoteRegion     │       └──────────────┘
                       │ workplaceCity    │
                       │ workplaceCountry │       ┌──────────────┐
                       │ visaSponsorship  │       │ JobLanguage  │
                       │ createdAt        │       ├──────────────┤
                       │ updatedAt        │◄──────│ jobId        │
                       └──────────────────┘       │ language     │
                                                  └──────────────┘

┌──────────────────────────────────────────────┐
│               Payment                        │
├──────────────────────────────────────────────┤
│ id            stripeSessionId                │
│ userId        stripeCustomerId               │
│ jobId         amount                         │
│ plan          status (pending/paid/failed)   │
│ createdAt                                    │
└──────────────────────────────────────────────┘
```

---

## 4. Architecture des microservices (vision 12+ mois)

```
Si trafic > 1M offres / 100k utilisateurs simultanés :

                    API Gateway (Vercel Edge)
                    /jobs → Job Service
                    /auth → Auth Service
                    /payments → Payment Service
                    /feeds → Feed Service
                    /emails → Email Service

Job Service ────────► PostgreSQL (Primary)
                          │
                     PostgreSQL (Read Replica × 2)
                     (pour les requêtes de lecture)

Feed Service ──────► Redis Cache
                     (feeds générés en cache Redis, TTL 5min)

Email Service ─────► Queue (Upstash QStash)
                     (envoi asynchrone)
```

**Note :** Cette architecture n'est pas nécessaire avant d'atteindre 100k utilisateurs/mois. Rester simple (monolithe Next.js) jusqu'à ce que la charge le justifie.
