import { Prisma } from '@prisma/client';
import type { NextRequest } from 'next/server';
import {
  badRequest,
  conflict,
  created,
  internalError,
  tooManyRequests,
} from '@/lib/api/response';
import { alertsRateLimit } from '@/lib/rate-limit';
import { prisma } from '@/lib/db/prisma';
import { CreateAlertSchema } from '@/lib/validations/alert';

const RETRY_AFTER_SECONDS = 3_600;

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
    return badRequest(parsed.error.issues.at(0)?.message ?? 'Invalid request body.');
  }

  const { name, email, filters } = parsed.data;

  try {
    const alert = await prisma.jobAlert.create({
      data: {
        name,
        email,
        filters: filters ?? Prisma.JsonNull,
        active: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        active: true,
        createdAt: true,
      },
    });

    return created(alert);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return conflict('An alert for this email already exists.');
      }
    }
    return internalError();
  }
};
