import { z } from 'zod/index';

export const auditLogsQuerySchema = z.object({
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0),
  orgId: z.string().optional(),
});

export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
