import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/supabase/auth";
import { registerHistoricalInitialLoadPlan } from "@/lib/imports/historical-initial-load-server";
import { isUuid } from "@/lib/validation/uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 1024 * 1024;

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  return origin === new URL(request.url).origin && (!site || site === "same-origin");
}

async function readJsonBounded(request: NextRequest): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase()
    !== "application/json") throw new Error("invalid");
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES))
    throw new Error("invalid");
  if (!request.body) throw new Error("invalid");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.length;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("invalid");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
}

/**
 * Register only an UNVERIFIED metadata inventory. No original XLSX/image bytes,
 * no clinical data, no Client mutation, no upload and no automatic publication.
 */
export async function POST(request: NextRequest) {
  await requireRole("admin"); // Must happen before parsing user-supplied data.
  if (!isSameOrigin(request)) return json({ error: "request_not_authorized" }, 403);

  let raw: unknown;
  try {
    raw = await readJsonBounded(request);
  } catch {
    return json({ error: "invalid_manifest" }, 413);
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return json({ error: "invalid_manifest" }, 400);
  }
  const obj = raw as Record<string, unknown>;
  if (Object.keys(obj).length !== 2 || !Object.hasOwn(obj, "batch_id")
    || !Object.hasOwn(obj, "plan") || typeof obj.batch_id !== "string"
    || !isUuid(obj.batch_id)) {
    return json({ error: "invalid_manifest" }, 400);
  }
  try {
    const receipt = await registerHistoricalInitialLoadPlan(obj.plan, obj.batch_id);
    return json(receipt);
  } catch {
    return json({ error: "manifest_registration_blocked" }, 422);
  }
}
