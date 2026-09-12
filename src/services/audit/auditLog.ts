import { z } from "zod";

import { logger } from "@/lib/logger";
import { getSupabaseServiceClient } from "@/lib/supabase/server";

export const auditActionSchema = z.string().min(3).max(120);

export interface AuditLogEntry {
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  metadata?: Record<string, unknown>;
}

const localAuditEntries: AuditLogEntry[] = [];
const sensitiveKeyPattern = /(national.?id|cccd|bank.?account|tax.?code|social.?insurance|password)/i;

function sanitizeRecord(record?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!record) return undefined;

  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [
      key,
      sensitiveKeyPattern.test(key) ? "[REDACTED]" : value
    ])
  );
}

export function getLocalAuditLogs(): AuditLogEntry[] {
  return [...localAuditEntries].reverse();
}

export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  auditActionSchema.parse(entry.action);
  const safeEntry: AuditLogEntry = {
    ...entry,
    timestamp: entry.timestamp ?? new Date().toISOString(),
    before: sanitizeRecord(entry.before),
    after: sanitizeRecord(entry.after)
  };
  localAuditEntries.push(safeEntry);

  const client = getSupabaseServiceClient();
  if (client) {
    const actorAccountId = z.string().uuid().safeParse(entry.actorId).success ? entry.actorId : null;
    const { error } = await client.from("audit_logs").insert({
      actor_account_id: actorAccountId,
      action: safeEntry.action,
      entity_type: safeEntry.entityType,
      entity_id: safeEntry.entityId,
      happened_at: safeEntry.timestamp,
      before_data: safeEntry.before,
      after_data: safeEntry.after,
      reason: safeEntry.reason,
      metadata: safeEntry.metadata ?? {}
    });
    if (error) {
      logger.error("audit_log.persistence_failed", {
        event: safeEntry.action,
        entityType: safeEntry.entityType,
        entityId: safeEntry.entityId
      });
    }
  }

  logger.info("audit_log.recorded", {
    event: safeEntry.action,
    actorId: safeEntry.actorId,
    entityType: safeEntry.entityType,
    entityId: safeEntry.entityId,
    metadata: {
      hasBefore: Boolean(safeEntry.before),
      hasAfter: Boolean(safeEntry.after),
      reason: safeEntry.reason,
      ...safeEntry.metadata
    }
  });
}
