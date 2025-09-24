import { z } from 'zod';

export const orgIdQuerySchema = z.object({
  orgId: z.string().optional(),
});

export const limitQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).optional().default(50),
});

export const offsetQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).optional().default(0),
});
