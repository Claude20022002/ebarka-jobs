# Analyse de la Base de Données

## Architecture actuelle : Airtable

### Positionnement technologique

```
┌─────────────────────────────────────────────────────────┐
│                      AIRTABLE                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Base: Ebarka-Jobs (AIRTABLE_BASE_ID)           │   │
│  │  Table: Jobs (AIRTABLE_TABLE_NAME)              │   │
│  │  Records: ~5000 max recommandés par Airtable    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
          │ REST API (HTTPS)
          │ Authentification: Bearer Token
          ▼
┌─────────────────────────────────────────────────────────┐
│  lib/db/airtable.server.ts                              │
│  - getJobs() → React.cache()                            │
│  - getJob(id) → React.cache()                           │
│  - testConnection()                                     │
│  - 7 fonctions de normalisation                         │
└─────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js Pages (SSG/ISR)                                │
│  - revalidate: 300 (5 minutes)                          │
│  - generateStaticParams() pour les slugs                │
└─────────────────────────────────────────────────────────┘
```

---

## Schéma de données complet

### Table `Jobs`

| Champ | Type Airtable | Type TypeScript | Nullable | Valeur par défaut |
|-------|--------------|-----------------|----------|-------------------|
| `id` | Record ID | `string` | Non | Auto-généré |
| `title` | Single line text | `string` | Non | — |
| `company` | Single line text | `string` | Non | — |
| `type` | Single select | `JobType` | Non | — |
| `salary_min` | Number | `number \| null` | Oui | null |
| `salary_max` | Number | `number \| null` | Oui | null |
| `salary_currency` | Single select | `CurrencyCode` | Oui | "USD" |
| `salary_unit` | Single select | `SalaryUnit` | Oui | — |
| `description` | Long text | `string` | Non | — |
| `benefits` | Long text | `string \| null` | Oui | null |
| `application_requirements` | Long text | `string \| null` | Oui | null |
| `apply_url` | URL | `string` | Non | — |
| `posted_date` | Date | `string` (ISO) | Non | — |
| `valid_through` | Date | `string \| null` | Oui | null |
| `job_identifier` | Single line text | `string \| null` | Oui | null |
| `job_source_name` | Single line text | `string \| null` | Oui | null |
| `status` | Single select | `'active' \| 'inactive'` | Non | — |
| `career_level` | Multiple select | `CareerLevel[]` | Non | ['NotSpecified'] |
| `visa_sponsorship` | Single select | `'Yes' \| 'No' \| 'Not specified'` | Non | 'Not specified' |
| `featured` | Checkbox | `boolean` | Non | false |
| `workplace_type` | Single select | `WorkplaceType` | Non | 'Not specified' |
| `remote_region` | Single select | `RemoteRegion \| null` | Oui | null |
| `timezone_requirements` | Single line text | `string \| null` | Oui | null |
| `workplace_city` | Single line text | `string \| null` | Oui | null |
| `workplace_country` | Single line text | `string \| null` | Oui | null |
| `languages` | Multiple select | `LanguageCode[]` | Non | [] |
| `skills` | Long text | `string \| null` | Oui | null |
| `qualifications` | Long text | `string \| null` | Oui | null |
| `education_requirements` | Long text | `string \| null` | Oui | null |
| `experience_requirements` | Long text | `string \| null` | Oui | null |
| `industry` | Single line text | `string \| null` | Oui | null |
| `occupational_category` | Single line text | `string \| null` | Oui | null |
| `responsibilities` | Long text | `string \| null` | Oui | null |

---

## Types TypeScript (`lib/db/airtable.ts`)

```typescript
export type JobType = 'Full-time' | 'Part-time' | 'Contract' | 'Freelance';

export type SalaryUnit = 'hour' | 'day' | 'week' | 'month' | 'year' | 'project';

export type CareerLevel =
  | 'Internship' | 'EntryLevel' | 'Associate' | 'Junior'
  | 'MidLevel' | 'Senior' | 'Staff' | 'Principal' | 'Lead'
  | 'Manager' | 'SeniorManager' | 'Director' | 'SeniorDirector'
  | 'VP' | 'SVP' | 'EVP' | 'CLevel' | 'NotSpecified';

export interface Salary {
  min: number | null;
  max: number | null;
  currency: CurrencyCode;
  unit: SalaryUnit;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  type: JobType;
  salary: Salary | null;
  description: string;
  benefits: string | null;
  application_requirements: string | null;
  apply_url: string;
  posted_date: string;
  valid_through: string | null;
  job_identifier: string | null;
  job_source_name: string | null;
  status: 'active' | 'inactive';
  career_level: CareerLevel[];
  visa_sponsorship: 'Yes' | 'No' | 'Not specified';
  featured: boolean;
  workplace_type: WorkplaceType;
  remote_region: RemoteRegion;
  timezone_requirements: string | null;
  workplace_city: string | null;
  workplace_country: string | null;
  languages: LanguageCode[];
  skills: string | null;
  qualifications: string | null;
  education_requirements: string | null;
  experience_requirements: string | null;
  industry: string | null;
  occupational_category: string | null;
  responsibilities: string | null;
}
```

---

## Limites critiques d'Airtable

### 1. Plafonds de données

| Limite | Valeur | Impact |
|--------|--------|--------|
| Records par base (Free) | 1,000 | Bloquant très tôt |
| Records par base (Pro) | 50,000 | Limite à ~200 offres/jour sur 250 jours |
| Records par base (Business) | 125,000 | Suffisant pour 1-2 ans |
| Taille API response | Non limité | Charge mémoire côté Next.js |
| Rate limit API | 5 req/sec | Problème si plusieurs utilisateurs simultanés |

### 2. Problèmes de performance

```typescript
// PROBLÈME : getJobs() charge TOUS les records actifs en mémoire
const records = await base(TABLE_NAME)
  .select({
    filterByFormula: "{status} = 'active'",
    sort: [{ field: 'posted_date', direction: 'desc' }],
  })
  .all(); // ← .all() = pagination automatique, TOUTES les pages chargées
```

Avec 10,000+ offres, cette requête :
- Prend plusieurs secondes
- Utilise ~50MB de RAM
- Consomme plusieurs requêtes paginées API Airtable

### 3. Pas de relations entre tables

Airtable supporte les liaisons entre tables, mais la structure actuelle n'a qu'une seule table. Il manque des tables pour :
- Employeurs (companies)
- Catégories/secteurs (industries)
- Utilisateurs/candidats
- Paiements

### 4. Coût à l'échelle

| Plan Airtable | Coût/mois | Records | Adapté si |
|---------------|-----------|---------|-----------|
| Free | $0 | 1,000 | MVP local |
| Plus | $10/user | 10,000 | Petite équipe |
| Pro | $20/user | 100,000 | Croissance |
| Business | $45/user | 125,000 | Mid-market |

---

## Normalisation des données — Analyse des fonctions

### Fonctions présentes dans `airtable.server.ts`

```
normalizeCareerLevel()     → Converts "Entry Level" → "EntryLevel"
normalizeWorkplaceType()   → Validates against whitelist
normalizeRemoteRegion()    → Validates against whitelist
normalizeLanguages()       → Parses "French (fr)" format or ISO codes
normalizeCurrency()        → Parses "USD (United States Dollar)" format
normalizeBenefits()        → Truncate à 1000 chars
normalizeApplicationRequirements() → Truncate à 1000 chars
normalizeVisaSponsorship() → "yes"/"no" → "Yes"/"No"/"Not specified"
```

**Problèmes détectés :**

1. **DRY violation** — `normalizeBenefits` et `normalizeApplicationRequirements` sont identiques :
   ```typescript
   // Ces deux fonctions font exactement la même chose
   // Devrait être une seule fonction normalizeTextField(value, maxLength)
   ```

2. **Validation faible** — `normalizeCareerLevel()` convertit `"Entry Level"` → `"EntryLevel"` sans valider que le résultat est dans l'enum `CareerLevel`. Des valeurs inconnues passent silencieusement.

3. **Absence de schéma de validation** — Pas de Zod/Yup pour valider la structure Airtable. Les `as string` TypeScript casts peuvent crasher si le schéma change.

4. **Double normalisation** — La logique de slug est dans `lib/utils/slugify.ts` mais le champ `id` Airtable est utilisé directement pour `getJob()`. Si la structure de l'URL change, les slugs existants cassent.

---

## Flux de données — Problèmes identifiés

```
Airtable → getJobs() → [tous les records] → HomePage → filter client
                                              ↑
                                    ❌ PROBLÈME : charge mémoire O(n)
```

**Requête Airtable actuelle :**
- Filtre `status = 'active'` (côté serveur — bien)
- Tri par `posted_date desc` (côté serveur — bien)
- Pagination `.all()` — charge tout (problème)
- Pas de sélection de champs (charge tous les champs même inutilisés)

**Amélioration immédiate possible sans changer la BDD :**
```typescript
// Sélectionner uniquement les champs nécessaires pour la liste
.select({
  filterByFormula: "{status} = 'active'",
  sort: [{ field: 'posted_date', direction: 'desc' }],
  fields: ['title', 'company', 'type', 'salary_min', 'salary_max', 
           'salary_currency', 'salary_unit', 'workplace_type', 
           'workplace_city', 'workplace_country', 'posted_date', 
           'career_level', 'featured', 'visa_sponsorship'],
})
```

---

## Plan de migration vers PostgreSQL

### Schéma Prisma cible

```prisma
// prisma/schema.prisma

model Company {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  logo        String?
  website     String?
  description String?
  createdAt   DateTime @default(now())
  jobs        Job[]
  users       User[]
}

model Job {
  id                     String       @id @default(cuid())
  externalId             String?      // Airtable ID pour migration
  title                  String
  slug                   String       @unique
  type                   JobType
  salaryMin              Float?
  salaryMax              Float?
  salaryCurrency         String       @default("USD")
  salaryUnit             SalaryUnit?
  description            String       @db.Text
  benefits               String?      @db.Text
  applicationRequirements String?     @db.Text
  applyUrl               String
  postedDate             DateTime     @default(now())
  validThrough           DateTime?
  status                 JobStatus    @default(ACTIVE)
  featured               Boolean      @default(false)
  workplaceType          WorkplaceType @default(NOT_SPECIFIED)
  remoteRegion           String?
  timezoneRequirements   String?
  workplaceCity          String?
  workplaceCountry       String?
  skills                 String?      @db.Text
  qualifications         String?      @db.Text
  educationRequirements  String?      @db.Text
  experienceRequirements String?      @db.Text
  industry               String?
  occupationalCategory   String?
  responsibilities       String?      @db.Text
  visaSponsorship        VisaStatus   @default(NOT_SPECIFIED)
  jobIdentifier          String?
  jobSourceName          String?
  company                Company      @relation(fields: [companyId], references: [id])
  companyId              String
  careerLevels           JobCareerLevel[]
  languages              JobLanguage[]
  createdAt              DateTime     @default(now())
  updatedAt              DateTime     @updatedAt
  
  @@index([status, postedDate(sort: Desc)])
  @@index([companyId])
  @@index([workplaceType])
  @@index([featured, status])
}

enum JobType {
  FULL_TIME
  PART_TIME
  CONTRACT
  FREELANCE
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
  ACTIVE
  INACTIVE
  PENDING
  EXPIRED
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
```

---

## Estimation d'effort de migration

| Étape | Effort | Complexité |
|-------|--------|------------|
| Setup Prisma + PostgreSQL (Neon/Supabase) | 1 jour | Faible |
| Écriture du schéma | 2 jours | Moyen |
| Script d'import Airtable → PostgreSQL | 2 jours | Moyen |
| Remplacement de `lib/db/airtable.server.ts` | 3 jours | Moyen |
| Tests et validation | 2 jours | Moyen |
| **Total** | **~2 semaines** | — |
