import { NextResponse } from 'next/server';
import config from '@/config';
import { RATE_LIMIT_WINDOW_MS } from '@/lib/constants/defaults';
import { emailProvider } from '@/lib/email';

export const dynamic = 'force-dynamic';

// RFC 5321 / RFC 5322 length limits
const EMAIL_MAX_LENGTH = 254;
const EMAIL_LOCAL_MAX_LENGTH = 64;
const NAME_MAX_LENGTH = 100;
const MIN_TLD_LENGTH = 2;

type RateLimitInfo = {
  count: number;
  resetTime: number;
};

// In-memory rate limiter — replace with Upstash Redis in a future PR.
const rateLimitMap = new Map<string, RateLimitInfo>();

const RATE_LIMIT_MAX = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const info = rateLimitMap.get(ip);

  if (!info || now > info.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  info.count += 1;
  rateLimitMap.set(ip, info);
  return info.count > RATE_LIMIT_MAX;
}

// RFC 5321 / RFC 5322 — structural validation without regex to avoid ReDoS.
function isValidEmail(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > EMAIL_MAX_LENGTH) {
    return false;
  }
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex < 1) {
    return false;
  }
  const local = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex + 1);
  if (local.length === 0 || local.length > EMAIL_LOCAL_MAX_LENGTH) {
    return false;
  }
  const dotIndex = domain.lastIndexOf('.');
  if (dotIndex < 1 || dotIndex === domain.length - 1) {
    return false;
  }
  return domain.slice(dotIndex + 1).length >= MIN_TLD_LENGTH;
}

function isValidName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.trim().length <= NAME_MAX_LENGTH
  );
}

export async function POST(request: Request) {
  if (!config.jobAlerts?.enabled) {
    return NextResponse.json(
      { error: 'Job alerts feature is disabled' },
      { status: 404 }
    );
  }

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',').at(0)?.trim() ??
    request.headers.get('x-real-ip') ??
    (process.env.NODE_ENV === 'development' ? '203.0.113.1' : 'unknown');

  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;

  if (!isValidEmail(raw.email)) {
    return NextResponse.json(
      { error: 'A valid email address is required.' },
      { status: 400 }
    );
  }

  if (!isValidName(raw.name)) {
    return NextResponse.json(
      { error: 'Name is required and must be 100 characters or fewer.' },
      { status: 400 }
    );
  }

  const email = raw.email.trim();
  const name = (raw.name as string).trim();

  try {
    await emailProvider.subscribe({
      email,
      name,
      ip: clientIp,
      metadata: {
        source: 'website-form',
        userAgent: request.headers.get('user-agent'),
        referer: request.headers.get('referer'),
        origin: request.headers.get('origin'),
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
