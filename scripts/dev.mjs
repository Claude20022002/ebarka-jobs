#!/usr/bin/env node
/**
 * Démarre l'environnement de développement complet :
 *   1. Vérifie que Docker est actif
 *   2. Lance les conteneurs PostgreSQL + pgAdmin
 *   3. Attend que PostgreSQL soit prêt
 *   4. Génère le client Prisma
 *   5. Applique les migrations en attente
 *   6. Lance Next.js avec Turbopack
 *
 * Usage :
 *   node scripts/dev.mjs          — démarrage standard
 *   node scripts/dev.mjs --seed   — idem + injection des données de test
 */
import { execSync, spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

// ── Couleurs ANSI ──────────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// ── Logger ─────────────────────────────────────────────────────────────────

const log = {
  info: (label, msg) =>
    process.stdout.write(
      `${C.cyan}${C.bold}[${label}]${C.reset} ${msg}\n`
    ),
  ok: (label, msg) =>
    process.stdout.write(
      `${C.green}${C.bold}[${label}]${C.reset} ${msg}\n`
    ),
  warn: (label, msg) =>
    process.stdout.write(
      `${C.yellow}${C.bold}[${label}]${C.reset} ${msg}\n`
    ),
  fail: (label, msg) =>
    process.stderr.write(
      `${C.red}${C.bold}[${label}]${C.reset} ${msg}\n`
    ),
  dim: (msg) =>
    process.stdout.write(`${C.gray}${msg}${C.reset}\n`),
};

// ── Utilitaires shell ──────────────────────────────────────────────────────

const run = (cmd, opts = {}) =>
  execSync(cmd, { stdio: 'inherit', ...opts });

const tryRun = (cmd) => {
  try {
    execSync(cmd, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
};

// ── Attente PostgreSQL ─────────────────────────────────────────────────────

const MAX_POSTGRES_ATTEMPTS = 30;
const POSTGRES_POLL_MS = 2_000;

const waitForPostgres = async () => {
  log.info('postgres', 'Attente que PostgreSQL soit prêt...');

  for (let attempt = 1; attempt <= MAX_POSTGRES_ATTEMPTS; attempt++) {
    const ready = tryRun(
      'docker compose exec -T postgres pg_isready -U postgres -d ebarka_jobs -q'
    );
    if (ready) {
      log.ok('postgres', `Prêt après ${attempt} tentative(s) ✓`);
      return;
    }
    log.dim(`  → tentative ${attempt}/${MAX_POSTGRES_ATTEMPTS}...`);
    await sleep(POSTGRES_POLL_MS);
  }

  throw new Error(
    `PostgreSQL n'est pas devenu prêt après ${MAX_POSTGRES_ATTEMPTS} tentatives.`
  );
};

// ── Bannière ───────────────────────────────────────────────────────────────

const printBanner = () => {
  const line = '─'.repeat(50);
  process.stdout.write(`\n${C.cyan}${C.bold}${line}${C.reset}\n`);
  process.stdout.write(
    `${C.cyan}${C.bold}  E-Barka Jobs — Environnement de développement${C.reset}\n`
  );
  process.stdout.write(`${C.cyan}${C.bold}${line}${C.reset}\n\n`);
};

const printUrls = () => {
  process.stdout.write(`\n${C.green}${C.bold}  Services disponibles :${C.reset}\n`);
  process.stdout.write(
    `${C.green}  → App Next.js  : http://localhost:3000${C.reset}\n`
  );
  process.stdout.write(
    `${C.green}  → pgAdmin      : http://localhost:5050${C.reset}\n`
  );
  process.stdout.write(
    `${C.green}  → Prisma Studio : npx prisma studio${C.reset}\n`
  );
  process.stdout.write(`\n${C.gray}  Ctrl+C pour arrêter${C.reset}\n\n`);
};

// ── Orchestration principale ───────────────────────────────────────────────

const main = async () => {
  printBanner();

  const withSeed = process.argv.includes('--seed');

  // 1. Vérification Docker
  log.info('docker', 'Vérification du daemon Docker...');
  if (!tryRun('docker info')) {
    log.fail(
      'docker',
      'Docker n\'est pas démarré. Lance Docker Desktop puis relance ce script.'
    );
    process.exit(1);
  }
  log.ok('docker', 'Daemon actif ✓');

  // 2. Démarrage des conteneurs
  log.info('docker', 'Démarrage des conteneurs (PostgreSQL + pgAdmin)...');
  run('docker compose up -d');
  log.ok('docker', 'Conteneurs démarrés ✓');

  // 3. Attente PostgreSQL
  await waitForPostgres();

  // 4. Génération du client Prisma
  log.info('prisma', 'Génération du client Prisma...');
  run('npx prisma generate');
  log.ok('prisma', 'Client généré ✓');

  // 5. Application des migrations
  log.info('prisma', 'Application des migrations en attente...');
  run('npx prisma migrate deploy');
  log.ok('prisma', 'Migrations appliquées ✓');

  // 6. Seed optionnel
  if (withSeed) {
    log.info('seed', 'Injection des données de test...');
    run('npx tsx prisma/seed.ts');
    log.ok('seed', 'Données injectées ✓');
  }

  // 7. Démarrage Next.js
  log.info('next', 'Démarrage du serveur Next.js avec Turbopack...');
  printUrls();

  const nextServer = spawn('npx', ['next', 'dev', '--turbopack'], {
    stdio: 'inherit',
    shell: true,
  });

  // Transmission des signaux d'arrêt au processus enfant
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      nextServer.kill(signal);
    });
  }

  nextServer.on('close', (code) => {
    const exitCode = code ?? 0;
    if (exitCode !== 0) {
      log.fail('next', `Le serveur s'est arrêté avec le code ${exitCode}`);
    }
    process.exit(exitCode);
  });
};

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  log.fail('error', message);
  process.exit(1);
});
