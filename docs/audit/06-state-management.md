# Gestion d'État — Analyse

## Stratégie globale

L'application adopte une approche **"URL as State"** pour tout l'état de recherche et filtrage, sans store global. C'est un choix délibéré et bien adapté au cas d'usage d'un job board public.

```
┌─────────────────────────────────────────────────────────────┐
│                    SOURCES D'ÉTAT                           │
├──────────────────┬──────────────────┬───────────────────────┤
│  URL Query Params │   React State    │   Server State        │
│  (via nuqs)       │   (useState)     │   (RSC props)         │
├──────────────────┼──────────────────┼───────────────────────┤
│  ?q=             │ Filter local     │ Jobs data (Airtable)  │
│  ?page=          │ Toast state      │ Config data           │
│  ?sort=          │ Mobile menu      │ Metadata              │
│  ?per_page=      │                  │                       │
│  ?types=         │                  │                       │
│  ?roles=         │                  │                       │
│  ?remote=        │                  │                       │
│  ?salary=        │                  │                       │
│  ?visa=          │                  │                       │
│  ?languages=     │                  │                       │
└──────────────────┴──────────────────┴───────────────────────┘
```

---

## Bibliothèque `nuqs` — Analyse

**nuqs** (v2.5.2) est une librairie de gestion d'état URL pour Next.js App Router. Elle synchronise automatiquement `useState` avec les query params URL.

### Hooks implémentés (`lib/hooks/`)

#### `useJobSearch()` — [lib/hooks/useJobSearch.ts](../../lib/hooks/useJobSearch.ts)

```typescript
export function useJobSearch() {
  const [query, setQuery] = useQueryState('q', {
    defaultValue: '',
    shallow: true,  // Pas de navigation full-page
  });
  
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  
  // Debounce de 500ms (configurable via config.search.debounceMs)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, config.search?.debounceMs ?? 500);
    return () => clearTimeout(timer);
  }, [query]);
  
  return { query, setQuery, debouncedQuery };
}
```

#### `usePagination()` — [lib/hooks/usePagination.ts](../../lib/hooks/usePagination.ts)

```typescript
export function usePagination() {
  const [page, setPage] = useQueryState('page', {
    defaultValue: 1,
    parse: Number,
    serialize: String,
  });
  return { page, setPage };
}
```

#### `useSortOrder()` — [lib/hooks/useSortOrder.ts](../../lib/hooks/useSortOrder.ts)

```typescript
export function useSortOrder() {
  const [sort, setSort] = useQueryState('sort', {
    defaultValue: 'newest',
  });
  return { sort, setSort };
}
```

#### `useJobsPerPage()` — [lib/hooks/useJobsPerPage.ts](../../lib/hooks/useJobsPerPage.ts)

```typescript
export function useJobsPerPage() {
  const [perPage, setPerPage] = useQueryState('per_page', {
    defaultValue: config.jobListings?.defaultPerPage ?? 10,
    parse: Number,
    serialize: String,
  });
  return { perPage, setPerPage };
}
```

---

## Flux de données côté client

```
URL: /?q=developer&types=full-time&sort=newest&page=2&per_page=25
        │
        ▼
NuqsAdapter (app/layout.tsx)
    ├── useJobSearch() → q=developer (debounced)
    ├── usePagination() → page=2
    ├── useSortOrder() → sort=newest
    └── useJobsPerPage() → perPage=25
        │
        ▼
HomePage.tsx
    ├── Props: jobs (Server Component, tous les jobs)
    ├── State: search, filters, sort, pagination
    └── Logic:
        1. filterJobsBySearch(jobs, q)    → filtre titre/company
        2. filterJobsByType(jobs, types)   → filtre type
        3. filterJobsByLevel(jobs, roles)  → filtre niveau
        4. filterJobsByRemote(jobs, remote) → filtre remote
        5. filterJobsByLanguage(jobs, langs) → filtre langue
        6. sortJobs(jobs, sort)             → tri
        7. paginateJobs(jobs, page, perPage) → pagination
        └── → JobListings (sous-ensemble filtré)
```

---

## Problèmes de gestion d'état

### P1 — Filtrage entièrement côté client (MAJEUR)

**Localisation :** `components/home/HomePage.tsx`

```typescript
// TOUS les jobs sont chargés dans le composant parent
// Le filtrage se fait en mémoire JavaScript côté client
const filteredJobs = useMemo(() => {
  let result = jobs; // ← jobs = TOUS les jobs de la BDD
  
  if (debouncedQuery) result = filterJobsBySearch(result, debouncedQuery);
  if (selectedTypes.length) result = filterJobsByType(result, selectedTypes);
  // ...
  return result;
}, [jobs, debouncedQuery, selectedTypes, ...]);
```

**Conséquences :**
- 1,000 offres → ~500KB JSON en mémoire (acceptable)
- 10,000 offres → ~5MB JSON (lent, TTFB élevé)
- 100,000 offres → 50MB+ JSON (inutilisable)
- Pas de possibilité d'index côté serveur

**Solution :** Pagination et filtrage côté serveur avec paramètres URL passés à l'API.

### P2 — Réinitialisation de page manquante

Quand un filtre change, la pagination ne revient pas à la page 1 automatiquement :

```typescript
// Problème : ?page=5&types=full-time
// Si l'utilisateur change le type, il reste sur la page 5
// mais les résultats ont changé → page vide potentielle
```

**Solution :**
```typescript
const handleTypeChange = (types: string[]) => {
  setSelectedTypes(types);
  setPage(1); // Reset pagination
};
```

### P3 — Duplication de dossiers hooks

```
lib/hooks/          ← Hooks avec nuqs (useJobSearch, usePagination...)
hooks/              ← use-toast.ts seulement
```

Cette séparation est confuse. Tous les hooks devraient être dans `lib/hooks/` ou dans `hooks/` selon une convention cohérente.

### P4 — Pas de gestion de loading/error state

Les hooks `nuqs` synchronisent l'URL mais il n'y a pas de :
- Loading state pendant le filtrage
- Error state si Airtable est down
- Optimistic updates

**Pour le filtrage client, ce n'est pas critique** (instantané). Mais pour une future API server-side, c'est essentiel.

### P5 — `NuqsAdapter` dans le layout root

```typescript
// app/layout.tsx
import { NuqsAdapter } from 'nuqs/adapters/next/app';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  );
}
```

L'adaptateur `nuqs` est placé dans le layout root, ce qui est correct techniquement. Mais il serait plus propre de l'isoler avec un `Providers.tsx` client component pour séparer les préoccupations.

---

## Recommandations

### Court terme (sans refactorisation majeure)

1. **Réinitialiser `page=1` lors du changement de filtre** — 1h de travail
2. **Ajouter `aria-live="polite"` sur le compteur de résultats** — accessibilité
3. **Consolider les dossiers `hooks/`** — 30min

### Moyen terme (avec API server-side)

```typescript
// Exemple de hook avec fetching server-side
export function useJobs(filters: JobFilters) {
  return useSWR(
    ['/api/v1/jobs', filters],
    ([url, params]) => fetch(`${url}?${toQueryString(params)}`).then(r => r.json()),
    { revalidateOnFocus: false }
  );
}
```

### Long terme (état complexe)

Si l'application devient multi-pages avec dashboard employeur, envisager :
- **Zustand** pour l'état UI global (panier, notifications, auth)
- **TanStack Query** pour le server state (cache, invalidation, optimistic updates)
- **nuqs** rester pour l'état URL (partage de liens filtrés)

---

## Évaluation de l'approche URL State

| Critère | Score | Commentaire |
|---------|-------|-------------|
| Partageabilité | 10/10 | URL filtrée = bookmark parfait |
| Comportement back/forward | 10/10 | Gratuit avec l'URL |
| Performance (client) | 7/10 | Filtrage O(n) acceptable jusqu'à ~1000 jobs |
| Performance (réseau) | 5/10 | Toutes les données chargées au départ |
| Complexité | 8/10 | Simple et lisible |
| Scalabilité | 3/10 | Plafond dur à ~5000 offres |
