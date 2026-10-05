// One-line-per-event, JSON-structured logging so CloudWatch Logs Insights
// can filter/query by event name and fields instead of grepping free text.
// Added project-wide (07/10/2026) after a real incident: the SES bounce
// handler silently did nothing for a Transient bounce, which turned "an
// OTP email was sent but never arrived" into an invisible mystery instead
// of what it actually was, a rejection SES already knew about and told us.
// Lambda's runtime already logs uncaught exceptions on its own with a full
// stack trace — this is for the opposite case: a deliberate branch that
// skips or denies something, where nothing would otherwise be logged at
// all, and summary counts for batch/background jobs so a scheduled run's
// CloudWatch log answers "did it find/send anything" without needing a
// failure to look at.
type Level = "info" | "warn" | "error";

function log(level: Level, event: string, data?: Record<string, unknown>) {
  const line = { level, event, ...data };
  const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  fn(JSON.stringify(line));
}

export const logger = {
  info: (event: string, data?: Record<string, unknown>) => log("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => log("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => log("error", event, data),
};
