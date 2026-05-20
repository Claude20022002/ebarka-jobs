# Architecture API

## Vue d'ensemble

L'application expose **8 endpoints** : 2 pour la génération d'images OG (Edge runtime), 1 pour les abonnements email, et 5 pour les feeds/sitemap/robots.

```
app/api/
├── og/
│   ├── route.tsx              [GET] Edge — Image OG générique
│   └── jobs/[slug]/route.tsx  [GET] Edge — Image OG par job
├── subscribe/route.ts         [POST] Node — Abonnement email
├── atom.xml/route.ts          [GET] Node — Feed Atom 1.0
├── feed.json/route.ts         [GET] Node — JSON Feed 1.1
└── feed.xml/route.ts          [GET] Node — RSS 2.0
```

---

## Analyse par endpoint

### 1. `GET /api/og` — Open Graph Image (Edge)

**Runtime :** Edge (Vercel)
**Rôle :** Génère dynamiquement une image PNG pour le partage social

**Paramètres :**
- `title` (query string, optionnel)
- `description` (query string, optionnel)

**Dépendances Edge :**
- Utilise `@vercel/og` ou API `ImageResponse` de Next.js
- Fonts chargés depuis assets publics
- Config `og-config.ts` pour les paramètres visuels

**Problèmes :**
- Dépendance implicite à Vercel Edge (pas de configuration d'alternative)
- Pas de cache-control explicite — dépend du cache Vercel par défaut
- Pas de validation des query params (XSS potentiel si le titre est rendu sans échappement)

---

### 2. `GET /api/og/jobs/[slug]` — Image OG par Job (Edge)

**Runtime :** Edge (Vercel)
**Rôle :** Génère une image OG spécifique à chaque offre d'emploi

**Problèmes :**
- Le `slug` dans l'URL est utilisé pour récupérer le job via Airtable — mais Airtable n'est pas disponible sur Edge runtime par défaut
- **Potentiel bug critique :** `airtable.server.ts` n'est pas compatible Edge (utilise Node.js APIs)
- Pas de fallback si le job n'est pas trouvé

---

### 3. `POST /api/subscribe` — Abonnement Email

**Runtime :** Node.js
**Rate limit :** 5 req / 60 min par IP
**Validation :** Email regex + name non-vide

**Flux complet :**
```
Client POST { name, email }
    → Vérification jobAlerts.enabled
    → Extraction IP (x-forwarded-for → x-real-ip → fallback)
    → Rate limiting (Map en mémoire)
    → Validation email (regex)
    → Validation name (non-vide)
    → emailProvider.subscribe()
        → Encharge HTTP POST
    → 200 OK { success: true }
```

**Problèmes détaillés :**

```typescript
// 1. Rate limiter non-distribué
const rateLimitMap = new Map<string, RateLimitInfo>();
// → Voir audit sécurité S2

// 2. Pas de sanitisation du nom
if (!name || name.trim() === '') { ... }
// → Un nom de 10,000 caractères passe

// 3. Exposition d'erreurs internes
return NextResponse.json({ error: errorMessage }, { status: 500 });
// → Peut exposer des messages internes Encharge/Airtable

// 4. Pas de validation de l'Origin
// → Requêtes cross-origin non restreintes
```

**Améliorations recommandées :**
```typescript
// Validation Zod
import { z } from 'zod';
const SubscribeSchema = z.object({
  name: z.string().min(1).max(100).trim(),
  email: z.string().email().max(320),
});

// Validation Origin
const allowedOrigins = [process.env.NEXT_PUBLIC_APP_URL];
if (!allowedOrigins.includes(request.headers.get('origin'))) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
```

---

### 4. `GET /feed.xml` — RSS 2.0

**Rôle :** Flux RSS des offres d'emploi actives
**Revalidation :** 5 minutes (ISR)
**Librairie :** `feed` (v5.1.0)

**Contenu d'un item RSS :**
```xml
<item>
  <title>Senior Developer at Acme Corp</title>
  <link>https://ebarka-jobs.com/jobs/senior-developer-at-acme-corp</link>
  <description>Premiers 500 chars de la description</description>
  <content:encoded>Description complète en HTML</content:encoded>
  <category>Full-time</category>
  <pubDate>2026-05-20T00:00:00.000Z</pubDate>
</item>
```

**Problèmes :**
- Description limitée à 500 chars hardcodé (devrait être configurable)
- Pas de filtre sur `valid_through` — les offres expirées apparaissent si encore `active`
- Pas d'image dans le feed (logo employeur absent)

---

### 5. Feeds Atom et JSON Feed

Similaires au RSS — même logique via `lib/utils/feed-utils.ts`.

---

## Endpoints manquants (requis pour une plateforme SaaS)

### API REST Jobs (CRUD)

```
GET    /api/v1/jobs              → Liste des jobs (paginée, server-side)
POST   /api/v1/jobs              → Créer une offre (auth requis)
GET    /api/v1/jobs/:id          → Détail d'une offre
PUT    /api/v1/jobs/:id          → Modifier une offre (auth requis)
DELETE /api/v1/jobs/:id          → Supprimer une offre (auth requis)
PATCH  /api/v1/jobs/:id/status   → Activer/désactiver (auth requis)
```

### API Employeurs

```
POST   /api/v1/employers         → Inscription employeur
GET    /api/v1/employers/:id     → Profil employeur
PUT    /api/v1/employers/:id     → Modifier profil
GET    /api/v1/employers/:id/jobs → Jobs de l'employeur
```

### API Paiements

```
POST   /api/v1/checkout          → Créer session Stripe
POST   /api/webhooks/stripe      → Webhook Stripe (paiements)
```

### API Webhooks

```
POST   /api/webhooks/airtable    → Sync depuis Airtable (si migration partielle)
```

---

## Versioning API

**État actuel :** Aucun versioning

**Recommandation :** Préfixer toutes les API routes avec `/api/v1/`

```
/api/v1/jobs
/api/v1/employers
/api/v1/auth
```

---

## Middlewares manquants

```typescript
// middleware.ts — actuellement vide ou absent
// Devrait contenir :

export function middleware(request: NextRequest) {
  // 1. Authentication check pour les routes /dashboard
  // 2. CORS pour les API routes
  // 3. Rate limiting global
  // 4. Logging des requêtes
  // 5. Redirection www → non-www
}
```

---

## Matrice des codes HTTP utilisés

| Code | Route | Usage actuel | Correct ? |
|------|-------|-------------|-----------|
| 200 | subscribe | Succès | ✅ |
| 400 | subscribe | Validation échouée | ✅ |
| 404 | subscribe | Feature désactivée | ⚠️ Devrait être 503 |
| 429 | subscribe | Rate limited | ✅ |
| 500 | subscribe | Erreur interne | ✅ mais message exposé |
| 200 | feeds | Feed généré | ✅ |
| 200 | og | Image générée | ✅ |
