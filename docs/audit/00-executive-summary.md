# Rapport d'Audit — Résumé Exécutif

**Projet :** Ebarka-Jobs (basé sur Bordful v0.1.0)
**Date d'audit :** 20 mai 2026
**Auditeur :** Architecte Senior Next.js

## Stack technologique cible (décision validée)

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Frontend | Next.js 14 App Router | SSR/SSG, SEO, routing |
| Styling | Tailwind CSS + shadcn/ui | Design system cohérent |
| Backend | Next.js API Routes | API REST sécurisée |
| Base de données | PostgreSQL + Prisma ORM | Typage fort, migrations |
| Auth | NextAuth.js v5 + JWT | Sessions sécurisées |
| IA / LLM | Claude API (Anthropic) | Génération CV & lettres |
| Fichiers | Cloudinary | Upload PDF, images |
| Emails | Resend + React Email | Templates HTML modernes |
| Hébergement | Vercel + Supabase | Scalabilité, backups auto |
| Monitoring | Sentry + Vercel Analytics | Erreurs & performance |

> **Note :** Le codebase actuel utilise Next.js **15.5**. La spec cible est Next.js **14**. Les deux utilisent l'App Router — migrer vers 14 est régressif. Recommandation : rester sur **Next.js 15** qui est stable et supérieur. À confirmer avec l'équipe.

---

**Stack actuelle (codebase hérité) :** Next.js 15.5 · React 19 · TypeScript 5.9 · Airtable · Tailwind CSS 3.4

---

## Vue d'ensemble

Ebarka-Jobs est un **tableau d'offres d'emploi statique** construit sur le template open-source Bordful. L'application utilise Next.js 15 avec App Router, génère des pages statiques via ISR (Incremental Static Regeneration) et s'appuie sur Airtable comme backend no-code. Le filtrage, la recherche et la pagination sont entièrement côté client.

C'est un produit **prêt pour un lancement MVP**, avec une architecture de contenu solide et une excellente optimisation SEO. Cependant, plusieurs lacunes structurelles doivent être résolues avant une mise à l'échelle SaaS.

---

## Score de maturité par dimension

| Dimension | Score | Commentaire |
|-----------|-------|-------------|
| Architecture globale | 7/10 | App Router bien utilisé, ISR correct |
| Sécurité | 4/10 | Pas d'auth, rate limiter non-distribué |
| Base de données | 5/10 | Airtable — plafond de scalabilité évident |
| API | 6/10 | Routes minimales, pas de versioning |
| UI/UX | 8/10 | Composants Radix, design accessible |
| Gestion d'état | 7/10 | nuqs correct, mais filtrage 100% client |
| Performances | 6/10 | ISR bien configuré, filtrage non optimisé |
| Qualité du code | 5/10 | `ignoreBuildErrors: true` = dette majeure |
| Tests | 0/10 | Aucun test dans le projet |
| Déploiement | 4/10 | Aucune config Vercel/Docker formelle |

**Score global : 5.2/10 — Prototype fonctionnel, non prêt pour SaaS multi-tenant**

---

## Risques critiques (à traiter immédiatement)

| # | Risque | Gravité | Effort |
|---|--------|---------|--------|
| R1 | `typescript.ignoreBuildErrors: true` — erreurs de type silencieuses en prod | CRITIQUE | 1 jour |
| R2 | Rate limiter en mémoire — contournable, inefficace en serverless | HAUT | 2 jours |
| R3 | Aucun système d'authentification — pas de dashboard admin | HAUT | 1 semaine |
| R4 | Airtable comme seul backend — limite à ~100k records, coût élevé | HAUT | 2 semaines |
| R5 | Filtrage 100% client-side — impraticable au-delà de 500 offres | MOYEN | 1 semaine |
| R6 | Aucun test (unitaire, intégration, e2e) | MOYEN | continu |
| R7 | Données sensibles Airtable accessibles sans auth côté serveur | MOYEN | 3 jours |
| R8 | `apply_url` non validé — risque de redirect malveillant | MOYEN | 1 jour |

---

## Forces identifiées

- Configuration centralisée de 1400+ lignes — flexibilité maximale
- SEO de classe production (sitemaps, structured data, OG images dynamiques)
- Support multi-langues (180+) et multi-devises (60+)
- Architecture d'emails extensible et découplée
- Composants Radix UI — accessibilité native
- Feeds RSS/Atom/JSON — distribution de contenu prête à l'emploi
- Turbopack pour le développement — builds rapides

---

## Priorités de transformation (vers plateforme SaaS)

```
Phase 1 (0-4 semaines)  → Stabilisation : corriger les risques critiques
Phase 2 (1-3 mois)      → Migration BDD : Airtable → PostgreSQL (Prisma)
Phase 3 (3-6 mois)      → Auth & multi-tenant : NextAuth + dashboard employeur
Phase 4 (6-12 mois)     → Monétisation : Stripe + plans + analytics
```

---

## Documents de référence

| Fichier | Contenu |
|---------|---------|
| [01-architecture-overview.md](./01-architecture-overview.md) | Architecture complète |
| [02-security-audit.md](./02-security-audit.md) | Analyse de sécurité |
| [03-database-analysis.md](./03-database-analysis.md) | Couche données |
| [04-api-architecture.md](./04-api-architecture.md) | Routes API |
| [05-ui-system.md](./05-ui-system.md) | Système UI |
| [06-state-management.md](./06-state-management.md) | Gestion d'état |
| [07-deployment-config.md](./07-deployment-config.md) | Déploiement |
| [08-code-quality.md](./08-code-quality.md) | Qualité & mauvaises pratiques |
| [09-performance-analysis.md](./09-performance-analysis.md) | Performances |
| [10-reusable-components.md](./10-reusable-components.md) | Composants réutilisables |
| [11-refactoring-plan.md](./11-refactoring-plan.md) | Plan de refactorisation |
| [12-dependency-analysis.md](./12-dependency-analysis.md) | Analyse des dépendances |
| [13-feature-mapping.md](./13-feature-mapping.md) | Cartographie des fonctionnalités |
| [14-architecture-diagrams.md](./14-architecture-diagrams.md) | Diagrammes d'architecture |
