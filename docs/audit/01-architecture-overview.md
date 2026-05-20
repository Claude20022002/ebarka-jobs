# Architecture Overview — Analyse Complète

## 1. Vue d'ensemble

Ebarka-Jobs est une application **Next.js 15 App Router** à génération statique hybride. Elle suit le pattern **Jamstack étendu** : pages pré-générées à la construction + ISR pour la fraîcheur des données + logique serveur minimale (API routes pour l'email).

```
[Airtable API] ──────► [Next.js Server] ──────► [HTML Statique + ISR]
                              │
                    [API Routes Edge/Node]
                              │
                    [Encharge Email API]
```

---

## 2. Structure des dossiers

```
Ebarka-jobs/
├── app/                    # Next.js 15 App Router (routes = filesystem)
│   ├── api/                # Routes API serveur-side
│   │   ├── og/             # Open Graph image generation (edge runtime)
│   │   ├── subscribe/      # Abonnement email (rate-limited)
│   │   ├── atom.xml/       # Feed Atom 1.0
│   │   ├── feed.json/      # JSON Feed 1.1
│   │   └── feed.xml/       # RSS 2.0
│   ├── jobs/               # Pages d'emplois
│   │   ├── [slug]/         # Détail d'un job (SSG)
│   │   ├── type/[type]/    # Filtrage par type
│   │   ├── level/[level]/  # Filtrage par niveau
│   │   ├── location/[location]/  # Filtrage par localisation
│   │   └── language/[language]/  # Filtrage par langue
│   ├── about/
│   ├── changelog/
│   ├── contact/
│   ├── faq/
│   ├── job-alerts/
│   ├── pricing/
│   ├── privacy/
│   ├── terms/
│   ├── layout.tsx          # Root layout (NuqsAdapter + fonts + SEO)
│   ├── page.tsx            # Page d'accueil
│   ├── robots.ts           # robots.txt dynamique
│   └── sitemap.ts          # sitemap.xml dynamique (revalidate 5min)
│
├── components/             # Composants React organisés par domaine
│   ├── home/               # Composants spécifiques à la homepage
│   ├── jobs/               # Composants spécifiques aux emplois
│   ├── contact/            # Composants contact
│   ├── job-alerts/         # Formulaire d'alerte
│   └── ui/                 # Design system (shadcn/ui + custom)
│
├── config/                 # Configuration centralisée
│   ├── config.example.ts   # Template complet (1400+ lignes)
│   ├── config.ts           # Override utilisateur (optionnel)
│   └── index.ts            # Merge config (custom + example fallback)
│
├── hooks/                  # Hooks React globaux
│   └── use-toast.ts
│
├── lib/                    # Logique métier pure
│   ├── config/             # Routes helpers
│   ├── constants/          # Enums et constantes (langues, devises, pays...)
│   ├── db/                 # Couche accès données (Airtable)
│   ├── email/              # Provider email abstrait
│   ├── hooks/              # Hooks liés à la recherche/pagination
│   └── utils/              # Utilitaires (filtrage, slugify, metadata, SEO...)
│
├── public/                 # Assets statiques
└── docs/                   # Documentation (dont cet audit)
```

### Analyse de la structure

**Points forts :**
- Séparation claire `app/` (routes) vs `components/` (UI) vs `lib/` (logique)
- `lib/db/` encapsule l'accès Airtable — couche facilement remplaçable
- `lib/email/` avec pattern Provider — extensible sans modification du consommateur
- Constantes dans `lib/constants/` — source de vérité unique pour langues/devises

**Points faibles :**
- `components/ui/` mélange composants shadcn purs et composants métier (nav, footer, job-filters) — pas de séparation design system / feature
- `hooks/` à la racine ET dans `lib/hooks/` — duplication de dossier, confusion
- Pas de dossier `types/` centralisé — types dispersés entre `lib/db/airtable.ts` et fichiers locaux
- Pas de dossier `services/` — la logique métier complexe (normalisation) vit dans `lib/db/`

---

## 3. Flux d'authentification

### État actuel : AUCUNE AUTHENTIFICATION

```
Visiteur ──► Page publique ──► Données Airtable (lecture seule)
                │
         [Pas de session]
         [Pas de rôles]
         [Pas de JWT]
```

**Absence totale de :**
- Système de login/logout
- Sessions utilisateur
- Routes protégées
- Dashboard employeur
- Gestion des permissions
- Tokens API pour la soumission de jobs

**Impact :** L'application est entièrement publique et en lecture seule. La gestion des offres se fait directement dans Airtable. Ce modèle est adapté à un template, mais incompatible avec une plateforme SaaS.

---

## 4. Structure de la base de données

### Backend : Airtable (API REST)

```
Base Airtable
└── Table: "Jobs" (configurable via AIRTABLE_TABLE_NAME)
    ├── id                    (Airtable Record ID)
    ├── title                 (Single line text)
    ├── company               (Single line text)
    ├── type                  (Single select: Full-time, Part-time, Contract, Freelance)
    ├── salary_min            (Number)
    ├── salary_max            (Number)
    ├── salary_currency       (Single select: "USD (United States Dollar)")
    ├── salary_unit           (Single select: hour/day/week/month/year/project)
    ├── description           (Long text / Markdown)
    ├── benefits              (Long text, truncated à 1000 chars)
    ├── application_requirements (Long text, truncated à 1000 chars)
    ├── apply_url             (URL)
    ├── posted_date           (Date)
    ├── valid_through         (Date)
    ├── job_identifier        (Single line text)
    ├── job_source_name       (Single line text)
    ├── status                (Single select: active/inactive)
    ├── career_level          (Multiple select)
    ├── visa_sponsorship      (Single select: Yes/No)
    ├── featured              (Checkbox)
    ├── workplace_type        (Single select: On-site/Hybrid/Remote)
    ├── remote_region         (Single select: Worldwide/Americas Only/...)
    ├── timezone_requirements (Single line text)
    ├── workplace_city        (Single line text)
    ├── workplace_country     (Single line text)
    ├── languages             (Multiple select: "French (fr)")
    ├── skills                (Long text)
    ├── qualifications        (Long text)
    ├── education_requirements (Long text)
    ├── experience_requirements (Long text)
    ├── industry              (Single line text)
    ├── occupational_category (Single line text)
    └── responsibilities      (Long text)
```

**Couche d'accès (`lib/db/airtable.server.ts`) :**
- `getJobs()` — récupère tous les jobs actifs, triés par date
- `getJob(id)` — récupère un job par ID Airtable
- `testConnection()` — sanity check de connexion
- Utilise `React.cache()` pour la déduplication par requête
- Normalisation inline dans le fichier (7 fonctions de normalisation)

---

## 5. Architecture API

### Routes disponibles

| Route | Méthode | Runtime | Rôle |
|-------|---------|---------|------|
| `/api/og` | GET | Edge | Génération image OG générique |
| `/api/og/jobs/[slug]` | GET | Edge | Image OG spécifique à un job |
| `/api/subscribe` | POST | Node.js | Abonnement email (rate-limited) |
| `/feed.xml` | GET | Node.js | RSS 2.0 |
| `/atom.xml` | GET | Node.js | Atom 1.0 |
| `/feed.json` | GET | Node.js | JSON Feed 1.1 |
| `/robots.txt` | GET | Node.js | Directives robots |
| `/sitemap.xml` | GET | Node.js | Sitemap dynamique |

**Pas d'API REST standard** pour :
- CRUD des offres d'emploi
- Gestion des utilisateurs/employeurs
- Paiements
- Webhooks Airtable

---

## 6. Système UI

### Stack UI

```
shadcn/ui (headless pattern)
    └── Radix UI Primitives (accessibilité native)
          ├── @radix-ui/react-accordion
          ├── @radix-ui/react-avatar
          ├── @radix-ui/react-checkbox
          ├── @radix-ui/react-dropdown-menu
          ├── @radix-ui/react-label
          ├── @radix-ui/react-select
          ├── @radix-ui/react-slot
          ├── @radix-ui/react-switch
          └── @radix-ui/react-toast
Tailwind CSS 3.4
    └── @tailwindcss/typography (contenu markdown)
Lucide React (icônes)
class-variance-authority (variants)
tailwind-merge (classes conditionnelles)
```

### Typographie

| Font | Usage | Chargement |
|------|-------|------------|
| Geist | Code / technique | next/font (self-hosted) |
| Inter | Corps de texte | @fontsource (npm) |
| IBM Plex Serif | Titres élégants | @fontsource (npm) |

**Problème :** `@fontsource/inter` et `@fontsource/ibm-plex-serif` sont chargés via npm alors que `geist` utilise `next/font`. Incohérence — `next/font` est plus performant (optimisation automatique, pas de FOUT).

---

## 7. Gestion d'état

### Approche : URL State + Props drilling

```
URL Query String (nuqs)
    ├── ?q=        → useJobSearch() → debounce 500ms
    ├── ?page=     → usePagination()
    ├── ?sort=     → useSortOrder()
    ├── ?per_page= → useJobsPerPage()
    ├── ?types=    → JobFilters (local state)
    ├── ?roles=    → JobFilters (local state)
    ├── ?remote=   → JobFilters (local state)
    ├── ?salary=   → JobFilters (local state)
    ├── ?visa=     → JobFilters (local state)
    └── ?languages= → JobFilters (local state)
```

**Pas de store global** (pas de Zustand, Redux, Jotai). L'état UI est entièrement géré par :
1. URL query strings (shareable, bookmarkable)
2. useState local dans les composants
3. Props descendantes

**Avantage :** URLs partageables avec état de filtre intégré.
**Limite :** Logique de filtrage entièrement côté client — tous les jobs sont chargés en mémoire.

---

## 8. Configuration de déploiement

### État actuel : Minimal

- **Aucun** `vercel.json`
- **Aucun** `Dockerfile` ou `docker-compose.yml`
- **Aucun** fichier CI/CD GitHub Actions documenté
- Utilisation d'Edge Runtime pour les OG images → dépendance Vercel implicite

**Variables d'environnement requises :**
```bash
AIRTABLE_ACCESS_TOKEN=pat_xxxx    # Token API Airtable
AIRTABLE_BASE_ID=appXXXXXXXX     # ID de la base Airtable
AIRTABLE_TABLE_NAME=Jobs          # Nom de la table (défaut: Jobs)
ENCHARGE_WRITE_KEY=xxxx           # Clé API Encharge (si job alerts activé)
NEXT_PUBLIC_APP_URL=https://...   # URL publique du site
```

---

## 9. Flux de données complet

```
1. BUILD TIME (ISR)
   Airtable API → getJobs() [cache React] → generateStaticParams()
       → Pages HTML pré-générées → CDN

2. RUNTIME (Client)
   HTML hydraté → HomePage.tsx
       → URL params (nuqs) → filterJobsBySearch() → JobListings
       → Pagination locale → JobCard components

3. REVALIDATION (5 min)
   Timer ISR → Next.js → Airtable API → Rebuild pages modifiées

4. API SUBSCRIBE
   Client → POST /api/subscribe → Validation → Rate limit → Encharge API
```

---

## 10. Patterns architecturaux détectés

| Pattern | Présence | Qualité |
|---------|----------|---------|
| Repository Pattern | Partiel (`lib/db/`) | Bien — Airtable encapsulé |
| Provider Pattern | Oui (`lib/email/`) | Excellent |
| Configuration Pattern | Oui (`config/`) | Très bien |
| ISR/SSG | Oui | Bien configuré |
| URL State Management | Oui (nuqs) | Adapté au cas d'usage |
| Component Composition | Partiel | Peut être amélioré |
| Error Boundaries | Non | Absent |
| Dependency Injection | Non | À introduire |
| CQRS | Non | Pertinent pour la migration BDD |
| Event-driven | Non | Nécessaire pour les webhooks |
