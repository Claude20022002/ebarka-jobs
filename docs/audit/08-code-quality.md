# Qualité du Code — Code Mort, Mauvaises Pratiques, Validations Manquantes

## 1. Code Mort

### 1.1 `components/jobs/JobSearch.tsx` — DEPRECATED

```typescript
// components/jobs/JobSearch.tsx
// Ce composant est explicitement marqué DEPRECATED
// Remplacé par : components/ui/job-search-input.tsx
```

**Action :** Vérifier qu'aucun import n'y fait référence, puis supprimer.

```bash
# Vérification
grep -r "JobSearch" --include="*.tsx" --include="*.ts" .
# Si seulement le fichier lui-même → supprimer
```

### 1.2 Fonctions de normalisation dupliquées

```typescript
// lib/db/airtable.server.ts
// Ces deux fonctions sont IDENTIQUES :

function normalizeBenefits(value: unknown): string | null {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  const MAX = 1000;
  if (text.length > MAX) return text.substring(0, MAX).trim();
  return text;
}

function normalizeApplicationRequirements(value: unknown): string | null {
  if (!value) return null;
  const text = String(value).trim();                 // ← Identique
  if (!text) return null;
  const MAX = 1000;                                  // ← Identique
  if (text.length > MAX) return text.substring(0, MAX).trim(); // ← Identique
  return text;
}
```

**Refactorisation :**
```typescript
function normalizeTextField(value: unknown, maxLength = 1000): string | null {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.length > maxLength ? text.substring(0, maxLength).trim() : text;
}
```

### 1.3 Duplication de la logique de construction de job dans `getJobs` et `getJob`

Les fonctions `getJobs()` et `getJob()` contiennent exactement le même code de mapping de record Airtable vers l'objet `Job`. Ce bloc de ~40 lignes est dupliqué.

```typescript
// Refactorisation recommandée
function mapAirtableRecordToJob(record: Airtable.Record<Airtable.FieldSet>): Job {
  const fields = record.fields;
  return {
    id: record.id,
    title: fields.title as string,
    // ... (logique partagée)
  };
}

// Utilisé dans les deux fonctions
export const getJobs = cache(async (): Promise<Job[]> => {
  const records = await base(TABLE_NAME).select({...}).all();
  return records.map(mapAirtableRecordToJob);
});

export const getJob = cache(async (id: string): Promise<Job | null> => {
  const record = await base(TABLE_NAME).find(id);
  if (record.fields.status !== 'active') return null;
  return mapAirtableRecordToJob(record);
});
```

---

## 2. Mauvaises Pratiques

### 2.1 `ignoreBuildErrors: true` (CRITIQUE)

**Fichier :** [next.config.ts](../../next.config.ts)

```typescript
typescript: {
  ignoreBuildErrors: true, // ← À supprimer IMMÉDIATEMENT
}
```

Cette option masque toutes les erreurs TypeScript lors du build de production. Les bugs de type ne sont détectés qu'en runtime.

### 2.2 `as string` casts massifs sans validation (HAUT)

**Fichier :** [lib/db/airtable.server.ts](../../lib/db/airtable.server.ts)

```typescript
// Des dizaines d'occurences de ce pattern :
title: fields.title as string,
company: fields.company as string,
apply_url: fields.apply_url as string,
// ...
```

Si le schéma Airtable change (champ renommé, supprimé), ces casts ne protègent pas contre un crash runtime.

**Solution :** Utiliser Zod pour valider la structure complète :
```typescript
import { z } from 'zod';

const AirtableJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  apply_url: z.string().url(),
  type: z.enum(['Full-time', 'Part-time', 'Contract', 'Freelance']),
  // ...
});

type AirtableJob = z.infer<typeof AirtableJobSchema>;

// Dans getJobs() :
const parsed = AirtableJobSchema.safeParse(fields);
if (!parsed.success) {
  console.error('Invalid job record:', record.id, parsed.error);
  return null; // Skip invalid records
}
```

### 2.3 Erreurs silencieuses dans les catch (MOYEN)

```typescript
// lib/db/airtable.server.ts
} catch {
  return []; // ← Erreur Airtable silencieuse — impossible à déboguer
}

} catch {
  return null; // ← Idem
}
```

Ces blocks catch vides rendent tout debugging impossible. Une erreur de connexion, de permission, ou de quota Airtable passe silencieusement.

**Solution :**
```typescript
} catch (error) {
  console.error('[Airtable] getJobs failed:', error);
  // En production : envoyer à Sentry
  return [];
}
```

### 2.4 Magic numbers non documentés

```typescript
// lib/db/airtable.server.ts
const MAX_BENEFITS_LENGTH = 1000;           // Pourquoi 1000 ?
const MAX_REQUIREMENTS_LENGTH = 1000;       // Idem

// lib/constants/defaults.ts
// Vérifier que RATE_LIMIT_WINDOW_MS est bien documenté
```

Les constantes de seuil devraient être centralisées et commentées.

### 2.5 Types `any` implicites potentiels

Avec `ignoreBuildErrors: true`, des types `any` implicites peuvent se glisser sans avertissement. À auditer après suppression de l'option.

### 2.6 `node-fetch` et `axios` redondants

```json
{
  "dependencies": {
    "axios": "^1.11.0",       // Pour Encharge
    "node-fetch": "^3.3.2",   // Potentiellement non utilisé
    "dotenv": "^17.2.1"       // Next.js charge .env automatiquement
  }
}
```

- `node-fetch` : Next.js 15 utilise nativement le `fetch` global — ce package est probablement inutile
- `dotenv` : Next.js charge automatiquement `.env*` — ce package est redondant
- `axios` : utilisé uniquement dans `lib/email/providers/encharge.ts` — remplaçable par `fetch` natif

---

## 3. Validations Manquantes

### 3.1 Endpoint `/api/subscribe` — Validations insuffisantes

```typescript
// Actuellement :
if (!(email && EMAIL_REGEX.test(email))) { /* validate */ }
if (!name || name.trim() === '') { /* validate */ }

// MANQUANT :
// 1. Longueur maximale du nom (actuellement illimitée)
// 2. Caractères dangereux dans le nom (injection de contenu)
// 3. Validation de l'Origin/Referer
// 4. Content-Type validation
// 5. Taille maximale du body (DoS)
```

**Solution avec Zod :**
```typescript
const SubscribeSchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .regex(/^[\p{L}\s'-]+$/u, 'Invalid characters in name'),
  email: z.string()
    .email('Invalid email')
    .max(320, 'Email too long'),
});
```

### 3.2 `apply_url` — Pas de validation côté serveur

```typescript
// Dans airtable.server.ts, apply_url est utilisé sans validation :
apply_url: fields.apply_url as string,

// Un lien malveillant pourrait être :
// javascript:alert('XSS')
// ftp://evil.com/malware
// data:text/html,...
```

### 3.3 Paramètres URL — Pas de validation des types

```typescript
// useJobsPerPage.ts
const [perPage, setPerPage] = useQueryState('per_page', {
  defaultValue: 10,
  parse: Number,
});
// Que se passe-t-il avec ?per_page=-1 ou ?per_page=99999 ?
```

**Solution :**
```typescript
const [perPage, setPerPage] = useQueryState('per_page', {
  defaultValue: 10,
  parse: (value) => {
    const n = Number(value);
    const allowed = [5, 10, 25, 50, 100];
    return allowed.includes(n) ? n : 10;
  },
});
```

### 3.4 Markdown — Pas de sanitisation

```typescript
// lib/utils/markdown.ts
export function normalizeMarkdown(content: string): string {
  // Normalise le markdown mais ne sanitise pas le HTML
}

// Si la description Airtable contient du HTML malveillant,
// react-markdown le rend par défaut (mais avec limitations)
```

**Vérifier que `react-markdown` est configuré sans `rehype-raw` pour éviter XSS :**
```typescript
// Bien : pas de rehype-raw → HTML brut ignoré
<ReactMarkdown remarkPlugins={[remarkGfm]}>
  {description}
</ReactMarkdown>

// Dangereux : avec rehype-raw → HTML brut rendu
<ReactMarkdown rehypePlugins={[rehypeRaw]}>
  {description}
</ReactMarkdown>
```

---

## 4. Analyse des tests

### État actuel : AUCUN TEST

```
Tests unitaires      : 0 fichiers
Tests d'intégration  : 0 fichiers
Tests e2e            : 0 fichiers
Coverage             : 0%
```

**Fonctions critiques non testées :**

| Fonction | Importance | Risque si non testée |
|----------|-----------|----------------------|
| `normalizeCareerLevel()` | Haute | Affichage incorrect des niveaux |
| `normalizeCurrency()` | Haute | Valeurs salariales incorrectes |
| `normalizeLanguages()` | Haute | Filtrage par langue cassé |
| `filterJobsBySearch()` | Haute | Recherche incorrecte |
| `formatSalary()` | Moyenne | Affichage salaire incorrect |
| `slugify()` | Haute | URLs cassées |
| `isRateLimited()` | Haute | Sécurité endpoint |
| `validateApplyUrl()` | Haute | Liens malveillants |

**Recommandation — Setup de test minimal :**
```bash
# Vitest (compatible Next.js, très rapide avec Bun)
bun add -D vitest @vitejs/plugin-react jsdom @testing-library/react

# vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

---

## 5. Résumé des problèmes de qualité

| Catégorie | Problèmes | Critique | Haut | Moyen |
|-----------|-----------|---------|------|-------|
| Code mort | 3 | 0 | 1 | 2 |
| Mauvaises pratiques | 6 | 1 | 3 | 2 |
| Validations manquantes | 4 | 0 | 3 | 1 |
| Tests | 1 | 0 | 1 | 0 |
| **Total** | **14** | **1** | **8** | **5** |

### Priorité d'action

1. **Immédiat (< 1 jour) :** Supprimer `ignoreBuildErrors: true`
2. **Cette semaine :** Corriger les erreurs TypeScript qui se révèlent
3. **Ce sprint :** Ajouter Zod pour la validation des données Airtable et des endpoints API
4. **Prochain sprint :** Setup Vitest + tests des fonctions critiques
5. **Continu :** Logging des erreurs (Sentry ou console structuré)
