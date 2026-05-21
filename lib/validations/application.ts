import { z } from 'zod';

const COVER_LETTER_MAX = 5_000;
const MESSAGE_MAX = 300;
const DOCUMENT_ID_MAX_COUNT = 5;

export const CreateApplicationSchema = z.object({
  coverLetter: z.string().max(COVER_LETTER_MAX).trim().optional(),
  message: z.string().max(MESSAGE_MAX).trim().optional(),
  documentIds: z
    .array(z.string().min(1))
    .max(DOCUMENT_ID_MAX_COUNT)
    .default([]),
});

export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;
