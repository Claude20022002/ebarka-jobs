import { CareerLevel, type Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const seedLogger = {
  info(message: string) {
    process.stdout.write(`${message}\n`);
  },
  error(message: string, error: unknown) {
    const details =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    process.stderr.write(`${message}\n${details}\n`);
  },
};

type SeedJob = Omit<
  Prisma.JobUncheckedCreateInput,
  | 'id'
  | 'createdAt'
  | 'updatedAt'
  | 'careerLevels'
  | 'languages'
  | 'applications'
  | 'savedBy'
  | 'payment'
> & {
  careerLevels: CareerLevel[];
  languages: string[];
};

async function main() {
  seedLogger.info('Demarrage du seed...');

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

  seedLogger.info('Base de donnees nettoyee');

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
        "Leader européen de l'analyse de données en temps réel. Notre plateforme traite plus de 10 milliards d'événements par jour pour 500+ clients enterprise.",
      industry: 'Data / Intelligence Artificielle',
      size: 'MEDIUM',
      location: 'Bordeaux, France',
      verified: true,
    },
  });

  seedLogger.info('3 entreprises creees');

  // ── Utilisateurs ───────────────────────────────────────────────────────────
  await prisma.user.createMany({
    data: [
      {
        email: 'employer@acme-tech.example.com',
        name: 'Marie Dupont',
        role: 'EMPLOYER',
        emailVerified: new Date(),
        companyId: acme.id,
      },
      {
        email: 'candidat@example.com',
        name: 'Jean Martin',
        role: 'CANDIDATE',
        emailVerified: new Date(),
      },
      {
        email: 'admin@ebarka-jobs.com',
        name: 'Admin Ebarka',
        role: 'ADMIN',
        emailVerified: new Date(),
      },
    ],
  });

  seedLogger.info('3 utilisateurs crees');

  // ── Offres d'emploi ────────────────────────────────────────────────────────
  const jobsData: SeedJob[] = [
    // Acme Technologies
    {
      title: 'Développeur Full Stack Senior',
      slug: 'developpeur-full-stack-senior-acme-technologies',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: true,
      salaryMin: 55_000,
      salaryMax: 75_000,
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
      careerLevels: [CareerLevel.SENIOR],
      languages: ['fr', 'en'],
    },
    {
      title: 'Product Designer UI/UX',
      slug: 'product-designer-ui-ux-acme-technologies',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: false,
      salaryMin: 45_000,
      salaryMax: 60_000,
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
      careerLevels: [CareerLevel.MID_LEVEL, CareerLevel.SENIOR],
      languages: ['fr'],
    },
    {
      title: 'Ingénieur DevOps',
      slug: 'ingenieur-devops-acme-technologies',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: false,
      salaryMin: 50_000,
      salaryMax: 70_000,
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
      careerLevels: [CareerLevel.SENIOR, CareerLevel.STAFF],
      languages: ['fr', 'en'],
    },

    // Nova Digital
    {
      title: 'Développeur React / Next.js',
      slug: 'developpeur-react-nextjs-nova-digital',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: true,
      salaryMin: 38_000,
      salaryMax: 50_000,
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
      careerLevels: [CareerLevel.JUNIOR, CareerLevel.MID_LEVEL],
      languages: ['fr'],
    },
    {
      title: 'Chef de Projet Digital',
      slug: 'chef-de-projet-digital-nova-digital',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: false,
      salaryMin: 40_000,
      salaryMax: 52_000,
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
      careerLevels: [CareerLevel.MID_LEVEL, CareerLevel.SENIOR],
      languages: ['fr'],
    },

    // DataFlow AI
    {
      title: 'Data Engineer Senior',
      slug: 'data-engineer-senior-dataflow-ai',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: true,
      salaryMin: 60_000,
      salaryMax: 85_000,
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
      careerLevels: [CareerLevel.SENIOR, CareerLevel.STAFF],
      languages: ['fr', 'en'],
    },
    {
      title: 'Machine Learning Engineer',
      slug: 'machine-learning-engineer-dataflow-ai',
      type: 'FULL_TIME' as const,
      status: 'ACTIVE' as const,
      featured: false,
      salaryMin: 65_000,
      salaryMax: 90_000,
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
      careerLevels: [CareerLevel.MID_LEVEL, CareerLevel.SENIOR],
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
      careerLevels: [CareerLevel.INTERNSHIP],
      languages: ['fr'],
    },
  ];

  await Promise.all(
    jobsData.map(async (jobData) => {
      const { careerLevels, languages, ...job } = jobData;

      const createdJob = await prisma.job.create({ data: job });

      await prisma.jobCareerLevel.createMany({
        data: careerLevels.map((level) => ({
          jobId: createdJob.id,
          level,
        })),
      });

      await prisma.jobLanguage.createMany({
        data: languages.map((language) => ({
          jobId: createdJob.id,
          language,
        })),
      });
    })
  );

  seedLogger.info(`${jobsData.length} offres d'emploi creees`);

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

  seedLogger.info('2 alertes email creees');

  // ── Résumé ─────────────────────────────────────────────────────────────────
  const counts = await Promise.all([
    prisma.company.count(),
    prisma.user.count(),
    prisma.job.count(),
    prisma.jobAlert.count(),
  ]);

  seedLogger.info('');
  seedLogger.info('Seed termine avec succes !');
  seedLogger.info(`Entreprises  : ${counts[0]}`);
  seedLogger.info(`Utilisateurs : ${counts[1]}`);
  seedLogger.info(`Offres       : ${counts[2]}`);
  seedLogger.info(`Alertes      : ${counts[3]}`);
}

main()
  .catch((e) => {
    seedLogger.error('Erreur seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
