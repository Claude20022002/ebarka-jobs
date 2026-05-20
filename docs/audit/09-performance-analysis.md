# Analyse des Performances

## Vue d'ensemble

L'application a une architecture globalement favorable aux performances grâce à l'ISR Next.js. Les principaux problèmes se situent dans le chargement de données (tout-en-mémoire) et dans le chargement des fonts.

---

## 1. Core Web Vitals — Évaluation

| Métrique | Estimation | Problème principal |
|----------|-----------|-------------------|
| LCP (Largest Contentful Paint) | ~1.5s | Font loading (FOUT) |
| CLS (Cumulative Layout Shift) | ~0.05 | Skeleton manquant |
| INP (Interaction to Next Paint) | ~150ms | Filtrage JS synchrone |
| TTFB (Time to First Byte) | < 100ms | CDN Edge (ISR) — excellent |
| FCP (First Contentful Paint) | ~0.8s | ISR HTML — excellent |

---

## 2. ISR (Incremental Static Regeneration) — Configuration

### Configuration de revalidation par page

| Page | Revalidate | Justification |
|------|-----------|---------------|
| `/` | 300s (5min) | Fraîcheur raisonnable |
| `/jobs` | 300s | OK |
| `/jobs/[slug]` | 300s | OK |
| `/jobs/type/[type]` | 300s | OK |
| `/jobs/level/[level]` | 300s | OK |
| `/jobs/location/[location]` | 300s | OK |
| `/jobs/language/[language]` | 300s | OK |
| `/sitemap.xml` | 300s | OK |
| `/feed.xml` | 300s | OK |

**Bonne pratique suivie :** Toutes les pages utilisent ISR avec revalidation cohérente.

**Amélioration possible :**
- `/jobs/[slug]` pourrait avoir une revalidation plus longue (24h) si les offres ne changent pas souvent
- On-demand revalidation via webhook Airtable éviterait les 5min inutiles

---

## 3. Problème majeur : Chargement de toutes les données en mémoire

### Analyse de la requête `getJobs()`

```typescript
// lib/db/airtable.server.ts
const records = await base(TABLE_NAME)
  .select({
    filterByFormula: "{status} = 'active'",
    sort: [{ field: 'posted_date', direction: 'desc' }],
  })
  .all(); // ← Toutes les pages, tous les champs, tous les records
```

### Impact mémoire par volume

| Nb offres | Taille JSON estimée | Mémoire Node.js | Temps de réponse |
|-----------|--------------------|-----------------|--------------------|
| 100 | ~50KB | ~5MB | < 100ms |
| 500 | ~250KB | ~25MB | ~200ms |
| 1,000 | ~500KB | ~50MB | ~500ms |
| 5,000 | ~2.5MB | ~250MB | ~2s |
| 10,000 | ~5MB | ~500MB | ~5s (timeout?) |

**Limite Airtable API :** 5 req/sec → avec pagination automatique (100 records/page), 1000 records = 10 requêtes API = ~2 secondes minimum

### Solution : Pagination côté serveur

```typescript
// Version optimisée avec pagination côté serveur
export const getJobsPaginated = cache(async (
  page: number = 1,
  perPage: number = 25,
  filters?: JobFilters
): Promise<{ jobs: Job[], total: number }> => {
  const offset = (page - 1) * perPage;
  
  // Construction du filtre Airtable
  let formula = "{status} = 'active'";
  if (filters?.type) {
    formula = `AND(${formula}, {type} = '${filters.type}')`;
  }
  
  const records = await base(TABLE_NAME)
    .select({
      filterByFormula: formula,
      sort: [{ field: 'posted_date', direction: 'desc' }],
      pageSize: perPage,
      offset: offset, // Attention: Airtable offset ≠ page standard
    })
    .firstPage(); // ← Seulement la première page !
  
  return {
    jobs: records.map(mapAirtableRecordToJob),
    total: -1, // Airtable ne fournit pas le total sans .all()
  };
});
```

**Limitation Airtable :** L'API Airtable ne supporte pas les requêtes d'agrégation (COUNT). Le total n'est accessible qu'avec `.all()`. Migration vers PostgreSQL recommandée pour la pagination côté serveur.

---

## 4. Problèmes de chargement des fonts

### Situation actuelle

```typescript
// @fontsource (npm package) — chargé via CSS imports
import '@fontsource/inter/400.css';
import '@fontsource/ibm-plex-serif/400.css';
// ...

// Geist — chargé via next/font (optimisé)
import { GeistSans } from 'geist/font/sans';
```

**Problèmes avec @fontsource :**
1. FOUT (Flash of Unstyled Text) — les fonts npm ne sont pas optimisées automatiquement
2. Pas de `font-display: optional` automatique
3. Pas de subset automatique (charge tous les caractères)
4. Poids supplémentaires charger même si non utilisés

**Impact LCP :** Chaque font non-optimisée ajoute ~100-300ms au LCP.

**Solution avec `next/font` :**
```typescript
// app/layout.tsx
import { Inter, IBM_Plex_Serif } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-ibm-plex-serif',
  display: 'optional', // Évite le FOUT
});
```

---

## 5. Open Graph Images (Edge Runtime)

### Problème potentiel dans `api/og/jobs/[slug]/route.tsx`

Les images OG des jobs doivent récupérer les données du job depuis Airtable. Mais :
- L'Airtable SDK Node.js n'est pas compatible avec Edge runtime
- Soit le code contourne ce problème (fetch direct Airtable API), soit il crashe silencieusement

**À vérifier :**
```typescript
// Si airtable.server.ts est importé dans une route Edge → erreur runtime
// La solution est d'utiliser fetch() directement vers l'API Airtable REST
const response = await fetch(
  `https://api.airtable.com/v0/${baseId}/${tableId}/${recordId}`,
  { headers: { Authorization: `Bearer ${token}` } }
);
```

---

## 6. Bundle JavaScript côté client

### Dépendances importantes dans le bundle client

| Package | Taille estimée | Lazy-loadable ? |
|---------|---------------|-----------------|
| `react-markdown` + remark | ~80KB gzip | Oui (pages job seulement) |
| `lucide-react` | ~5KB (tree-shaken) | N/A |
| `nuqs` | ~8KB | Non (requis dès le départ) |
| `date-fns` | ~30KB gzip | Partiellement |
| Radix UI (tous) | ~60KB gzip | Partiellement |

**Recommandation :** `react-markdown` et les plugins remark/unified ne devraient être chargés que sur les pages de détail de job :

```typescript
// app/jobs/[slug]/page.tsx — Lazy load
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  loading: () => <p>Loading...</p>,
});
```

---

## 7. Images et médias

### État actuel

- Pas d'optimisation d'images Airtable (URLs directes Airtable CDN)
- Les logos d'entreprise sont dans `public/avatars/` — non optimisés via `next/image`
- Pas de placeholder (blur) pour les images

**Recommandation :**
```typescript
// Utiliser next/image avec placeholder blur
import Image from 'next/image';

<Image
  src={company.logo}
  alt={`${company.name} logo`}
  width={48}
  height={48}
  placeholder="blur"
  blurDataURL="data:image/png;base64,..."
/>
```

---

## 8. Requêtes Airtable — Optimisations immédiates

### Sélection de champs

```typescript
// AVANT — charge TOUS les champs (incluant descriptions longues)
.select({
  filterByFormula: "{status} = 'active'",
})

// APRÈS — pour la liste, seulement les champs nécessaires
.select({
  filterByFormula: "{status} = 'active'",
  fields: [
    'title', 'company', 'type',
    'salary_min', 'salary_max', 'salary_currency', 'salary_unit',
    'workplace_type', 'workplace_city', 'workplace_country',
    'posted_date', 'career_level', 'featured', 'visa_sponsorship',
    'languages', 'remote_region', 'status',
  ],
  // NE PAS inclure : description, benefits, skills, qualifications...
  // Ces champs volumeux ne sont nécessaires que pour la page de détail
})
```

**Gain estimé :** ~60% de réduction de la taille des données transférées depuis Airtable.

---

## 9. Récapitulatif des optimisations

### Impact/effort

| Optimisation | Gain | Effort | Priorité |
|--------------|------|--------|----------|
| Sélection des champs Airtable | ~60% données | 1h | P1 |
| Migration fonts vers next/font | ~200ms LCP | 2h | P1 |
| Lazy loading react-markdown | ~80KB bundle | 1h | P2 |
| Pagination côté serveur | x10 scalabilité | 1 semaine | P2 |
| On-demand revalidation (webhook) | Temps réel | 1 jour | P3 |
| Image optimization next/image | ~30% images | 2 jours | P3 |
| Redis rate limiting | Sécurité | 1 jour | P1 |
| Bundle analyzer audit | Visibilité | 1h | P2 |
