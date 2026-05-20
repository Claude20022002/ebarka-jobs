import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

async function main() {
  console.log('🌱 Démarrage du seed...');

  // ── Nettoyage ──────────────────────────────────────────────────────────────
  await prisma.jobAlert.deleteMany();
  await prisma.aiGeneration.deleteMany();
  await prisma.applicationDocument.deleteMany();
  await prisma.application.deleteMany();
  await prisma.savedJob.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.jobCareerLevel.deleteMany();
  await prisma.jobLanguage.deleteMany();
  await prisma.job.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  console.log('🗑️  Base de données nettoyée');

  // ── Entreprises ────────────────────────────────────────────────────────────
  const acme = await prisma.company.create({
    data: {
      name: 'Acme Technologies',
      slug: 'acme-technologies',
      logo: null,
      website: 'https://acme-tech.example.com',
      description:
        'Acme Technologies est une startup SaaS spécialisée dans les outils de productivité pour les équipes distribuées. Fondée en 2018, nous comptons 120 collaborateurs répartis dans 15 pays.',
      industry: 'SaaS / Productivité',
      size: 'SMALL',
      location: 'Paris, France',
      verified: true,
    },
  });

  const nova = await prisma.company.create({
    data: {
      name: 'Nova Digital',
      slug: 'nova-digital',
      logo: null,
      website: 'https://nova-digital.example.com',
      description:
        'Agence digitale full-service basée à Lyon. Nous créons des expériences numériques exceptionnelles pour des marques ambitieuses.',
      industry: 'Agence digitale',
      size: 'STARTUP',
      location: 'Lyon, France',
      verified: true,
    },
  });

  const dataflow = await prisma.company.create({
    data: {
      name: 'DataFlow AI',
      slug: 'dataflow-ai',
      logo: null,
      website: 'https://dataflow-ai.example.com',
      description:
        'Leader européen de l\'analyse de données en temps réel. Notre plateforme traite plus de 10 milliards d\'événements par jour pour 500+ clients enterprise.',
      industry: 'Data / Intelligence Artificielle',
      size: 'MEDIUM',
      location: 'Bordeaux, France',
      verified: true,
    },
  });

  console.log('🏢 3 entreprises créées');

  // ── Utilisateurs ───────────────────────────────────────────────────────────
  const employerUser = await prisma.user.create({
    data: {
      email: 'employer@acme-tech.example.com',
      name: 'Marie Dupont',
      role: 'EMPLOYER',
      emailVerified: new Date(),
      companyId: acme.id,
    },
  });

  const candidateUser = await prisma.user.create({
    data: {
      email: 'candidat@example.com',
      name: 'Jean Martin',
      role: 'CANDIDATE',
      emailVerified: new Date(),
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ebarka-jobs.com',
      name: 'Admin Ebarka',
      role: 'ADMIN',
      emailVerified: new Date(),
    },
  });

  console.log('👥 3 utilisateurs créés');

  // ── Offres d'emploi ────────────────────────────────────────────────────────
  const jobsData = [
    // Acme Technologies
    {
      title: 'Développeur Full Stack Senior',
      slug: 'developpeur-full-stack-senior-acme-technologies',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: true,
      salaryMin: 55000,
      salaryMax: 75000,
      salaryCurrency: 'EUR',
      salaryUnit: 'YEAR' as const,
      description: `## À propos du poste

Nous recherchons un(e) développeur(se) Full Stack Senior passionné(e) pour rejoindre notre équipe produit en pleine croissance.

## Responsabilités

- Concevoir et développer des fonctionnalités de bout en bout (React + Node.js)
- Participer aux revues de code et mentorer les développeurs juniors
- Contribuer aux décisions d'architecture technique
- Collaborer avec les équipes Produit et Design

## Stack technique

**Frontend :** React 18, Next.js 14, TypeScript, Tailwind CSS
**Backend :** Node.js, Express, PostgreSQL, Redis
**Infrastructure :** AWS, Docker, GitHub Actions`,
      benefits: `- Télétravail 4j/5 possible
- 50% transport en commun pris en charge
- Tickets restaurant Swile
- Budget formation annuel : 2 000€
- Mutuelle Alan Premium`,
      applyInApp: true,
      workplaceType: 'HYBRID' as const,
      workplaceCity: 'Paris',
      workplaceCountry: 'France',
      visaSponsorship: 'YES' as const,
      companyId: acme.id,
      careerLevels: ['SENIOR'],
      languages: ['fr', 'en'],
    },
    {
      title: 'Product Designer UI/UX',
      slug: 'product-designer-ui-ux-acme-technologies',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: false,
      salaryMin: 45000,
      salaryMax: 60000,
      salaryCurrency: 'EUR',
      salaryUnit: 'YEAR' as const,
      description: `## Le rôle

En tant que Product Designer chez Acme, vous serez au cœur de la création de l'expérience utilisateur de notre plateforme SaaS utilisée par 50 000+ entreprises.

## Ce que vous ferez

- Créer des wireframes, prototypes et maquettes haute-fidélité
- Conduire des tests utilisateurs et analyser les retours
- Définir et maintenir notre Design System
- Travailler en collaboration étroite avec les PMs et les développeurs`,
      applyUrl: 'https://acme-tech.example.com/careers/designer',
      applyInApp: false,
      workplaceType: 'REMOTE' as const,
      remoteRegion: 'EU Only',
      visaSponsorship: 'NO' as const,
      companyId: acme.id,
      careerLevels: ['MID_LEVEL', 'SENIOR'],
      languages: ['fr'],
    },
    {
      title: 'Ingénieur DevOps',
      slug: 'ingenieur-devops-acme-technologies',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: false,
      salaryMin: 50000,
      salaryMax: 70000,
      salaryCurrency: 'EUR',
      salaryUnit: 'YEAR' as const,
      description: `## Mission

Vous rejoindrez l'équipe Infrastructure pour maintenir et améliorer notre pipeline CI/CD et notre plateforme cloud AWS.

## Compétences requises

- Kubernetes, Docker, Terraform
- AWS (EKS, RDS, S3, CloudFront)
- GitHub Actions, ArgoCD
- Monitoring : Datadog, Sentry`,
      applyInApp: true,
      workplaceType: 'HYBRID' as const,
      workplaceCity: 'Paris',
      workplaceCountry: 'France',
      visaSponsorship: 'YES' as const,
      companyId: acme.id,
      careerLevels: ['SENIOR', 'STAFF'],
      languages: ['fr', 'en'],
    },

    // Nova Digital
    {
      title: 'Développeur React / Next.js',
      slug: 'developpeur-react-nextjs-nova-digital',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: true,
      salaryMin: 38000,
      salaryMax: 50000,
      salaryCurrency: 'EUR',
      salaryUnit: 'YEAR' as const,
      description: `## Nova Digital recrute !

Agence en pleine croissance, nous recherchons un(e) développeur(se) React / Next.js pour renforcer notre équipe de 15 personnes à Lyon.

## Projets

Vous travaillerez sur des projets variés : e-commerce, portails B2B, applications web pour des clients grands comptes (retail, santé, finance).

## Profil recherché

- 2+ ans d'expérience avec React
- Bonne maîtrise de Next.js (App Router)
- Sensibilité UI et goût pour les interfaces soignées
- Autonomie et esprit d'équipe`,
      applyInApp: true,
      workplaceType: 'ON_SITE' as const,
      workplaceCity: 'Lyon',
      workplaceCountry: 'France',
      visaSponsorship: 'NO' as const,
      companyId: nova.id,
      careerLevels: ['JUNIOR', 'MID_LEVEL'],
      languages: ['fr'],
    },
    {
      title: 'Chef de Projet Digital',
      slug: 'chef-de-projet-digital-nova-digital',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: false,
      salaryMin: 40000,
      salaryMax: 52000,
      salaryCurrency: 'EUR',
      salaryUnit: 'YEAR' as const,
      description: `## Le poste

Au sein de l'agence Nova Digital, vous piloterez des projets digitaux de A à Z, de la phase de cadrage à la livraison, en coordination avec les équipes design et développement.

## Responsabilités

- Gestion de planning et suivi budgétaire
- Interface client et recueil des besoins
- Animation des équipes pluridisciplinaires
- Garantie de la qualité des livrables`,
      applyUrl: 'https://nova-digital.example.com/jobs/chef-projet',
      applyInApp: false,
      workplaceType: 'HYBRID' as const,
      workplaceCity: 'Lyon',
      workplaceCountry: 'France',
      visaSponsorship: 'NO' as const,
      companyId: nova.id,
      careerLevels: ['MID_LEVEL', 'SENIOR'],
      languages: ['fr'],
    },

    // DataFlow AI
    {
      title: 'Data Engineer Senior',
      slug: 'data-engineer-senior-dataflow-ai',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: true,
      salaryMin: 60000,
      salaryMax: 85000,
      salaryCurrency: 'EUR',
      salaryUnit: 'YEAR' as const,
      description: `## L'opportunité

DataFlow AI cherche un(e) Data Engineer Senior pour concevoir et opérer notre pipeline de traitement de données à l'échelle du pétaoctet.

## Technologies

- Apache Kafka, Apache Flink, Spark
- dbt, Airflow
- PostgreSQL, ClickHouse, BigQuery
- Python, Scala

## Ce qui vous attend

Un environnement technique exigeant, une équipe de 8 ingénieurs data passionnés, et des challenges qui n'existent nulle part ailleurs en France.`,
      benefits: `- Full remote possible
- BSPCE (stock-options)
- Conférences techniques payées (Spark Summit, Data Engineering...)
- Budget home office : 1 500€`,
      applyInApp: true,
      workplaceType: 'REMOTE' as const,
      remoteRegion: 'Worldwide',
      visaSponsorship: 'YES' as const,
      companyId: dataflow.id,
      careerLevels: ['SENIOR', 'STAFF'],
      languages: ['fr', 'en'],
    },
    {
      title: 'Machine Learning Engineer',
      slug: 'machine-learning-engineer-dataflow-ai',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: false,
      salaryMin: 65000,
      salaryMax: 90000,
      salaryCurrency: 'EUR',
      salaryUnit: 'YEAR' as const,
      description: `## Mission

Vous développerez et déploierez des modèles de ML en production pour nos clients enterprise. Vous serez responsable de l'ensemble du cycle de vie des modèles, du prototypage à la mise en production.

## Stack ML

- Python (scikit-learn, PyTorch, HuggingFace)
- MLflow, Kubeflow
- Feature stores, A/B testing
- API REST pour l'inférence temps réel`,
      applyInApp: true,
      workplaceType: 'HYBRID' as const,
      workplaceCity: 'Bordeaux',
      workplaceCountry: 'France',
      visaSponsorship: 'YES' as const,
      companyId: dataflow.id,
      careerLevels: ['MID_LEVEL', 'SENIOR'],
      languages: ['fr', 'en'],
    },
    {
      title: 'Stage — Développeur Backend Python',
      slug: 'stage-developpeur-backend-python-dataflow-ai',
      type: 'INTERNSHIP' as const,
      status: 'ACTIVE' as const,
      featured: false,
      salaryMin: 1200,
      salaryMax: 1500,
      salaryCurrency: 'EUR',
      salaryUnit: 'MONTH' as const,
      description: `## Stage de 6 mois — Développeur Backend Python

Rejoignez l'équipe Core Platform de DataFlow AI pour un stage stimulant au cœur de notre infrastructure.

## Missions

- Développement de microservices Python (FastAPI)
- Optimisation des requêtes PostgreSQL
- Écriture de tests automatisés
- Participation aux code reviews

## Profil

- Étudiant(e) en école d'ingénieur ou master informatique
- Bonnes bases en Python
- Curiosité et envie d'apprendre`,
      applyInApp: true,
      workplaceType: 'ON_SITE' as const,
      workplaceCity: 'Bordeaux',
      workplaceCountry: 'France',
      visaSponsorship: 'NO' as const,
      companyId: dataflow.id,
      careerLevels: ['INTERNSHIP'],
      languages: ['fr'],
    },
  ];

  for (const jobData of jobsData) {
    const { careerLevels, languages, ...job } = jobData;

    await prisma.job.create({
      data: {
        ...job,
        careerLevels: {
          create: careerLevels.map((level) => ({ level: level as any })),
        },
        languages: {
          create: languages.map((lang) => ({ language: lang })),
        },
      },
    });
  }

  console.log(`💼 ${jobsData.length} offres d'emploi créées`);

  // ── Alertes email ──────────────────────────────────────────────────────────
  await prisma.jobAlert.createMany({
    data: [
      {
        email: 'candidat@example.com',
        name: 'Jean Martin',
        active: true,
        filters: {
          types: ['FULL_TIME'],
          remote: true,
          levels: ['SENIOR', 'MID_LEVEL'],
        },
      },
      {
        email: 'sophie.lemaire@example.com',
        name: 'Sophie Lemaire',
        active: true,
        filters: { types: ['FULL_TIME', 'CONTRACT'] },
      },
    ],
  });

  console.log('🔔 2 alertes email créées');

  // ── Résumé ─────────────────────────────────────────────────────────────────
  const counts = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.job.count(),
    prisma.jobAlert.count(),
  ]);

  console.log('\n✅ Seed terminé avec succès !');
  console.log(`   Entreprises  : ${counts[0]}`);
  console.log(`   Utilisateurs : ${counts[1]}`);
  console.log(`   Offres       : ${counts[2]}`);
  console.log(`   Alertes      : ${counts[3]}`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
