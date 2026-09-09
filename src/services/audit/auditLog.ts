import { z } from "zod";

import { logger } from "@/lib/logger";

export const auditActionSchema = z.string().min(3).max(120);

export interface AuditLogEntry {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  auditActionSchema.parse(entry.action);

  logger.info("audit_log.recorded", {
    event: entry.action,
    actorId: entry.actorId,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadata: {
      hasBefore: Boolean(entry.before),
      hasAfter: Boolean(entry.after),
      reason: entry.reason,
      ...entry.metadata
    }
  });
}
