import { z } from 'zod';
import { permissionSchema } from './permission.schema';

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  permissions: permissionSchema.array(),
});

export const roleBareSchema = roleSchema.omit({ id: true, description: true });

export type Role = z.infer<typeof roleSchema>;

export type RoleDto = z.infer<typeof roleBareSchema>;
