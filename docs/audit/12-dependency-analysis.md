# Analyse des Dépendances

## Vue d'ensemble

```
Total dépendances : 32 production + 11 dev = 43 packages
Package manager   : Bun 1.x
Lock file         : bun.lock (présent — reproducible builds)
TypeScript        : v5.9.3 (latest stable)
Next.js           : v15.5.7 (latest)
React             : v19.1.2 (latest)
```

---

## Dépendances de production — Analyse détaillée

### Framework & Runtime

| Package | Version | Usage | Critique | Problème |
|---------|---------|-------|---------|---------|
| `next` | ^15.5.7 | Framework principal | Oui | Aucun |
| `react` | ^19.1.2 | UI runtime | Oui | Aucun |
| `react-dom` | ^19.1.2 | DOM renderer | Oui | Aucun |

**Note :** React 19 + Next.js 15 sont les versions les plus récentes. Certains packages tiers peuvent ne pas encore être compatibles React 19.

---

### UI & Design System

| Package | Version | Usage | Critique | Problème |
|---------|---------|-------|---------|---------|
| `@radix-ui/react-accordion` | ^1.2.12 | Accordéon FAQ | Oui | Aucun |
| `@radix-ui/react-avatar` | ^1.1.10 | Avatar entreprise | Non | Aucun |
| `@radix-ui/react-checkbox` | ^1.3.3 | Filtres | Oui | Aucun |
| `@radix-ui/react-dropdown-menu` | ^2.1.16 | Menus | Non | Aucun |
| `@radix-ui/react-label` | ^2.1.7 | Labels form | Oui | Aucun |
| `@radix-ui/react-select` | ^2.2.6 | Selects | Oui | Aucun |
| `@radix-ui/react-slot` | ^1.2.3 | Composition | Oui | Aucun |
| `@radix-ui/react-switch` | ^1.2.6 | Toggle | Non | Aucun |
| `@radix-ui/react-toast` | ^1.2.15 | Notifications | Oui | Aucun |
| `class-variance-authority` | ^0.7.1 | Variants CSS | Oui | Aucun |
| `clsx` | ^2.1.1 | Classes cond. | Oui | Aucun |
| `tailwind-merge` | ^3.3.1 | Merge Tailwind | Oui | Aucun |
| `lucide-react` | ^0.542.0 | Icônes | Oui | Aucun |
| `tailwindcss-animate` | ^1.0.7 | Animations | Non | Peut être inliné |

---

### Fonts

| Package | Version | Usage | Critique | Problème |
|---------|---------|-------|---------|---------|
| `geist` | ^1.4.2 | Font Geist | Oui | OK (next/font compatible) |
| `@fontsource/ibm-plex-serif` | ^5.2.6 | Font titres | Oui | ⚠️ Non optimisé (voir rapport UI) |
| `@fontsource/inter` | ^5.2.6 | Font corps | Oui | ⚠️ Non optimisé |

**Action :** Migrer vers `next/font/google` et supprimer `@fontsource/*`.

---

### Backend / Data

| Package | Version | Usage | Critique | Problème |
|---------|---------|-------|---------|---------|
| `airtable` | ^0.12.2 | SDK Airtable | Oui | ⚠️ Non compatible Edge runtime |
| `axios` | ^1.11.0 | HTTP client | Oui* | ⚠️ Utilisé uniquement dans encharge.ts — remplaçable par fetch |
| `node-fetch` | ^3.3.2 | HTTP fetch polyfill | Non | ❌ Inutile (Next.js 15 = fetch global natif) |
| `dotenv` | ^17.2.1 | Env variables | Non | ❌ Inutile (Next.js charge .env automatiquement) |

**Packages à supprimer :** `node-fetch`, `dotenv`
**Package à remplacer :** `axios` → `fetch` natif dans `encharge.ts`

---

### Email

| Package | Version | Usage | Critique | Problème |
|---------|---------|-------|---------|---------|
| (via axios) | — | HTTP vers Encharge | Oui | À migrer vers fetch |

---

### Markdown & Contenu

| Package | Version | Usage | Critique | Problème |
|---------|---------|-------|---------|---------|
| `react-markdown` | ^10.1.0 | Rendu descriptions | Oui | ⚠️ ~80KB — à lazy-loader |
| `remark-breaks` | ^4.0.0 | Plugin remark | Oui | Dépendance de react-markdown |
| `remark-gfm` | ^4.0.1 | GitHub Flavored MD | Oui | Dépendance de react-markdown |
| `remark-parse` | ^11.0.0 | Parser markdown | Oui | Pour normalizeMarkdown() |
| `remark-stringify` | ^11.0.0 | Sérialiser markdown | Oui | Pour normalizeMarkdown() |
| `unified` | ^11.0.5 | Pipeline markdown | Oui | Requis par remark |

**Note :** La chaîne `remark-parse → unified → remark-stringify` dans `normalizeMarkdown()` est lourde pour une simple normalisation. Vérifier si une regex simple suffirait.

---

### SEO & Feeds

| Package | Version | Usage | Critique | Problème |
|---------|---------|-------|---------|---------|
| `schema-dts` | ^1.1.5 | Types Schema.org | Oui | Excellent choix |
| `feed` | ^5.1.0 | Génération RSS/Atom/JSON | Oui | Aucun |

---

### État & Routing

| Package | Version | Usage | Critique | Problème |
|---------|---------|-------|---------|---------|
| `nuqs` | ^2.5.2 | URL State management | Oui | Excellent choix pour Next.js |

---

### Utilitaires

| Package | Version | Usage | Critique | Problème |
|---------|---------|-------|---------|---------|
| `date-fns` | ^4.1.0 | Formatage dates | Oui | ⚠️ ~30KB — vérifier si toutes les fonctions sont utilisées |

---

## Dépendances de développement

| Package | Version | Usage | Problème |
|---------|---------|-------|---------|
| `@biomejs/biome` | 2.2.2 | Linter/Formatter | Aucun |
| `@tailwindcss/forms` | ^0.5.10 | Plugin forms | Aucun |
| `@tailwindcss/typography` | ^0.5.16 | Plugin prose | Aucun |
| `@types/airtable` | ^0.10.5 | Types Airtable | Aucun |
| `@types/node` | ^22.18.0 | Types Node.js | Aucun |
| `@types/react` | ^19.1.12 | Types React | Aucun |
| `@types/react-dom` | ^19.1.9 | Types ReactDOM | Aucun |
| `autoprefixer` | ^10.4.21 | CSS vendor prefixes | Aucun |
| `postcss` | ^8.5.6 | CSS processing | Aucun |
| `tailwindcss` | ^3.4.17 | CSS framework | Aucun |
| `typescript` | 5.9.3 | Type checking | Aucun |
| `ultracite` | ^5.2.17 | Wrapper Biome | Voir note |

**Note sur `ultracite` :** C'est un wrapper autour de Biome avec des règles pré-configurées. Peu documenté publiquement. Si des problèmes surviennent, envisager d'utiliser Biome directement.

---

## Dépendances manquantes (recommandées)

### Sécurité & Robustesse
```bash
bun add zod                              # Validation de schéma
bun add @upstash/ratelimit @upstash/redis  # Rate limiting distribué
```

### Tests
```bash
bun add -D vitest @vitejs/plugin-react
bun add -D @testing-library/react @testing-library/user-event
bun add -D jsdom
bun add -D playwright  # Tests e2e (optionnel pour l'instant)
```

### Monitoring
```bash
bun add @sentry/nextjs   # Error tracking
```

### Futur SaaS
```bash
bun add next-auth@beta @auth/prisma-adapter  # Auth
bun add @prisma/client                        # ORM
bun add -D prisma                             # CLI Prisma
bun add stripe                               # Paiements
```

---

## Matrice des risques de dépendances

| Risque | Package(s) | Niveau | Mitigation |
|--------|----------|--------|-----------|
| Incompatibilité React 19 | Radix UI, nuqs | Faible | Toutes sont compatibles React 19 |
| EOL / abandon | `node-fetch`, `dotenv` | Moyen | Supprimer (inutiles) |
| Lock-in fournisseur | `airtable` SDK | Haut | Plan de migration PostgreSQL |
| Taille bundle | `react-markdown`, `date-fns` | Moyen | Tree-shaking, lazy loading |
| Non-compatible Edge | `airtable` SDK | Haut | Utiliser fetch() directement dans les Edge routes |
| Sécurité dépendances | Toutes | Variable | Lancer `bun audit` régulièrement |

---

## Audit de sécurité des dépendances

```bash
# Commande à lancer
bun audit

# Résultats attendus (estimés)
# airtable@0.12.2 : Vérifier les CVEs connues
# axios@1.11.0 : Vérifier les CVEs (historique de vulnérabilités SSRF)
```

**Recommandation :** Configurer Dependabot ou Renovate Bot pour les mises à jour automatiques :

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      radix-ui:
        patterns: ["@radix-ui/*"]
      next-ecosystem:
        patterns: ["next", "react", "react-dom"]
```

---

## Résumé des actions

| Action | Priorité | Effort |
|--------|---------|--------|
| Supprimer `node-fetch` | P1 | 15min |
| Supprimer `dotenv` | P1 | 15min |
| Remplacer `axios` par `fetch` | P1 | 1h |
| Migrer `@fontsource` vers `next/font` | P1 | 2h |
| Ajouter `zod` | P1 | Dépend validation |
| Ajouter `@upstash/ratelimit` | P1 | 2h |
| Ajouter `vitest` | P2 | 1h setup |
| Configurer Dependabot | P2 | 30min |
| Ajouter `@sentry/nextjs` | P2 | 2h |
| Lancer `bun audit` | P1 | 5min |
