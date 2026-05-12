/**
 * Structured server logs for transactional email flow (Resend + React Email).
 * Prefix is fixed so operators can grep `[email-flow]`.
 */

const PREFIX = "[email-flow]";

export type EmailFlowLogFields = Record<string, unknown>;

function serialize(details: EmailFlowLogFields): string {
  try {
    return JSON.stringify(details);
  } catch {
    return JSON.stringify({ serializationError: true });
  }
}

export function emailFlowInfo(event: string, details: EmailFlowLogFields): void {
  console.info(`${PREFIX} ${event} ${serialize(details)}`);
}

export function emailFlowWarn(event: string, details: EmailFlowLogFields): void {
  console.warn(`${PREFIX} ${event} ${serialize(details)}`);
}

export function emailFlowError(event: string, details: EmailFlowLogFields): void {
  console.error(`${PREFIX} ${event} ${serialize(details)}`);
}

export function emailFlowErrorWithCause(
  event: string,
  details: EmailFlowLogFields,
  cause: unknown,
): void {
  const reason =
    cause instanceof Error ? cause.message : typeof cause === "string" ? cause : String(cause);
  const stack = cause instanceof Error ? cause.stack : undefined;
  console.error(`${PREFIX} ${event} ${serialize({ ...details, failureReason: reason, stack })}`);
}
