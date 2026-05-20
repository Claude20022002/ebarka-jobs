# Système UI — Analyse Complète

## Stack technologique UI

```
Tailwind CSS 3.4
    ├── @tailwindcss/typography   (rendu Markdown)
    ├── @tailwindcss/forms        (styles de formulaires)
    └── tailwindcss-animate       (animations CSS)

Radix UI Primitives (accessibilité WAI-ARIA)
    ├── @radix-ui/react-accordion
    ├── @radix-ui/react-avatar
    ├── @radix-ui/react-checkbox
    ├── @radix-ui/react-dropdown-menu
    ├── @radix-ui/react-label
    ├── @radix-ui/react-select
    ├── @radix-ui/react-slot
    ├── @radix-ui/react-switch
    └── @radix-ui/react-toast

shadcn/ui (composants pré-stylisés sur Radix)
    └── Installés dans components/ui/

Utilitaires
    ├── class-variance-authority  (CVA — variants de composants)
    ├── clsx                      (classes conditionnelles)
    ├── tailwind-merge            (merge propre de classes Tailwind)
    └── lucide-react              (icônes SVG)
```

---

## Inventaire complet des composants

### Design System (`components/ui/`)

| Composant | Type | Source | État |
|-----------|------|--------|------|
| `accordion.tsx` | shadcn/ui | Radix Accordion | Actif |
| `avatar.tsx` | shadcn/ui | Radix Avatar | Actif |
| `badge.tsx` | shadcn/ui | Custom | Actif |
| `breadcrumb.tsx` | shadcn/ui | Custom | Actif |
| `button.tsx` | shadcn/ui | CVA | Actif |
| `card.tsx` | shadcn/ui | Custom | Actif |
| `checkbox.tsx` | shadcn/ui | Radix Checkbox | Actif |
| `dropdown-menu.tsx` | shadcn/ui | Radix Dropdown | Actif |
| `input.tsx` | shadcn/ui | Custom | Actif |
| `label.tsx` | shadcn/ui | Radix Label | Actif |
| `select.tsx` | shadcn/ui | Radix Select | Actif |
| `switch.tsx` | shadcn/ui | Radix Switch | Actif |
| `toast.tsx` | shadcn/ui | Radix Toast | Actif |
| `toaster.tsx` | Custom | use-toast hook | Actif |

### Composants Métier (`components/ui/` — métier)

| Composant | Rôle | Complexité |
|-----------|------|------------|
| `nav.tsx` | Navigation principale + mobile | Haute |
| `footer.tsx` | Footer multi-colonnes configurable | Haute |
| `hero-section.tsx` | Hero avec image/gradient configurable | Moyenne |
| `job-filters.tsx` | Filtres multi-critères | Haute |
| `job-search-input.tsx` | Recherche avec debounce | Moyenne |
| `job-badge.tsx` | Badge statut d'emploi | Faible |
| `job-details-sidebar.tsx` | Sidebar détail job | Haute |
| `pagination.tsx` | Pagination de base | Faible |
| `pagination-control.tsx` | Contrôle avancé pagination | Moyenne |
| `jobs-per-page-select.tsx` | Sélecteur de résultats/page | Faible |
| `sort-order-select.tsx` | Sélecteur de tri | Faible |
| `similar-jobs.tsx` | Section jobs similaires | Moyenne |
| `post-job-banner.tsx` | CTA "Poster une offre" | Faible |
| `faq-content.tsx` | Contenu FAQ avec Accordion | Moyenne |
| `collapsible-text.tsx` | Texte rétractable | Faible |
| `metadata-breadcrumb.tsx` | Breadcrumb composite | Faible |
| `server-breadcrumb.tsx` | Breadcrumb côté serveur | Faible |
| `client-breadcrumb.tsx` | Breadcrumb côté client | Faible |
| `website-schema.tsx` | Schema.org JSON-LD | Faible |
| `about-schema.tsx` | Schema.org Organization | Faible |
| `contact-schema.tsx` | Schema.org ContactPage | Faible |
| `job-schema.tsx` | Schema.org JobPosting | Haute |

### Composants de Domaine

| Composant | Dossier | Rôle |
|-----------|---------|------|
| `HomePage.tsx` | `components/home/` | Page d'accueil complète |
| `JobCard.tsx` | `components/jobs/` | Carte d'emploi standard |
| `CompactJobCard.tsx` | `components/jobs/` | Carte compacte |
| `JobCardList.tsx` | `components/jobs/` | Liste de cartes standard |
| `CompactJobCardList.tsx` | `components/jobs/` | Liste compacte |
| `JobListings.tsx` | `components/jobs/` | Conteneur de liste |
| `JobSearch.tsx` | `components/jobs/` | **DEPRECATED** |
| `JobsLayout.tsx` | `components/jobs/` | Layout pages emplois |
| `ContactInfoSection.tsx` | `components/contact/` | Section infos contact |
| `SupportChannelCard.tsx` | `components/contact/` | Carte canal support |
| `JobAlertsForm.tsx` | `components/job-alerts/` | Formulaire d'abonnement |

---

## Problèmes détectés dans le système UI

### 1. Code mort : `JobSearch.tsx` (DEPRECATED)

```typescript
// components/jobs/JobSearch.tsx
// DEPRECATED : Ce composant est marqué comme obsolète
// Le remplaçant est components/ui/job-search-input.tsx
```

**Action :** Supprimer `JobSearch.tsx` après vérification qu'il n'est plus importé.

### 2. Mélange de responsabilités dans `components/ui/`

Ce dossier contient à la fois :
- Les composants du design system pur (button, input, badge, card...)
- Des composants métier complexes (job-filters, nav, footer, job-details-sidebar...)

**Recommandation :** Séparer en deux couches :
```
components/
├── ui/           # Design system pur (primitives sans logique métier)
│   ├── button.tsx
│   ├── input.tsx
│   ├── badge.tsx
│   └── ...
├── layouts/      # Layouts réutilisables
│   ├── nav.tsx
│   └── footer.tsx
├── features/     # Composants avec logique métier
│   ├── job-filters/
│   ├── job-search/
│   └── job-alerts/
└── jobs/         # Composants spécifiques aux offres
    ├── JobCard.tsx
    └── ...
```

### 3. Triple breadcrumb sans justification claire

Trois composants de breadcrumb existent :
- `metadata-breadcrumb.tsx` — pour les métadonnées
- `server-breadcrumb.tsx` — rendu serveur
- `client-breadcrumb.tsx` — rendu client

**Problème :** La logique est dupliquée. Un seul composant avec un paramètre `mode` suffirait.

### 4. Typographie incohérente

```typescript
// Inter et IBM Plex Serif chargés via @fontsource (npm package)
import '@fontsource/inter/400.css';
import '@fontsource/ibm-plex-serif/400.css';

// Geist chargé via next/font (optimisé)
import { GeistSans } from 'geist/font/sans';
```

**Problème :** `@fontsource` ne bénéficie pas des optimisations de `next/font` :
- Pas de sous-ensemble de caractères automatique
- FOUT (Flash of Unstyled Text) possible
- Pas de self-hosting optimisé

**Recommandation :**
```typescript
// app/layout.tsx
import { Inter, IBM_Plex_Serif } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const ibmPlexSerif = IBM_Plex_Serif({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-serif'
});
```

### 5. Schema.org — composants trop couplés à la configuration

Les composants `job-schema.tsx`, `about-schema.tsx` lisent directement depuis `config`. Ils devraient recevoir leurs données en props pour être testables et réutilisables.

---

## Analyse de l'accessibilité

**Points forts :**
- Radix UI gère nativement ARIA roles, focus management, keyboard navigation
- Labels explicites sur tous les champs de formulaire
- Hierarchie sémantique HTML (h1, h2, h3...)
- Texte alternatif sur les images

**Lacunes :**
- Pas de `skip navigation` link
- Pas de `aria-live` pour les résultats de recherche (mise à jour dynamique)
- Les filtres multi-checkboxes pourraient bénéficier de `aria-describedby`
- Contraste de couleur non audité

---

## Analyse de la responsivité

**Breakpoints Tailwind (défaut) :**
```
sm: 640px  → Tablette portrait
md: 768px  → Tablette landscape
lg: 1024px → Desktop standard
xl: 1280px → Large desktop
```

**Container custom :**
```typescript
// tailwind.config.ts
container: {
  center: true,
  padding: '1rem',
  screens: { '2xl': '1100px' }
}
```

Le design mobile-first est présent sur les composants principaux.

---

## Système de couleurs et thème

**Configuration via `config/config.example.ts` :**
```typescript
ui: {
  colors: {
    primary: '#0f172a',       // Couleur principale
    background: '#ffffff',    // Fond
    foreground: '#0f172a',    // Texte
    // ...
  },
  // Gradient ou image de fond pour le hero
  hero: {
    background: 'gradient',   // 'gradient' | 'image' | 'solid'
    gradient: 'from-slate-50 to-blue-50',
  }
}
```

**Pas de CSS Variables dynamiques** — les couleurs sont des classes Tailwind statiques. Une migration vers CSS custom properties permettrait des thèmes dynamiques (dark mode, white-label, etc.).

---

## Recommandations UI prioritaires

| # | Recommandation | Effort | Impact |
|---|---------------|--------|--------|
| U1 | Migrer Inter/IBM Plex Serif vers `next/font` | 1h | Performance |
| U2 | Supprimer `JobSearch.tsx` (deprecated) | 30min | Code mort |
| U3 | Séparer design system / composants métier | 2 jours | Maintenabilité |
| U4 | Consolider les 3 breadcrumbs en 1 | 2h | DRY |
| U5 | Ajouter `aria-live` sur résultats de recherche | 1h | Accessibilité |
| U6 | Dark mode via CSS custom properties | 3 jours | UX |
| U7 | Error boundaries sur tous les composants critiques | 1 jour | Fiabilité |
| U8 | Loading skeletons pour les transitions ISR | 2 jours | UX |
