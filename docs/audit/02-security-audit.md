# Audit de Sécurité

## Résumé des risques

| ID | Vulnérabilité | Gravité | Exploitabilité | Priorité |
|----|--------------|---------|----------------|----------|
| S1 | Pas d'authentification admin | CRITIQUE | Facile | P0 |
| S2 | Rate limiter en mémoire (non-distribué) | HAUT | Moyen | P1 |
| S3 | `apply_url` non validé (open redirect potentiel) | HAUT | Facile | P1 |
| S4 | Token Airtable côté serveur uniquement — OK | INFO | N/A | — |
| S5 | `ignoreBuildErrors: true` masque les erreurs de type | HAUT | Interne | P1 |
| S6 | IP spoofing via `x-forwarded-for` | MOYEN | Moyen | P2 |
| S7 | Pas de CSP (Content Security Policy) | MOYEN | Difficile | P2 |
| S8 | Pas de CSRF protection | MOYEN | Moyen | P2 |
| S9 | Informations d'erreur exposées | MOYEN | Facile | P2 |
| S10 | Dépendances avec vulnérabilités potentielles | FAIBLE | Variable | P3 |

---

## Analyse détaillée

### S1 — Absence d'authentification (CRITIQUE)

**Fichiers concernés :** Aucun fichier d'auth présent

**Problème :**
Il n'existe aucun système d't authentification dans le projet. Toutes les pages sont publiques. La gestion des offres d'emploi se fait directement dans Airtable, ce qui signifie que :
- N'importe qui peut lire toutes les données (normal pour un job board)
- Mais personne ne peut gérer les offres via l'application elle-même
- Pas de dashboard employeur
- Pas de modération des offres

**Risque SaaS :** Impossible de lancer un produit multi-tenant sans auth.

**Recommandation :**
```typescript
// Implémenter NextAuth.js v5 (Auth.js)
// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/config";
export const { GET, POST } = NextAuth(authConfig);
```

---

### S2 — Rate Limiter en mémoire (HAUT)

**Fichier :** [app/api/subscribe/route.ts](../../app/api/subscribe/route.ts)

```typescript
// PROBLÈME : Cette Map est réinitialisée à chaque redémarrage du serveur
// Sur Vercel (serverless), chaque invocation est potentiellement une nouvelle instance
const rateLimitMap = new Map<string, RateLimitInfo>();
```

**Impact :**
- En serverless (Vercel), plusieurs instances parallèles existent — chaque instance a sa propre Map
- Un attaquant peut contourner la limite en variant légèrement sa requête entre instances
- Après un déploiement, tous les compteurs sont remis à zéro

**Recommandation :**
```typescript
// Option 1 : Upstash Redis (serverless-compatible)
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "60 m"),
});

// Option 2 : Vercel KV (même API Redis)
import { kv } from "@vercel/kv";
```

---

### S3 — Open Redirect via `apply_url` (HAUT)

**Fichier :** `lib/db/airtable.ts`, `app/jobs/[slug]/page.tsx`

```typescript
// Le champ apply_url est utilisé directement comme href sans validation
apply_url: fields.apply_url as string,
// Utilisé dans les composants : <a href={job.apply_url}>Postuler</a>
```

**Risque :** Un acteur malveillant pourrait insérer une URL de phishing dans Airtable.

**Recommandation :**
```typescript
// lib/utils/job-validation.ts — Ajouter validation d'URL
function validateApplyUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Dans airtable.server.ts — Normaliser l'URL
apply_url: validateApplyUrl(fields.apply_url as string) 
  ? fields.apply_url as string 
  : null,
```

---

### S5 — `ignoreBuildErrors: true` (HAUT)

**Fichier :** [next.config.ts](../../next.config.ts)

```typescript
typescript: {
  ignoreBuildErrors: true,  // ← DANGEREUX EN PRODUCTION
},
```

**Impact :**
- Les erreurs TypeScript ne bloquent pas le build de production
- Des types `any` implicites ou des erreurs de type sévères passent inaperçus
- Bugs potentiels qui seraient détectés à la compilation arrivent en runtime

**Recommandation :**
```typescript
// Supprimer complètement ce bloc ou le limiter au dev
typescript: {
  // Ne jamais utiliser ignoreBuildErrors: true en production
  // Corriger les erreurs de type plutôt que de les masquer
},
```

---

### S6 — IP Spoofing via x-forwarded-for (MOYEN)

**Fichier :** [app/api/subscribe/route.ts](../../app/api/subscribe/route.ts)

```typescript
const clientIp =
  request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
  request.headers.get('x-real-ip') ||
  (process.env.NODE_ENV === 'development' ? '203.0.113.1' : 'unknown');
```

**Problème :** `x-forwarded-for` peut être forgé par le client si le reverse proxy ne le vérifie pas.

**Recommandation :**
Sur Vercel, utiliser `request.headers.get('x-vercel-ip-country')` ou confier la gestion IP à Upstash Redis (qui gère l'IP de manière fiable côté Vercel).

---

### S7 — Absence de Content Security Policy (MOYEN)

**Fichier :** [next.config.ts](../../next.config.ts)

Les headers actuels contiennent uniquement `X-Robots-Tag`. Il manque :

```typescript
// À ajouter dans next.config.ts
{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
},
{
  key: 'X-Frame-Options',
  value: 'DENY'
},
{
  key: 'X-Content-Type-Options',
  value: 'nosniff'
},
{
  key: 'Referrer-Policy',
  value: 'strict-origin-when-cross-origin'
},
{
  key: 'Permissions-Policy',
  value: 'camera=(), microphone=(), geolocation=()'
},
```

---

### S8 — Absence de protection CSRF (MOYEN)

**Fichier :** [app/api/subscribe/route.ts](../../app/api/subscribe/route.ts)

Le endpoint POST `/api/subscribe` n'a pas de validation CSRF. Bien que le formulaire utilise `Content-Type: application/json` (protection partielle), il n'y a pas de token CSRF explicite.

**Recommandation :** Utiliser `origin` et `referer` headers pour valider que les requêtes proviennent du même domaine, ou implémenter un token CSRF avec `iron-session`.

---

### S9 — Exposition d'erreurs internes (MOYEN)

**Fichier :** [app/api/subscribe/route.ts](../../app/api/subscribe/route.ts)

```typescript
catch (error) {
  const errorMessage =
    error instanceof Error ? error.message : 'Unknown error';
  
  return NextResponse.json(
    { error: errorMessage },  // ← Expose le message d'erreur interne
    { status: 500 }
  );
}
```

**Risque :** Des messages d'erreur techniques (clés API, URLs Airtable, stack traces) peuvent être exposés.

**Recommandation :**
```typescript
catch (error) {
  console.error('Subscribe error:', error); // Log interne seulement
  return NextResponse.json(
    { error: 'An internal error occurred. Please try again.' },
    { status: 500 }
  );
}
```

---

## Variables d'environnement — Analyse

| Variable | Exposition | Risque | Recommandation |
|----------|-----------|--------|----------------|
| `AIRTABLE_ACCESS_TOKEN` | Serveur uniquement | Faible (si bien configuré) | Vérifier que `NEXT_PUBLIC_` n'est pas utilisé |
| `AIRTABLE_BASE_ID` | Serveur uniquement | Faible | OK |
| `ENCHARGE_WRITE_KEY` | Serveur uniquement | Faible | OK |
| `NEXT_PUBLIC_APP_URL` | Client + Serveur | Info | Pas de donnée sensible — OK |

**Bonne pratique :** Aucune variable sensible n'est préfixée `NEXT_PUBLIC_`. C'est correct.

---

## Checklist de sécurité OWASP Top 10

| # | Vulnérabilité OWASP | Statut |
|---|---------------------|--------|
| A01 | Broken Access Control | ⚠️ Pas d'auth du tout |
| A02 | Cryptographic Failures | ✅ Pas de données sensibles cryptées nécessaires |
| A03 | Injection | ✅ Airtable SDK — pas de SQL injection |
| A04 | Insecure Design | ⚠️ Pas de modèle de menace documenté |
| A05 | Security Misconfiguration | ⚠️ CSP manquant, ignoreBuildErrors |
| A06 | Vulnerable Components | ⚠️ Aucun audit de dépendances automatisé |
| A07 | Auth & Session Failures | ❌ Auth absente |
| A08 | Software Integrity Failures | ✅ bun.lock présent |
| A09 | Logging & Monitoring Failures | ⚠️ Pas de logging structuré |
| A10 | SSRF | ✅ Pas d'appels d'URLs dynamiques depuis le serveur |
