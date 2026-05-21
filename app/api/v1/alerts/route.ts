import type { NextRequest } from 'next/server';
import {
  badRequest,
  created,
  internalError,
  tooManyRequests,
} from '@/lib/api/response';
import { alertsRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import { CreateAlertSchema } from '@/lib/validations/alert';

// 1 hour — matches the alertsRateLimit window
const RETRY_AFTER_SECONDS = 3600;

// POST /api/v1/alerts — subscribe to job alerts (public, rate-limited per IP)
export const POST = async (request: NextRequest) => {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',').at(0)?.trim() ?? 'unknown';
  const rl = alertsRateLimit(ip);
  if (!rl.success) {
    return tooManyRequests(RETRY_AFTER_SECONDS);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const parsed = CreateAlertSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues.at(0)?.message ?? 'Invalid request body.'
    );
  }

  const { name, email, filters } = parsed.data;

  try {
    const alert = await prisma.jobAlert.create({
      data: { name, email, filters: filters ?? null, active: true },
      select: { id: true, email: true, name: true, active: true, createdAt: true },
    });

    return created(alert);
  } catch {
    return internalError();
  }
};
