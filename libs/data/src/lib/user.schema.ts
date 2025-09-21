import { z } from 'zod';
import { roleSchema } from './role.schema';

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: roleSchema,
  organizationId: z.string(),
});

export type User = z.infer<typeof userSchema>;
