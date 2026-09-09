type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  event?: string;
  actorId?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

const sensitiveKeys = ["password", "token", "secret", "authorization", "service_role"];

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(redact);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
      key,
      sensitiveKeys.some((sensitiveKey) => key.toLowerCase().includes(sensitiveKey))
        ? "[REDACTED]"
        : redact(entryValue)
    ])
  );
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context: redact(context)
  };

  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
}

export const logger = {
  debug: (message: string, context?: LogContext) => write("debug", message, context),
  info: (message: string, context?: LogContext) => write("info", message, context),
  warn: (message: string, context?: LogContext) => write("warn", message, context),
  error: (message: string, context?: LogContext) => write("error", message, context)
};
