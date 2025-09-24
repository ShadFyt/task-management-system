import { z } from 'zod';

export const auditLogSchema = z.object({
  id: z.string(),
  actorUserId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  organizationId: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  action: z.string(),
  outcome: z.string(),
  metadata: z.record(z.string(), z.any()),
  at: z.date(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

export const auditLogsQuerySchema = z.object({
  limit: z.number().optional().default(50),
  offset: z.number().optional().default(0),
  orgId: z.string().optional(),
});

export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
