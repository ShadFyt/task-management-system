import { z } from 'zod';
import { permissionSchema } from './permission.schema';

export const roleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  permissions: permissionSchema.array(),
});

export type Role = z.infer<typeof roleSchema>;
