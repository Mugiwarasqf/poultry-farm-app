/**
 * Copies the listed optional fields from a request body onto an item, keeping
 * only values of the expected type (and dropping empty strings / non-positive
 * numbers), so a client can't smuggle arbitrary attributes into a table.
 */
export function pickOptional(
  body: Record<string, unknown>,
  spec: Record<string, "string" | "number">
): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, kind] of Object.entries(spec)) {
    const value = body[key];
    if (kind === "string" && typeof value === "string" && value.trim()) {
      out[key] = value.trim().slice(0, 500);
    } else if (kind === "number" && typeof value === "number" && Number.isFinite(value) && value >= 0) {
      out[key] = value;
    }
  }
  return out;
}
