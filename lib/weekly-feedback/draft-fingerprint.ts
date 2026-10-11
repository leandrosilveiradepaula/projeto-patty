import { createHash } from "node:crypto";

import type { Json } from "@/lib/supabase/database.types";

/**
 * Opaque snapshot marker for UI-level stale-draft detection.
 * It is deliberately NOT an authorization primitive or an atomic database CAS.
 * Do not place answer bodies in PostgREST filters, URLs or telemetry.
 */
function stableJson(value: Json): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableJson).join(",") + "]";
  return "{" + Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(
    ([key, item]) => JSON.stringify(key) + ":" + stableJson(item),
  ).join(",") + "}";
}

export function fingerprintWeeklyFeedbackAnswers(answers: Json): string {
  return createHash("sha256").update(stableJson(answers)).digest("hex");
}

export function validWeeklyFeedbackFingerprint(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}
