"use client";

import { useState } from "react";
import { parseFamilyStageMapping, type FamilyStageMapping } from "@/lib/imports/historical-family-stage-mapping";
import type { PublishedHistoricalAnamnesisTargets } from "@/lib/imports/historical-anamnesis-targets";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type Source = Readonly<{
  source_id: string;
  source_sha256: string;
  layout_signature_sha256: string | null;
  proposed_client_id: string | null;
  kind: string;
  state: string;
}>;
type Decision = {
  file: File | null;
  identity: boolean;
  mapping: boolean;
  custody: boolean;
  result: "pending" | "saved" | "blocked";
  receipt?: string;
};
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PER_RUN = 5;
const HASH = /^[a-f0-9]{64}$/;
const SOURCE = /^source_[0-9]{4}$/;

const empty = (): Decision => ({
  file: null, identity: false, mapping: false, custody: false, result: "pending",
});
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), (b) =>
  b.toString(16).padStart(2, "0")).join("");

/**
 * One approved structural mapping can be applied to multiple explicitly
 * reviewed client sources. No name/filename/URL inference, parallel writes,
 * consent import, client activation or public release.
 */
export function HistoricalFamilyBatchStageForm({
  batchId, sources, targets,
}: {
  batchId: string;
  sources: readonly Source[];
  targets: PublishedHistoricalAnamnesisTargets | null;
}) {
  const [mapFile, setMapFile] = useState<File | null>(null);
  const [family, setFamily] = useState<FamilyStageMapping | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const eligible = sources.filter((source) =>
    source.kind === "xlsx" && source.state === "pending_backend_identity_verification"
    && !!source.proposed_client_id && !!source.layout_signature_sha256
    && HASH.test(source.source_sha256) && SOURCE.test(source.source_id));
  const compatible = family ? eligible.filter((s) =>
    s.layout_signature_sha256 === family.column_signature_sha256) : [];
  const selected = compatible.filter((s) => {
    const d = decisions[s.source_id];
    return d?.file && d.identity && d.mapping && d.custody && d.result !== "saved";
  });
  function patch(sourceId: string, update: Partial<Decision>) {
    setDecisions((prev) => ({
      ...prev,
      [sourceId]: { ...(prev[sourceId] ?? empty()), ...update, result: "pending", receipt: undefined },
    }));
  }
  async function loadMap() {
    if (!mapFile || !targets || busy || mapFile.size < 1 || mapFile.size > 16384
      || !/\.json$/i.test(mapFile.name)) {
      setMessage("Selecione um mapa JSON técnico de até 16 KB e confira a versão publicada.");
      return;
    }
    try {
      const parsed: unknown = JSON.parse(await mapFile.text());
      const checked = parseFamilyStageMapping(parsed, {
        form_version_id: targets.form_version_id,
        allowed_question_ids: targets.questions.map((q) => q.id),
      });
      setFamily(checked);
      setDecisions({});
      setMessage(null);
    } catch {
      setFamily(null);
      setDecisions({});
      setMessage("Mapa bloqueado: versão, perguntas, coordenadas ou estrutura incompatíveis.");
    }
  }

  async function importSelected() {
    if (busy || !family || !targets || selected.length < 1 || selected.length > MAX_PER_RUN) {
      setMessage("Selecione de uma a cinco fontes com as três confirmações individuais.");
      return;
    }
    setBusy(true);
    setMessage(null);
    for (const source of selected) {
      const decision = decisions[source.source_id];
      if (!decision?.file || !source.proposed_client_id || !source.layout_signature_sha256) continue;
      const file = decision.file;
      let result: Decision["result"] = "blocked";
      let receipt: string | undefined;
      try {
        if (file.size < 1 || file.size > MAX_FILE_BYTES || !/\.xlsx$/i.test(file.name)
          || file.name.length > 255 || !decision.identity || !decision.mapping || !decision.custody) {
          throw new Error("invalid");
        }
        // The browser check helps avoid a mistaken file; the server independently
        // validates ledger source, SHA, layout, client, form and raw answers.
        const hash = hex(await crypto.subtle.digest("SHA-256", await file.arrayBuffer()));
        if (hash !== source.source_sha256) throw new Error("mismatch");
        const data = new FormData();
        data.set("operation", "stage");
        data.set("excel", file);
        data.set("sha256", source.source_sha256);
        data.set("column_signature_sha256", source.layout_signature_sha256);
        data.set("form_version_id", family.form_version_id);
        data.set("mappings", JSON.stringify(family.mappings));
        data.set("batch_id", batchId);
        data.set("source_id", source.source_id);
        data.set("confirmed_identity", "true");
        data.set("confirmed_mapping", "true");
        data.set("confirmed_custody", "true");
        const response = await fetch(
          `/api/admin/clients/${source.proposed_client_id}/historical-excel`, {
            method: "POST", credentials: "same-origin", body: data, cache: "no-store",
          });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object"
          || !("state" in payload) || payload.state !== "staged_private"
          || !("source_id" in payload) || payload.source_id !== source.source_id
          || !("import_id" in payload) || typeof payload.import_id !== "string"
          || !("answer_count" in payload) || payload.answer_count !== family.mappings.length) {
          throw new Error("blocked");
        }
        receipt = payload.import_id;
        result = "saved";
      } catch {
        // No error bodies, names or clinical answers are exposed or logged.
        result = "blocked";
      }
      setDecisions((prev) => ({
        ...prev,
        [source.source_id]: {
          ...(prev[source.source_id] ?? empty()), file: null,
          identity: false, mapping: false, custody: false,
          result, receipt,
        },
      }));
    }
    setBusy(false);
    setMessage("Processamento encerrado. Confira o resultado de cada origem; fontes bloqueadas permanecem pendentes.");
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }} aria-busy={busy}>
      <p>Use um mapa de estrutura já conferido para vários Excel da mesma família. Cada arquivo exige decisão humana sobre a identidade da cliente, interpretação profissional e custódia. Nenhuma foto ou cadastro será ativado nesta etapa.</p>
      <label>
        <strong>Mapa técnico da família (.json, sem respostas)</strong>
        <input type="file" accept=".json,application/json" disabled={busy}
          onChange={(e) => {
            setMapFile(e.target.files?.[0] ?? null);
            setFamily(null);
            setDecisions({});
            setMessage(null);
          }} />
      </label>
      <Button type="button" variant="secondary" disabled={!mapFile || !targets || busy}
        onClick={() => void loadMap()}>Validar mapa da família</Button>
      {!targets ? <Alert variant="warning">Não há Anamnese publicada disponível para validar o mapa.</Alert> : null}
      {family ? (
        <>
          <Alert variant="info">
            Mapa conferido: {family.mappings.length} perguntas, {compatible.length} origem(ns)
            compatíveis nesta página. A compatibilidade de layout não confirma identidade nem autorização.
          </Alert>
          {compatible.length === 0 ? <p>Nenhum Excel elegível desta família nesta página do lote.</p> : null}
          {compatible.map((source) => {
            const d = decisions[source.source_id] ?? empty();
            return (
              <div key={source.source_id} style={{ border: "1px solid var(--border, #8884)", borderRadius: "0.75rem", padding: "1rem", display: "grid", gap: "0.6rem" }}>
                <strong>Origem {source.source_id} — SHA {source.source_sha256.slice(0, 12)}…</strong>
                <p>Cliente proposta: <code>{source.proposed_client_id}</code>. Este identificador é uma proposta, não prova da identidade.</p>
                {d.result === "saved" ? (
                  <Alert variant="info">Histórico guardado exclusivamente na área profissional. Registro: <code>{d.receipt}</code>. Não publicado.</Alert>
                ) : (
                  <>
                    <label>Excel desta origem (.xlsx)
                      <input type="file" accept=".xlsx" disabled={busy}
                        onChange={(e) => patch(source.source_id, {
                          file: e.target.files?.[0] ?? null, identity: false, mapping: false, custody: false,
                        })} />
                    </label>
                    <label><input type="checkbox" checked={d.identity} disabled={busy || !d.file}
                      onChange={(e) => patch(source.source_id, { identity: e.target.checked })} />
                      Confirmei pessoalmente que esta origem pertence à cliente indicada, sem inferir por nome ou arquivo.
                    </label>
                    <label><input type="checkbox" checked={d.mapping} disabled={busy || !d.file}
                      onChange={(e) => patch(source.source_id, { mapping: e.target.checked })} />
                      Conferi o significado clínico das coordenadas desta planilha e as perguntas da versão publicada.
                    </label>
                    <label><input type="checkbox" checked={d.custody} disabled={busy || !d.file}
                      onChange={(e) => patch(source.source_id, { custody: e.target.checked })} />
                      Conferi a autorização, a proveniência e a guarda privada do original.
                    </label>
                    {d.result === "blocked" ? <Alert variant="warning">Origem bloqueada. Nada foi confirmado como importado; confira arquivo, associação e ledger.</Alert> : null}
                  </>
                )}
              </div>
            );
          })}
          <Button type="button" loading={busy} disabled={busy || selected.length < 1 || selected.length > MAX_PER_RUN}
            onClick={() => void importSelected()}>
            Guardar {selected.length} origem(ns) revisada(s) — máximo {MAX_PER_RUN}
          </Button>
        </>
      ) : null}
      {message ? <Alert variant="info" live="polite">{message}</Alert> : null}
    </div>
  );
}
