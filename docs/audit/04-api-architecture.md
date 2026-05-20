# Architecture API — Stack cible

## Vue d'ensemble

L'application expose des API routes Next.js organisées en trois catégories : API REST métier, routes d'intégration (IA, upload, email), et routes système (SEO, feeds).

```
app/api/
├── auth/
│   └── [...nextauth]/route.ts    NextAuth.js v5 handler
├── v1/
│   ├── jobs/
│   │   ├── route.ts              GET liste + POST création
│   │   └── [id]/
│   │       ├── route.ts          GET + PUT + DELETE
│   │       └── apply/route.ts    POST candidature in-app
│   ├── companies/
│   │   └── route.ts              GET + POST
│   ├── users/
│   │   ├── profile/route.ts      GET + PUT profil
│   │   ├── saved-jobs/route.ts   GET + POST sauvegarde
│   │   └── applications/route.ts GET candidatures
│   ├── documents/
│   │   ├── upload/route.ts       POST upload Cloudinary
│   │   └── [id]/route.ts         GET + DELETE
│   └── alerts/route.ts           POST abonnement alertes
├── ai/
│   ├── generate-cv/route.ts      POST génération CV Claude
│   └── generate-cover-letter/route.ts  POST lettre motivation
├── webhooks/
│   ├── stripe/route.ts           POST webhook paiement
│   └── resend/route.ts           POST webhook email (optionnel)
├── subscribe/route.ts            POST alerte email (legacy → /v1/alerts)
├── og/route.tsx                  GET image OG générique (Edge)
├── og/jobs/[slug]/route.tsx      GET image OG par job (Edge)
├── atom.xml/route.ts             GET feed Atom
├── feed.json/route.ts            GET JSON Feed
└── feed.xml/route.ts             GET RSS 2.0
```

---

## Routes métier (`/api/v1/`)

### `GET /api/v1/jobs` — Liste paginée côté serveur

```typescript
// Paramètres query string
interface JobsQueryParams {
  q?: string;          // Recherche full-text
  type?: string;       // full_time,part_time,contract,freelance
  level?: string;      // SENIOR,MID_LEVEL,...
  remote?: 'true';     // Filtre remote
  visa?: 'true';       // Visa sponsorship
  page?: number;       // Défaut: 1
  per_page?: number;   // Défaut: 25, max: 100
  sort?: 'newest' | 'oldest' | 'salary';
}

// Réponse
interface JobsResponse {
  data: Job[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    pages: number;
  };
}
```

**Avantage vs état actuel :** Le filtrage se fait en SQL (côté serveur) au lieu de tout charger en mémoire côté client.

---

### `POST /api/v1/jobs` — Créer une offre (auth requis)

```typescript
// Auth : session NextAuth (rôle EMPLOYER ou ADMIN)
// Validation : Zod schema

const CreateJobSchema = z.object({
  title: z.string().min(5).max(200),
  type: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP']),
  description: z.string().min(100).max(10000),
  salaryMin: z.number().positive().optional(),
  salaryMax: z.number().positive().optional(),
  salaryCurrency: z.string().length(3).default('EUR'),
  salaryUnit: z.enum(['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR', 'PROJECT']).optional(),
  workplaceType: z.enum(['ON_SITE', 'HYBRID', 'REMOTE', 'NOT_SPECIFIED']),
  workplaceCity: z.string().max(100).optional(),
  workplaceCountry: z.string().max(100).optional(),
  applyUrl: z.string().url().optional(),
  applyInApp: z.boolean().default(false),
  careerLevels: z.array(z.string()).min(1),
  languages: z.array(z.string().length(2)).optional(),
  validThrough: z.string().datetime().optional(),
});
```

---

### `POST /api/v1/jobs/[id]/apply` — Candidature in-app (auth requis)

```typescript
// Auth : session NextAuth (rôle USER/candidat)
// Corps
interface ApplyRequest {
  coverLetter?: string;   // Texte ou généré par Claude
  documentIds: string[];  // IDs des documents Cloudinary uploadés
  message?: string;       // Message optionnel à l'employeur
}

// Réponse
interface ApplyResponse {
  applicationId: string;
  status: 'PENDING';
}
```

---

## Routes IA (`/api/ai/`)

### `POST /api/ai/generate-cover-letter` — Claude API

```typescript
// Auth : session NextAuth requise
// Rate limit : 10 générations/jour par utilisateur

import Anthropic from '@anthropic-ai/sdk';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { jobId, cvText, language = 'fr' } = await request.json();

  // Récupérer la description du job
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { company: true },
  });

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  const client = new Anthropic();
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Tu es un expert en rédaction de lettres de motivation professionnelles.
      
Génère une lettre de motivation en ${language} pour ce candidat :

PROFIL DU CANDIDAT :
${cvText}

OFFRE D'EMPLOI :
Poste : ${job.title}
Entreprise : ${job.company.name}
Description : ${job.description.substring(0, 2000)}

La lettre doit être :
- Professionnelle et personnalisée
- Entre 250 et 400 mots
- Mettre en valeur l'adéquation profil/poste
- Avoir une structure : accroche, corps, conclusion`,
    }],
  });

  const generatedText = message.content[0].type === 'text'
    ? message.content[0].text
    : '';

  // Sauvegarder la génération pour analytics/audit
  await prisma.aiGeneration.create({
    data: {
      type: 'COVER_LETTER',
      prompt: `Job: ${job.id} | User: ${session.user.id}`,
      result: generatedText,
      model: 'claude-sonnet-4-6',
      tokens: message.usage.input_tokens + message.usage.output_tokens,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ text: generatedText });
}
```

### `POST /api/ai/generate-cv` — Structuration CV depuis PDF

```typescript
// Flux : PDF uploadé sur Cloudinary → texte extrait → Claude structure le CV
// Résultat : JSON structuré ou Markdown formaté prêt à l'affichage
```

---

## Routes upload (`/api/v1/documents/upload`)

### `POST /api/v1/documents/upload` — Upload Cloudinary

```typescript
import { v2 as cloudinary } from 'cloudinary';
import { getServerSession } from 'next-auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const type = formData.get('type') as string; // 'CV' | 'COVER_LETTER' | ...

  // Validation
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const result = await new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: `ebarka-jobs/${session.user.id}/documents`,
        resource_type: 'auto',
        allowed_formats: ['pdf', 'jpg', 'jpeg', 'png'],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  }) as any;

  // Sauvegarder la référence en BDD
  const document = await prisma.document.create({
    data: {
      type: type as any,
      name: file.name,
      cloudinaryId: result.public_id,
      url: result.secure_url,
      size: file.size,
      mimeType: file.type,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ document });
}
```

---

## Routes Auth (`/api/auth/`)

### `app/api/auth/[...nextauth]/route.ts`

```typescript
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/config';

export const { GET, POST } = NextAuth(authOptions);
```

### `lib/auth/config.ts`

```typescript
import { PrismaAdapter } from '@auth/prisma-adapter';
import GoogleProvider from 'next-auth/providers/google';
import ResendProvider from 'next-auth/providers/resend';
import { prisma } from '@/lib/db/prisma';

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ResendProvider({
      apiKey: process.env.RESEND_API_KEY!,
      from: process.env.EMAIL_FROM!,
    }),
  ],
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub,
        role: token.role,
        companyId: token.companyId,
      },
    }),
    jwt: ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.companyId = user.companyId;
      }
      return token;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
};
```

---

## Routes Webhooks

### `POST /api/webhooks/stripe` — Paiement confirmé

```typescript
// Vérification signature Stripe obligatoire
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body, sig, process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const jobId = session.metadata?.jobId;

    await prisma.job.update({
      where: { id: jobId },
      data: { status: 'ACTIVE' },
    });
    await prisma.payment.update({
      where: { stripeSessionId: session.id },
      data: { status: 'PAID', stripePaymentId: session.payment_intent as string },
    });
  }

  return NextResponse.json({ received: true });
}
```

---

## Middleware d'authentification

```typescript
// middleware.ts
import { auth } from '@/lib/auth/config';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isDashboard = req.nextUrl.pathname.startsWith('/dashboard');
  const isApiProtected = req.nextUrl.pathname.startsWith('/api/v1/jobs')
    && req.method !== 'GET';

  if ((isDashboard || isApiProtected) && !isLoggedIn) {
    return Response.redirect(new URL('/auth/login', req.nextUrl));
  }
});

export const config = {
  matcher: ['/dashboard/:path*', '/api/v1/:path*', '/api/ai/:path*'],
};
```

---

## Tableau des codes HTTP par route

| Route | Méthode | Auth | 200 | 201 | 400 | 401 | 403 | 404 | 429 | 500 |
|-------|---------|------|-----|-----|-----|-----|-----|-----|-----|-----|
| `/api/v1/jobs` | GET | Non | x | | x | | | | x | x |
| `/api/v1/jobs` | POST | Oui | | x | x | x | x | | x | x |
| `/api/v1/jobs/[id]` | GET | Non | x | | | | | x | | x |
| `/api/v1/jobs/[id]` | PUT | Oui | x | | x | x | x | x | | x |
| `/api/v1/jobs/[id]/apply` | POST | Oui | | x | x | x | | x | x | x |
| `/api/ai/generate-*` | POST | Oui | x | | x | x | | | x | x |
| `/api/v1/documents/upload` | POST | Oui | | x | x | x | | | x | x |
| `/api/webhooks/stripe` | POST | Sig | x | | x | | | | | x |
| `/api/subscribe` | POST | Non | x | | x | | | | x | x |
