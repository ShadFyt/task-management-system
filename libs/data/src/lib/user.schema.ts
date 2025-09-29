import { z } from 'zod';
import { roleBareSchema } from './role.schema';

export const organizationSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export const userSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  role: roleBareSchema,
  organization: organizationSchema,
  subOrganizations: organizationSchema.array(),
});

export type User = z.infer<typeof userSchema>;
