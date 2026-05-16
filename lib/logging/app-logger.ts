/**
 * Structured production-safe server logging.
 * Grep prefix: `[app]` with JSON payload per line.
 */

export type LogDomain =
  | "api"
  | "ai"
  | "email"
  | "auth"
  | "upload"
  | "redirect"
  | "review"
  | "scan"
  | "reward"
  | "admin";

export type LogLevel = "info" | "warn" | "error";

export type AppLogContext = {
  domain: LogDomain;
  correlationId?: string;
  route?: string;
};

export type AppLogger = {
  info: (event: string, fields?: Record<string, unknown>) => void;
  warn: (event: string, fields?: Record<string, unknown>) => void;
  error: (
    event: string,
    fields?: Record<string, unknown>,
    cause?: unknown,
  ) => void;
};

function infoEnabled(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.APP_LOG_INFO === "1";
}

function includeStack(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.APP_LOG_STACK === "1";
}

function serializeFields(fields: Record<string, unknown>): string {
  try {
    return JSON.stringify(fields);
  } catch {
    return JSON.stringify({ serializationError: true });
  }
}

function emit(
  level: LogLevel,
  ctx: AppLogContext,
  event: string,
  fields: Record<string, unknown>,
  cause?: unknown,
): void {
  if (level === "info" && !infoEnabled()) return;

  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
    domain: ctx.domain,
    event,
    ...(ctx.correlationId ? { correlationId: ctx.correlationId } : {}),
    ...(ctx.route ? { route: ctx.route } : {}),
    ...fields,
  };

  if (cause !== undefined) {
    payload.failureReason =
      cause instanceof Error
        ? cause.message
        : typeof cause === "string"
          ? cause
          : String(cause);
    if (includeStack() && cause instanceof Error && cause.stack) {
      payload.stack = cause.stack;
    }
  }

  const line = serializeFields(payload);
  if (level === "error") console.error(`[app] ${line}`);
  else if (level === "warn") console.warn(`[app] ${line}`);
  else console.info(`[app] ${line}`);
}

export function createAppLogger(ctx: AppLogContext): AppLogger {
  return {
    info(event, fields = {}) {
      emit("info", ctx, event, fields);
    },
    warn(event, fields = {}) {
      emit("warn", ctx, event, fields);
    },
    error(event, fields = {}, cause) {
      emit("error", ctx, event, fields, cause);
    },
  };
}

/** Accept client-provided id or generate one (max 64 chars, safe charset). */
export function getRequestCorrelationId(
  headers: Headers,
  fallback?: string,
): string {
  const fromHeader = headers.get("x-correlation-id")?.trim();
  if (
    fromHeader &&
    fromHeader.length <= 64 &&
    /^[\w.-]+$/.test(fromHeader)
  ) {
    return fromHeader;
  }
  if (fallback?.trim()) return fallback.trim().slice(0, 64);
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}`;
}

export function createRouteLogger(
  domain: LogDomain,
  route: string,
  headers?: Headers,
  correlationId?: string,
): AppLogger {
  const id = headers
    ? getRequestCorrelationId(headers, correlationId)
    : correlationId ?? getRequestCorrelationId(new Headers());
  return createAppLogger({ domain, route, correlationId: id });
}
