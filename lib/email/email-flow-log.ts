/**
 * Structured server logs for transactional email flow (Resend + React Email).
 * Delegates to centralized app logger (domain: email).
 */

import { createAppLogger } from "@/lib/logging/app-logger";

const log = createAppLogger({ domain: "email" });

export type EmailFlowLogFields = Record<string, unknown>;

export function emailFlowInfo(event: string, details: EmailFlowLogFields): void {
  log.info(event, details);
}

export function emailFlowWarn(event: string, details: EmailFlowLogFields): void {
  log.warn(event, details);
}

export function emailFlowError(event: string, details: EmailFlowLogFields): void {
  log.error(event, details);
}

export function emailFlowErrorWithCause(
  event: string,
  details: EmailFlowLogFields,
  cause: unknown,
): void {
  log.error(event, details, cause);
}
