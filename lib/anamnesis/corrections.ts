import type { Json } from "@/lib/supabase/database.types";

export type CorrectionJsonParseResult =
  | { ok: true; value: Json }
  | { message: string; ok: false };

export function parseCorrectionJson(input: string): CorrectionJsonParseResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      message: "Informe o valor corrigido em JSON.",
      ok: false,
    };
  }

  try {
    const value: unknown = JSON.parse(trimmed);

    if (value === undefined) {
      return {
        message: "Informe um valor JSON válido.",
        ok: false,
      };
    }

    return {
      ok: true,
      value: value as Json,
    };
  } catch {
    return {
      message:
        'Use JSON válido. Exemplo para texto: "resposta corrigida".',
      ok: false,
    };
  }
}

export function serializeCorrectionJson(value: Json) {
  return JSON.stringify(value, null, 2);
}
