import { NextResponse } from 'next/server';
import type { PaginationMeta } from '@/lib/validations/shared';

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_TOO_MANY = 429;
const HTTP_INTERNAL = 500;

export const ok = <T>(data: T, status = HTTP_OK) =>
  NextResponse.json({ data }, { status });

export const created = <T>(data: T) => ok(data, HTTP_CREATED);

export const paginated = <T>(data: T[], pagination: PaginationMeta) =>
  NextResponse.json({ data, pagination });

export const err = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

export const badRequest = (message: string) => err(message, HTTP_BAD_REQUEST);

export const unauthorized = () => err('Authentication required.', HTTP_UNAUTHORIZED);

export const forbidden = () => err('Insufficient permissions.', HTTP_FORBIDDEN);

export const notFound = (resource = 'Resource') =>
  err(`${resource} not found.`, HTTP_NOT_FOUND);

export const conflict = (message: string) => err(message, HTTP_CONFLICT);

export const tooManyRequests = (retryAfterSeconds: number) =>
  NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: HTTP_TOO_MANY,
      headers: { 'Retry-After': String(retryAfterSeconds) },
    }
  );

export const internalError = () =>
  err('An internal error occurred. Please try again.', HTTP_INTERNAL);
