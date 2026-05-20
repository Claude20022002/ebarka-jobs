# Composants Réutilisables — Inventaire et Analyse

## 1. Composants UI Réutilisables (Design System)

Ces composants sont purs, sans logique métier, et peuvent être utilisés dans n'importe quel contexte.

### Niveau 1 — Primitives (shadcn/ui)

| Composant | Fichier | Réutilisabilité | Notes |
|-----------|---------|-----------------|-------|
| `Button` | `components/ui/button.tsx` | Universelle | CVA variants : default, outline, ghost, link |
| `Input` | `components/ui/input.tsx` | Universelle | — |
| `Label` | `components/ui/label.tsx` | Universelle | — |
| `Badge` | `components/ui/badge.tsx` | Universelle | Variants de couleur |
| `Card` | `components/ui/card.tsx` | Universelle | CardHeader, CardContent, CardFooter |
| `Checkbox` | `components/ui/checkbox.tsx` | Universelle | Radix-based |
| `Select` | `components/ui/select.tsx` | Universelle | Radix-based |
| `Switch` | `components/ui/switch.tsx` | Universelle | Radix-based |
| `Avatar` | `components/ui/avatar.tsx` | Universelle | Radix-based |
| `Accordion` | `components/ui/accordion.tsx` | Universelle | Radix-based |
| `DropdownMenu` | `components/ui/dropdown-menu.tsx` | Universelle | Radix-based |
| `Toast/Toaster` | `components/ui/toast.tsx` | Universelle | Notifications |

**Statut :** Ces composants sont déjà bien factorés et réutilisables. Aucune action requise.

---

## 2. Composants Métier Réutilisables

Ces composants contiennent de la logique métier mais peuvent être réutilisés dans différentes pages.

### 2.1 `HeroSection` — `components/ui/hero-section.tsx`

**Réutilisé dans :** Pages jobs, about, contact, faq, job-alerts, pricing
**Props clés :**
```typescript
interface HeroSectionProps {
  title: string;
  description?: string;
  badge?: string;
  background?: 'gradient' | 'image' | 'solid';
  gradientConfig?: GradientConfig;
  imageConfig?: ImageConfig;
}
```
**Statut :** Excellent composant réutilisable. Bien paramétré.

### 2.2 `PostJobBanner` — `components/ui/post-job-banner.tsx`

**Réutilisé dans :** Homepage, pages de catégories
**Rôle :** CTA "Poster une offre d'emploi"
**Statut :** Réutilisable tel quel.

### 2.3 `Pagination` / `PaginationControl` — `components/ui/pagination*.tsx`

**Réutilisé dans :** Homepage, pages de liste
**Statut :** Réutilisable mais couplé à `nuqs`. À découpler si pagination non-URL nécessaire.

### 2.4 `SortOrderSelect` — `components/ui/sort-order-select.tsx`

**Statut :** Réutilisable via props.

### 2.5 `JobsPerPageSelect` — `components/ui/jobs-per-page-select.tsx`

**Statut :** Réutilisable via props.

### 2.6 `SimilarJobs` — `components/ui/similar-jobs.tsx`

**Réutilisé dans :** Page de détail d'un job
**Logique :** Cherche des jobs similaires par type/niveau/localisation
**Statut :** Réutilisable, mais la logique de "similarité" mériterait d'être dans `lib/utils/`.

### 2.7 `CollapsibleText` — `components/ui/collapsible-text.tsx`

**Rôle :** Texte tronqué avec bouton "Voir plus"
**Statut :** Excellent composant générique réutilisable.

---

## 3. Composants à Extraire (Opportunités de Réutilisation)

### 3.1 Job Card — Logique commune entre `JobCard` et `CompactJobCard`

```typescript
// Actuellement : deux composants séparés avec logique dupliquée
// components/jobs/JobCard.tsx
// components/jobs/CompactJobCard.tsx

// Recommandation : un seul composant avec variant
interface JobCardProps {
  job: Job;
  variant?: 'standard' | 'compact';
}

export function JobCard({ job, variant = 'standard' }: JobCardProps) {
  if (variant === 'compact') return <CompactView job={job} />;
  return <StandardView job={job} />;
}
```

### 3.2 Breadcrumb — Unifier les 3 implémentations

```typescript
// Actuellement : 3 fichiers
// components/ui/metadata-breadcrumb.tsx
// components/ui/server-breadcrumb.tsx
// components/ui/client-breadcrumb.tsx

// Recommandation : 1 seul composant
interface BreadcrumbProps {
  items: Array<{ label: string; href?: string }>;
  withSchema?: boolean; // Pour le JSON-LD
}

export function Breadcrumb({ items, withSchema = false }: BreadcrumbProps) {
  return (
    <>
      {withSchema && <BreadcrumbSchema items={items} />}
      <nav aria-label="Breadcrumb">
        {/* Rendu des items */}
      </nav>
    </>
  );
}
```

### 3.3 `JobBadge` — Déjà bien factoré

```typescript
// components/ui/job-badge.tsx
// Ce composant est simple et réutilisable
// Utilisé pour : type d'emploi, niveau de carrière, workplace type
```

---

## 4. Logique Métier Réutilisable (`lib/`)

### 4.1 Fonctions de filtrage — `lib/utils/filter-jobs.ts`

```typescript
// Actuellement : seulement filterJobsBySearch()
export function filterJobsBySearch(jobs: Job[], searchTerm: string): Job[]

// Potentiellement à extraire des composants :
export function filterJobsByType(jobs: Job[], types: JobType[]): Job[]
export function filterJobsByLevel(jobs: Job[], levels: CareerLevel[]): Job[]
export function filterJobsByWorkplace(jobs: Job[], remote: boolean): Job[]
export function filterJobsByLanguage(jobs: Job[], langs: LanguageCode[]): Job[]
export function filterJobsBySalary(jobs: Job[], range: [number, number]): Job[]
export function filterJobsByVisa(jobs: Job[]): Job[]
export function sortJobs(jobs: Job[], order: 'newest' | 'oldest' | 'salary'): Job[]
export function paginateJobs(jobs: Job[], page: number, perPage: number): Job[]
```

**Action :** Extraire toute la logique de filtrage qui est actuellement dans `HomePage.tsx` vers `lib/utils/filter-jobs.ts`.

### 4.2 Utilitaires de formatage — `lib/db/airtable.ts`

```typescript
// Ces fonctions sont dans airtable.ts mais sont des utilitaires génériques
export function formatSalary(salary: Salary): string
export function normalizeAnnualSalary(salary: Salary): number
export function formatUSDApproximation(salary: Salary): string

// Mieux dans : lib/utils/salary.ts
```

### 4.3 `slugify()` — `lib/utils/slugify.ts`

```typescript
// Fonction générique, bien placée
export function slugify(text: string): string
// Utilisée pour générer les URLs de jobs
```

### 4.4 `generateMetadata()` — `lib/utils/metadata.ts`

```typescript
// Excellente abstraction réutilisable
export function generateMetadata(options: MetadataOptions): Metadata
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): BreadcrumbList
```

### 4.5 `normalizeMarkdown()` — `lib/utils/markdown.ts`

```typescript
// Réutilisable pour tout contenu markdown de la BDD
export function normalizeMarkdown(content: string): string
```

---

## 5. Layouts Réutilisables

### 5.1 Layout de page avec hero

**Utilisé par :** about, contact, faq, job-alerts, pricing, jobs

```typescript
// Pattern non formalisé — devrait être un layout :
// app/(marketing)/layout.tsx (route group)

export default function MarketingLayout({ children }) {
  return (
    <div>
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
```

### 5.2 Layout de liste de jobs

**Utilisé par :** jobs/type/[type], jobs/level/[level], jobs/location/[location], jobs/language/[language]

```typescript
// components/jobs/JobsLayout.tsx existe déjà
// Mais est-il utilisé de manière cohérente partout ?
// À vérifier et standardiser
```

### 5.3 Route Groups Next.js (recommandé)

```
app/
├── (marketing)/          # Pages sans barre latérale
│   ├── layout.tsx        # Nav + Footer
│   ├── about/
│   ├── contact/
│   ├── faq/
│   ├── pricing/
│   └── job-alerts/
├── (jobs)/               # Pages d'emplois avec filtres
│   ├── layout.tsx        # Nav + Footer + Filtres
│   ├── jobs/
│   │   ├── page.tsx
│   │   ├── [slug]/
│   │   ├── type/[type]/
│   │   └── ...
└── (dashboard)/          # Future zone admin
    ├── layout.tsx        # Nav admin + Auth guard
    └── dashboard/
```

---

## 6. Schémas Schema.org — Logique réutilisable

Les 4 composants de schéma structuré (`website-schema.tsx`, `job-schema.tsx`, `about-schema.tsx`, `contact-schema.tsx`) génèrent du JSON-LD. La logique de génération pourrait être centralisée :

```typescript
// lib/utils/schema.ts
export function generateJobPostingSchema(job: Job, config: Config): JobPosting
export function generateOrganizationSchema(config: Config): Organization
export function generateWebsiteSchema(config: Config): WebSite
export function generateBreadcrumbSchema(items: BreadcrumbItem[]): BreadcrumbList
```

---

## 7. Email Provider — Pattern déjà réutilisable

```typescript
// lib/email/types.ts
export interface EmailProvider {
  subscribe(data: SubscriberData): Promise<void>;
}

// lib/email/providers/encharge.ts — Implémentation Encharge
// À ajouter :
// lib/email/providers/mailchimp.ts
// lib/email/providers/convertkit.ts
// lib/email/providers/brevo.ts
```

Le pattern provider est excellent et déjà bien structuré. Facilement extensible.

---

## 8. Opportunités de Réutilisation — Tableau de bord

| Composant | Statut | Action | Effort |
|-----------|--------|--------|--------|
| Design system (button, input...) | ✅ Réutilisable | Aucune | — |
| HeroSection | ✅ Réutilisable | Aucune | — |
| JobCard | ⚠️ Dupliqué | Unifier avec variant | 2h |
| Breadcrumb | ❌ Tripliqué | Consolider | 2h |
| Filter functions | ⚠️ Dispersé | Centraliser dans lib/utils | 3h |
| Salary utils | ⚠️ Mal placé | Déplacer vers lib/utils/salary | 30min |
| Schema.org | ⚠️ Couplé config | Abstraire en fonctions | 2h |
| Route Groups | ❌ Absent | Créer les groupes | 1 jour |
| Email Provider | ✅ Bon pattern | Ajouter providers | Variable |
