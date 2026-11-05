import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/supabase/auth";
import { getClientForPrivateFileAdministration } from "@/lib/files/private-file-admin";
import { isUuid } from "@/lib/validation/uuid";
import {
  extractHistoricalDirectXlsxCells,
  previewHistoricalDirectFiles,
} from "@/lib/imports/historical-archive-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_EXCEL_BYTES = 20 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_EXCEL_BYTES + 64 * 1024;
const MAX_REVIEW_CELLS = 40;
const HASH = /^[0-9a-f]{64}$/;

function response(payload: Record<string, unknown>, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0", Pragma: "no-cache" },
  });
}

/**
 * Read a bounded multipart request before parsing it. Reject oversized bodies
 * even when Content-Length is absent or incorrect; never log uploaded bytes.
 */
async function readBoundedFormData(request: NextRequest): Promise<FormData | null> {
  const contentType = request.headers.get("content-type");
  if (!contentType || !/^multipart\/form-data;\s*boundary=/i.test(contentType)) return null;
  const declared = request.headers.get("content-length");
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_MULTIPART_BYTES)) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const item = await reader.read();
      if (item.done) break;
      total += item.value.byteLength;
      if (total > MAX_MULTIPART_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(item.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const boundedRequest = new Request(request.url, {
    method: "POST",
    headers: { "content-type": contentType },
    body: bytes.buffer as ArrayBuffer,
  });
  try {
    return await boundedRequest.formData();
  } catch {
    return null;
  }
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!origin || origin !== new URL(request.url).origin) return false;
  return !fetchSite || fetchSite === "same-origin";
}

/**
 * Admin-only, no-persistence inspection of a selected client's XLSX.
 * The administrative photo upload uses the existing client-private workflow.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ clientId: string }> },
) {
  await requireRole("admin"); // Relational role AND AAL2, before reading any uploaded content.
  const { clientId } = await context.params;
  if (!isUuid(clientId)) return response({ error: "invalid_client" }, 400);
  if (!sameOrigin(request)) return response({ error: "request_not_authorized" }, 403);
  const client = await getClientForPrivateFileAdministration(clientId);
  if (!client) return response({ error: "client_not_found" }, 404);

  let form: FormData | null;
  try {
    form = await readBoundedFormData(request);
  } catch {
    return response({ error: "invalid_excel_upload" }, 413);
  }
  if (!form) return response({ error: "invalid_excel_upload" }, 413);
  const operation = form.get("operation");
  const allowed = operation === "inspect"
    ? ["operation", "excel"]
    : operation === "cells"
      ? ["operation", "excel", "sha256", "column_signature_sha256", "sheet_index", "column_index"]
      : [];
  if (allowed.length === 0 || [...form.keys()].some((key) => !allowed.includes(key))
    || allowed.some((key) => form!.getAll(key).length !== 1)) {
    return response({ error: "invalid_excel_request" }, 400);
  }

  const excel = form.get("excel");
  if (!(excel instanceof File) || excel.size === 0 || excel.size > MAX_EXCEL_BYTES
    || !/\.xlsx$/i.test(excel.name) || excel.name.length > 255) {
    return response({ error: "unsupported_excel" }, 415);
  }

  try {
    const bytes = new Uint8Array(await excel.arrayBuffer());
    const preview = previewHistoricalDirectFiles(bytes, []);
    if (preview.excel.state !== "recognized_unmapped") {
      return response({ error: "unsupported_excel" }, 415);
    }
    if (operation === "inspect") {
      return response({
        state: "pending_professional_review",
        persistence: "none",
        sha256: preview.excel.sha256,
        column_signature_sha256: preview.excel.column_signature_sha256,
        worksheet_count: preview.excel.worksheet_count,
      });
    }

    const sha256 = form.get("sha256");
    const signature = form.get("column_signature_sha256");
    const sheet = form.get("sheet_index");
    const column = form.get("column_index");
    if (typeof sha256 !== "string" || !HASH.test(sha256)
      || typeof signature !== "string" || !HASH.test(signature)
      || typeof sheet !== "string" || !/^(0|[1-9]\d?)$/.test(sheet)
      || typeof column !== "string" || !/^[1-9]\d{0,4}$/.test(column)
      || Number(column) > 16384
      || sha256 !== preview.excel.sha256
      || signature !== preview.excel.column_signature_sha256) {
      return response({ error: "excel_source_changed" }, 409);
    }
    const extracted = extractHistoricalDirectXlsxCells(
      bytes,
      { sha256, column_signature_sha256: signature },
      [{ sheet_index: Number(sheet), column_index: Number(column) }],
    );
    // Return only a bounded sample to this authenticated admin. Never log values.
    if (extracted.cells.some((cell) => cell.raw_value.length > 4096)) {
      return response({ error: "excel_cell_review_limit" }, 422);
    }
    return response({
      state: "raw_unapproved",
      persistence: "none",
      cell_count: extracted.cells.length,
      cells: extracted.cells.slice(0, MAX_REVIEW_CELLS),
      sample_limit: MAX_REVIEW_CELLS,
    });
  } catch {
    return response({ error: "excel_review_blocked" }, 422);
  }
}
