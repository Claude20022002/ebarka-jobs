# Cartographie des Fonctionnalités — Stack cible

## 1. Fonctionnalités existantes (codebase actuel)

### Découverte d'emplois

| Fonctionnalité | Statut | Migration requise |
|---------------|--------|------------------|
| Liste des offres avec ISR | OK | Passer au filtrage SQL |
| Recherche textuelle (debounce) | OK | Passer à full-text PostgreSQL |
| Filtres multi-critères | OK | Passer côté serveur |
| Tri et pagination | OK | Passer côté serveur |
| Page détail d'une offre | OK | Remplacer source Airtable |
| Pages catégories (type/level/location/lang) | OK | Idem |
| Jobs similaires | OK | Requête SQL |

### SEO & Distribution

| Fonctionnalité | Statut | Action |
|---------------|--------|--------|
| Sitemap dynamique | OK | Conserver |
| Open Graph images (Edge) | OK | Conserver |
| Schema.org JobPosting | OK | Conserver |
| RSS / Atom / JSON Feed | OK | Conserver |
| robots.txt | OK | Conserver |

### Pages statiques

| Page | Statut | Action |
|------|--------|--------|
| À propos, Contact, FAQ | OK | Conserver |
| Privacy, Terms | OK | Conserver |
| Pricing | Partiel | Connecter à Stripe Phase 2 |
| Job Alerts (Encharge) | À remplacer | Migrer vers Resend |

---

## 2. Fonctionnalités à construire — Par phase

### Phase 1 — Infrastructure (fondation)

| Fonctionnalité | Route/Composant | Technologie |
|---------------|----------------|------------|
| Authentification Google | `/api/auth/[...nextauth]` | NextAuth v5 |
| Authentification email (magic link) | `/api/auth/[...nextauth]` | NextAuth v5 + Resend |
| Page login / register | `/auth/login` | NextAuth + shadcn |
| Alertes email redesign | `/api/v1/alerts` | Resend + React Email |
| Email de bienvenue | Background | React Email template |
| Rate limiting distribué | Middleware global | Upstash Redis |
| Monitoring erreurs | Auto (Sentry SDK) | Sentry |

---

### Phase 2 — Fonctionnalités core

#### Dashboard Employeur

| Fonctionnalité | Route | Description |
|---------------|-------|-------------|
| Vue d'ensemble stats | `/dashboard` | Vues, candidatures, offres actives |
| Liste de mes offres | `/dashboard/jobs` | CRUD complet |
| Créer une offre | `/dashboard/jobs/new` | Formulaire Zod-validé |
| Éditer une offre | `/dashboard/jobs/[id]/edit` | Même formulaire |
| Analytics d'une offre | `/dashboard/jobs/[id]/analytics` | Vues, clics, candidatures |
| Profil entreprise | `/dashboard/company` | Logo Cloudinary, description |
| Voir les candidatures | `/dashboard/jobs/[id]/applications` | Liste avec statuts |

#### Espace Candidat

| Fonctionnalité | Route | Description |
|---------------|-------|-------------|
| Profil candidat | `/profile` | Nom, photo, résumé |
| Mes documents | `/profile/documents` | CV, lettres, portfolios |
| Candidatures envoyées | `/profile/applications` | Historique + statuts |
| Offres sauvegardées | `/profile/saved-jobs` | Bookmark d'offres |
| Candidature in-app | `/jobs/[slug]/apply` | Formulaire + documents |

#### Upload Fichiers (Cloudinary)

| Fonctionnalité | API Route | Formats acceptés |
|---------------|----------|-----------------|
| Upload CV | `POST /api/v1/documents/upload` | PDF (max 10MB) |
| Upload photo profil | `POST /api/v1/documents/upload` | JPG, PNG (max 5MB) |
| Upload logo entreprise | `POST /api/v1/documents/upload` | JPG, PNG, SVG |
| Suppression document | `DELETE /api/v1/documents/[id]` | — |

#### Pagination et recherche côté serveur

```
AVANT (actuel)                 APRÈS (Phase 2)
───────────────────            ───────────────────────────
getJobs() → tous en RAM  →     getJobs(filters) → SQL paginé
filtrage JS client-side  →     WHERE clause PostgreSQL
nuqs → client state      →     searchParams → Server Component
```

---

### Phase 3 — Intelligence Artificielle (Claude API)

C'est la **fonctionnalité différenciante** d'Ebarka-Jobs vis-à-vis des concurrents.

#### Génération de Lettre de Motivation

| Étape | Description |
|-------|-------------|
| Entrée | CV du candidat (texte extrait du PDF) + description de l'offre |
| Traitement | Claude API — prompt structuré en français |
| Sortie | Lettre de motivation personnalisée (~300-400 mots) |
| Post-traitement | Éditeur de texte riche + export PDF via Cloudinary |

```
Route : POST /api/ai/generate-cover-letter
Auth  : Requis (candidat connecté)
Model : claude-sonnet-4-6
Limit : 10 générations/jour par utilisateur (Upstash)
```

#### Génération / Structuration de CV

| Étape | Description |
|-------|-------------|
| Entrée | CV brut (texte copié-collé ou PDF parsé) |
| Traitement | Claude API — extraction et structuration des informations |
| Sortie | CV structuré JSON + rendu HTML formaté |
| Export | PDF via Cloudinary ou impression navigateur |

```
Route : POST /api/ai/generate-cv
Auth  : Requis
Model : claude-sonnet-4-6
```

#### Aide à la rédaction d'offre (employeur)

| Étape | Description |
|-------|-------------|
| Entrée | Titre du poste + quelques mots-clés |
| Traitement | Claude génère une description complète et professionnelle |
| Sortie | Description pré-remplie dans le formulaire (éditable) |

```
Route : POST /api/ai/generate-job-description
Auth  : Requis (employeur)
Model : claude-haiku-4-5 (plus rapide, moins cher pour cette tâche)
```

#### Score d'adéquation offre/candidat (future V2)

```
Analyser CV + offre → Claude retourne un score 0-100
et une liste des points forts / points faibles du match
```

---

### Phase 3 — Paiements (Stripe)

| Fonctionnalité | Description |
|---------------|-------------|
| Checkout offre | Session Stripe pour publier une offre |
| Plans d'abonnement | Starter (gratuit), Pro (29€), Business (99€) |
| Webhook confirmation | Activer l'offre après paiement |
| Historique facturation | `/dashboard/billing` |
| Annulation / remboursement | Via Stripe Customer Portal |

#### Plans proposés

| Plan | Prix | Offres | Durée | Features |
|------|------|--------|-------|---------|
| Starter | Gratuit | 1 | 30 jours | Listing standard |
| Pro | 29€/offre | 5/mois | 60 jours | Featured, analytics, IA incluse |
| Business | 99€/mois | Illimité | 90 jours | API, branding, support prioritaire |

---

## 3. Templates Email (React Email + Resend)

| Template | Déclencheur | Destinataire |
|---------|-------------|-------------|
| `welcome.tsx` | Inscription | Candidat/Employeur |
| `job-alert.tsx` | Nouvelles offres correspondantes | Abonné |
| `application-received.tsx` | Nouvelle candidature | Employeur |
| `application-status.tsx` | Changement de statut | Candidat |
| `job-published.tsx` | Offre activée | Employeur |
| `magic-link.tsx` | Connexion email | Utilisateur |
| `invoice.tsx` | Paiement confirmé | Employeur |

---

## 4. Matrice de compétitivité — Stack cible

| Fonctionnalité | Ebarka cible | LinkedIn | Indeed | WTTJ |
|---------------|-------------|---------|--------|------|
| SEO optimisé | 5/5 | 3/5 | 4/5 | 4/5 |
| Génération LM par IA | 5/5 | 0/5 | 0/5 | 0/5 |
| Génération CV par IA | 5/5 | 2/5 | 0/5 | 0/5 |
| Dashboard employeur | 4/5 | 5/5 | 5/5 | 5/5 |
| Candidature in-app | 4/5 | 5/5 | 5/5 | 5/5 |
| Multi-devises (60+) | 5/5 | 2/5 | 2/5 | 2/5 |
| RSS Feeds | 5/5 | 0/5 | 3/5 | 0/5 |
| Performance (ISR+Edge) | 5/5 | 3/5 | 3/5 | 3/5 |

**Avantage concurrentiel clé :** L'intégration Claude API pour la génération de CV et lettres de motivation est absente chez tous les concurrents principaux — c'est le différenciateur principal d'Ebarka-Jobs.
