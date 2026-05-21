import { z } from 'zod';

const NAME_MAX = 100;
const EMAIL_MAX = 254;

export const CreateAlertSchema = z.object({
  name: z.string().min(1).max(NAME_MAX).trim(),
  email: z.string().email().max(EMAIL_MAX).trim().transform((s) => s.toLowerCase()),
  filters: z
    .object({
      types: z.array(z.string()).optional(),
      levels: z.array(z.string()).optional(),
      remote: z.boolean().optional(),
      languages: z.array(z.string()).optional(),
    })
    .optional(),
});

export type CreateAlertInput = z.infer<typeof CreateAlertSchema>;
