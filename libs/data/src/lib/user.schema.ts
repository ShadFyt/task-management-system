import { z } from 'zod';
import { roleSchema } from './role.schema';

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: roleSchema,
  organization: organizationSchema,
  subOrganizations: organizationSchema.array(),
});

export type User = z.infer<typeof userSchema>;
