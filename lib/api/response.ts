import { NextResponse } from 'next/server';
import type { PaginationMeta } from '@/lib/validations/shared';

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ data }, { status });

export const created = <T>(data: T) => ok(data, 201);

export const paginated = <T>(data: T[], pagination: PaginationMeta) =>
  NextResponse.json({ data, pagination });

export const err = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

export const badRequest = (message: string) => err(message, 400);

export const unauthorized = () =>
  err('Authentication required.', 401);

export const forbidden = () =>
  err('Insufficient permissions.', 403);

export const notFound = (resource = 'Resource') =>
  err(`${resource} not found.`, 404);

export const conflict = (message: string) => err(message, 409);

export const tooManyRequests = (retryAfterSeconds: number) =>
  NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }
  );

export const internalError = () =>
  err('An internal error occurred. Please try again.', 500);
