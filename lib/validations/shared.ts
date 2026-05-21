import { z } from 'zod';

const PAGE_MIN = 1;
const PER_PAGE_MIN = 1;
const PER_PAGE_MAX = 100;
const PER_PAGE_DEFAULT = 25;
const PAGE_DEFAULT = 1;

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(PAGE_MIN).default(PAGE_DEFAULT),
  per_page: z.coerce
    .number()
    .int()
    .min(PER_PAGE_MIN)
    .max(PER_PAGE_MAX)
    .default(PER_PAGE_DEFAULT),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

export type PaginationMeta = {
  page: number;
  perPage: number;
  total: number;
  pages: number;
};

export const buildPaginationMeta = (
  page: number,
  perPage: number,
  total: number
): PaginationMeta => ({
  page,
  perPage,
  total,
  pages: Math.ceil(total / perPage),
});
