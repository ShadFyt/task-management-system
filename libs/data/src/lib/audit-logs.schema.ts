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
