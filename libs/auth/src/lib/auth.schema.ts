import { z } from 'zod';
import { userSchema } from '@task-management-system/data';

export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: userSchema,
});

export const authBodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type AuthBody = z.infer<typeof authBodySchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;

