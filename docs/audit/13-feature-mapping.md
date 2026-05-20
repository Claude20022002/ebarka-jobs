# Cartographie des Fonctionnalités

## 1. Fonctionnalités existantes

### 1.1 Découverte d'emplois

| Fonctionnalité | Statut | Page(s) | Qualité |
|---------------|--------|---------|---------|
| Liste des offres | ✅ Implémenté | `/` | Bonne |
| Recherche textuelle | ✅ Implémenté | `/` | Bonne (debounce) |
| Filtre par type d'emploi | ✅ Implémenté | `/` | Bonne |
| Filtre par niveau de carrière | ✅ Implémenté | `/` | Bonne |
| Filtre remote/présentiel | ✅ Implémenté | `/` | Bonne |
| Filtre par fourchette salariale | ✅ Implémenté | `/` | Partielle |
| Filtre par visa sponsorship | ✅ Implémenté | `/` | Bonne |
| Filtre par langue | ✅ Implémenté | `/` | Bonne |
| Tri (récent/ancien/salaire) | ✅ Implémenté | `/` | Bonne |
| Pagination | ✅ Implémenté | `/` | Bonne |
| Résultats par page (5-100) | ✅ Implémenté | `/` | Bonne |
| Page de détail d'une offre | ✅ Implémenté | `/jobs/[slug]` | Très bonne |
| Jobs similaires | ✅ Implémenté | `/jobs/[slug]` | Bonne |
| Offres par type | ✅ Implémenté | `/jobs/type/[type]` | Bonne |
| Offres par niveau | ✅ Implémenté | `/jobs/level/[level]` | Bonne |
| Offres par localisation | ✅ Implémenté | `/jobs/location/[location]` | Bonne |
| Offres par langue | ✅ Implémenté | `/jobs/language/[language]` | Bonne |
| Annuaire des types | ✅ Implémenté | `/jobs/types` | Bonne |
| Annuaire des niveaux | ✅ Implémenté | `/jobs/levels` | Bonne |
| Annuaire des localisations | ✅ Implémenté | `/jobs/locations` | Bonne |
| Annuaire des langues | ✅ Implémenté | `/jobs/languages` | Bonne |

### 1.2 SEO & Indexation

| Fonctionnalité | Statut | Qualité |
|---------------|--------|---------|
| Génération de sitemap.xml | ✅ Dynamique (ISR 5min) | Très bonne |
| robots.txt dynamique | ✅ Implémenté | Bonne |
| Open Graph images génériques | ✅ Edge runtime | Bonne |
| Open Graph images par job | ✅ Edge runtime | Bonne |
| Schema.org JobPosting | ✅ JSON-LD | Très bonne |
| Schema.org BreadcrumbList | ✅ JSON-LD | Bonne |
| Schema.org WebSite | ✅ JSON-LD | Bonne |
| Schema.org Organization | ✅ JSON-LD | Bonne |
| Métadonnées dynamiques | ✅ Par page | Très bonne |
| Twitter Cards | ✅ Configurable | Bonne |
| Canonical URLs | ✅ Implémenté | Bonne |
| Hreflang | ✅ en + x-default | Partielle |

### 1.3 Distribution de contenu

| Fonctionnalité | Statut | Qualité |
|---------------|--------|---------|
| RSS 2.0 | ✅ `/feed.xml` | Bonne |
| Atom 1.0 | ✅ `/atom.xml` | Bonne |
| JSON Feed 1.1 | ✅ `/feed.json` | Bonne |

### 1.4 Engagement utilisateur

| Fonctionnalité | Statut | Qualité |
|---------------|--------|---------|
| Alertes email (inscription) | ✅ Via Encharge | Bonne |
| Formulaire de contact | ✅ Page statique | Basique |
| FAQ avec accordéon | ✅ Configurable | Bonne |

### 1.5 Marketing & Monétisation

| Fonctionnalité | Statut | Qualité |
|---------------|--------|---------|
| Page Pricing | ✅ 3 plans statiques | Basique |
| CTA "Poster une offre" | ✅ Banner configurable | Bonne |
| Liens vers Stripe (externes) | ✅ Configuré | Basique |
| Changelog | ✅ Page statique | Basique |

### 1.6 Pages institutionnelles

| Fonctionnalité | Statut | Qualité |
|---------------|--------|---------|
| À propos | ✅ Configurable | Bonne |
| Contact | ✅ Configurable | Bonne |
| Privacy Policy | ✅ Statique | Basique |
| Terms of Service | ✅ Statique | Basique |

### 1.7 Configuration & Personnalisation

| Fonctionnalité | Statut | Qualité |
|---------------|--------|---------|
| Configuration centralisée 1400 lignes | ✅ config.ts | Très bonne |
| Support 180+ langues | ✅ Constantes | Très bonne |
| Support 60+ devises + crypto | ✅ Constantes | Très bonne |
| 18 niveaux de carrière | ✅ Enum | Très bonne |
| Thème configurable | ✅ Via config | Bonne |
| Fonts configurables (3 options) | ✅ Via config | Bonne |
| Navigation configurable | ✅ Via config | Bonne |
| Footer multi-colonnes configurable | ✅ Via config | Très bonne |
| Scripts analytics injectables | ✅ Via config | Bonne |

---

## 2. Fonctionnalités manquantes (vs plateforme SaaS complète)

### 2.1 CRITIQUE — Bloquantes pour un SaaS

| Fonctionnalité | Priorité | Effort | Valeur |
|---------------|---------|--------|--------|
| Authentification employeur | P0 | 1 sem | ⭐⭐⭐⭐⭐ |
| Dashboard employeur | P0 | 3 sem | ⭐⭐⭐⭐⭐ |
| Soumission d'offre (UI) | P0 | 2 sem | ⭐⭐⭐⭐⭐ |
| Paiement (Stripe integration) | P0 | 2 sem | ⭐⭐⭐⭐⭐ |
| Modération des offres | P0 | 1 sem | ⭐⭐⭐⭐ |

### 2.2 HAUTE IMPORTANCE — Core UX manquant

| Fonctionnalité | Priorité | Effort | Valeur |
|---------------|---------|--------|--------|
| Candidature directe (in-app) | P1 | 2 sem | ⭐⭐⭐⭐ |
| Profil candidat | P1 | 3 sem | ⭐⭐⭐⭐ |
| Sauvegarde d'offres | P1 | 1 sem | ⭐⭐⭐⭐ |
| Alertes email personnalisées | P1 | 1 sem | ⭐⭐⭐⭐ |
| Pagination côté serveur | P1 | 1 sem | ⭐⭐⭐⭐ |
| Recherche full-text côté serveur | P1 | 1 sem | ⭐⭐⭐⭐ |

### 2.3 MOYENNE IMPORTANCE — Différenciation

| Fonctionnalité | Priorité | Effort | Valeur |
|---------------|---------|--------|--------|
| Profil entreprise enrichi | P2 | 2 sem | ⭐⭐⭐ |
| Analytics employeur (vues, clics) | P2 | 1 sem | ⭐⭐⭐⭐ |
| API publique (pour agrégateurs) | P2 | 2 sem | ⭐⭐⭐ |
| Webhooks sortants | P2 | 1 sem | ⭐⭐⭐ |
| Multi-langue UI (i18n) | P2 | 3 sem | ⭐⭐⭐ |
| Dark mode | P2 | 1 sem | ⭐⭐ |
| Recommandations personnalisées | P2 | 2 sem | ⭐⭐⭐ |

### 2.4 FAIBLE IMPORTANCE — Nice to have

| Fonctionnalité | Priorité | Effort | Valeur |
|---------------|---------|--------|--------|
| Partage d'offre sur réseaux sociaux | P3 | 3 jours | ⭐⭐ |
| Recherche avancée (opérateurs booléens) | P3 | 1 sem | ⭐⭐ |
| Comparaison d'offres | P3 | 1 sem | ⭐ |
| Export PDF d'offre | P3 | 3 jours | ⭐ |
| CV Parsing | P3 | 3 sem | ⭐⭐ |
| Chatbot RH | P3 | 4 sem | ⭐⭐ |

---

## 3. Matrice de compétitivité vs plateformes existantes

| Fonctionnalité | Ebarka (actuel) | LinkedIn | Indeed | Welcome to the Jungle | JobBoard.io |
|---------------|----------------|---------|--------|----------------------|-------------|
| Liste d'offres | ✅ | ✅ | ✅ | ✅ | ✅ |
| Recherche | ✅ Client-side | ✅ Server | ✅ Server | ✅ Server | ✅ Server |
| Filtres avancés | ✅ | ✅ | ✅ | ✅ | ✅ |
| SEO optimisé | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| RSS Feeds | ✅ | ❌ | ✅ | ❌ | ✅ |
| Multi-devises | ✅ 60+ | ❌ | Partiel | ❌ | Partiel |
| 180+ langues filtre | ✅ | ❌ | ❌ | ❌ | ❌ |
| Auth candidat | ❌ | ✅ | ✅ | ✅ | ✅ |
| Dashboard employeur | ❌ | ✅ | ✅ | ✅ | ✅ |
| Analytics employeur | ❌ | ✅ | ✅ | ✅ | ✅ |
| Candidature in-app | ❌ | ✅ | ✅ | ✅ | ✅ |
| Profil candidat | ❌ | ✅ | ✅ | ✅ | ❌ |
| Paiements intégrés | ❌ (lien externe) | ✅ | ✅ | ✅ | ✅ |

**Avantage compétitif d'Ebarka :**
- SEO excellent (best-in-class pour un job board small/mid)
- Multi-devises et multi-langues dépassant la concurrence
- Performance ISR + Edge

**Retard à combler :**
- Dashboard employeur complet
- Flux candidat (login, profil, candidature)
- Paiements natifs

---

## 4. Roadmap fonctionnelle recommandée

### MVP SaaS (3 mois)
```
✅ Déjà en place :
  - Listing + filtres + pagination
  - SEO + structured data
  - RSS feeds
  - Job alerts (Encharge)

🚧 À ajouter pour le MVP SaaS :
  - Authentification employeur (NextAuth)
  - Formulaire de soumission d'offre
  - Dashboard employeur basique
  - Stripe checkout (paiement à l'offre)
  - Base de données PostgreSQL
```

### V1 Complète (6 mois)
```
🔜 V1 :
  - Profil entreprise enrichi
  - Analytics de base (vues, clics)
  - Plans d'abonnement (Stripe Subscriptions)
  - Modération admin
  - Alertes email personnalisées par filtre
```

### V2 Croissance (12 mois)
```
🔮 V2 :
  - Profil candidat + CV
  - Candidature in-app
  - Recommandations ML
  - API publique
  - i18n UI (FR/EN minimum)
  - White-label pour revendeurs
```
