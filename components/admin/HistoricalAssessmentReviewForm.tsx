"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import type { HistoricalMeasurementSelection } from "@/lib/imports/historical-assessment-review";

const MAX_BYTES = 20 * 1024 * 1024;

type Inspected = {
  sha256: string;
  column_signature_sha256: string;
  worksheet_count: number;
};
type Result = {
  state?: string;
  persistence?: string;
  approval?: string;
  proposed_measurement_count?: number;
  proposal_sha256?: string;
  sha256?: string;
  column_signature_sha256?: string;
  worksheet_count?: number;
};

export function HistoricalAssessmentReviewForm({ clientId }: { clientId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [identity, setIdentity] = useState(false);
  const [inspected, setInspected] = useState<Inspected | null>(null);
  const [assessedOn, setAssessedOn] = useState("");
  const [sheet, setSheet] = useState("0");
  const [column, setColumn] = useState("1");
  const [row, setRow] = useState("1");
  const [key, setKey] = useState("");
  const [unit, setUnit] = useState("");
  const [selections, setSelections] = useState<HistoricalMeasurementSelection[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [approvedPreview, setApprovedPreview] = useState<Result | null>(null);

  function reset(next: File | null) {
    setFile(next); setInspected(null); setIdentity(false); setSelections([]);
    setMessage(null); setApprovedPreview(null); setAssessedOn("");
  }
  async function request(operation: "inspect" | "review_measurements") {
    if (busy || !file || !identity || file.size < 1 || file.size > MAX_BYTES
      || !/\.xlsx$/i.test(file.name) || file.name.length > 255) return;
    if (operation === "review_measurements" &&
      (!inspected || selections.length < 1 || !assessedOn)) return;
    setBusy(true);
    setMessage(null);
    setApprovedPreview(null);
    try {
      const body = new FormData();
      body.set("operation", operation);
      body.set("excel", file);
      if (operation === "review_measurements" && inspected) {
        body.set("sha256", inspected.sha256);
        body.set("column_signature_sha256", inspected.column_signature_sha256);
        body.set("assessed_on", assessedOn);
        body.set("measurements", JSON.stringify(selections));
        body.set("confirmed_identity", "true");
      }
      const response = await fetch(`/api/admin/clients/${clientId}/historical-excel`, {
        method: "POST", credentials: "same-origin", cache: "no-store", body,
      });
      const result: Result = await response.json();
      if (!response.ok) throw new Error("blocked");
      if (operation === "inspect") {
        if (result.state !== "pending_professional_review" || result.persistence !== "none"
          || typeof result.sha256 !== "string"
          || typeof result.column_signature_sha256 !== "string"
          || !Number.isSafeInteger(result.worksheet_count)) throw new Error("invalid");
        setInspected({
          sha256: result.sha256, column_signature_sha256: result.column_signature_sha256,
          worksheet_count: result.worksheet_count!,
        });
        setSelections([]);
      } else {
        if (result.state !== "pending_professional_review" || result.persistence !== "none"
          || result.approval !== "human_required"
          || result.proposed_measurement_count !== selections.length
          || typeof result.proposal_sha256 !== "string") throw new Error("invalid");
        setApprovedPreview(result);
      }
    } catch {
      setMessage("A conferência foi bloqueada. Verifique estrutura, células, valores numéricos, data e unidades. Nenhuma avaliação foi gravada.");
      if (operation === "inspect") setInspected(null);
    } finally { setBusy(false); }
  }
  function add() {
    const sheetIndex = Number(sheet), columnIndex = Number(column), rowIndex = Number(row);
    const measurementKey = key.trim();
    const selectedUnit = unit.trim();
    if (!inspected || selections.length >= 40
      || !/^\d+$/.test(sheet) || sheetIndex >= inspected.worksheet_count
      || !/^[1-9]\d*$/.test(column) || columnIndex > 16384
      || !/^[1-9]\d*$/.test(row) || rowIndex > 9999999
      || !/^[a-z][a-z0-9_]{1,119}$/.test(measurementKey)
      || !/^[A-Za-z][A-Za-z0-9_%/.-]{0,39}$/.test(selectedUnit)
      || selections.some((item) => item.measurement_key === measurementKey
        || (item.sheet_index === sheetIndex && item.column_index === columnIndex
          && item.row_index === rowIndex))) {
      setMessage("Correspondência inválida ou repetida. Informe a chave canônica explicitamente e uma unidade válida.");
      return;
    }
    setSelections((prev) => [...prev, {
      sheet_index: sheetIndex, column_index: columnIndex,
      row_index: rowIndex, measurement_key: measurementKey, unit: selectedUnit,
    }]);
    setApprovedPreview(null);
    setMessage(null);
  }
  return (
    <div style={{ display: "grid", gap: "0.8rem", minWidth: 0 }} aria-busy={busy}>
      <p>Use o mesmo Excel da conferência de Anamnese. Selecione manualmente as células da medida, a chave, a unidade e a data real da avaliação. Não há conversão automática, gravação de avaliação, nem liberação para cliente.</p>
      <label>Arquivo Excel (.xlsx, até 20 MB)
        <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={busy} onChange={(e) => reset(e.target.files?.[0] ?? null)} />
      </label>
      <label><input type="checkbox" checked={identity} disabled={!file || busy}
        onChange={(e) => { setIdentity(e.target.checked); setInspected(null); setSelections([]); setApprovedPreview(null); }} />
        Confirmei a associação deste Excel à cliente do cadastro, sem deduzir identidade pelo nome do arquivo.
      </label>
      <Button type="button" variant="secondary" disabled={!file || !identity || busy}
        onClick={() => void request("inspect")}>Validar estrutura do Excel</Button>
      {inspected ? (
        <>
          <Alert variant="info">Estrutura conferida. {inspected.worksheet_count} aba(s). SHA-256: <code>{inspected.sha256.slice(0, 12)}…</code>. Valores originais podem ser inspecionados na ferramenta de conferência de Excel acima.</Alert>
          <label>Data real da avaliação (não inventar datas)
            <input type="date" value={assessedOn} disabled={busy}
              onChange={(e) => { setAssessedOn(e.target.value); setApprovedPreview(null); }} />
          </label>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <label>Índice da aba<input type="number" min={0} max={inspected.worksheet_count - 1}
              value={sheet} disabled={busy} onChange={(e) => setSheet(e.target.value)} /></label>
            <label>Coluna (A=1)<input type="number" min={1} max={16384}
              value={column} disabled={busy} onChange={(e) => setColumn(e.target.value)} /></label>
            <label>Linha<input type="number" min={1} max={9999999}
              value={row} disabled={busy} onChange={(e) => setRow(e.target.value)} /></label>
          </div>
          <label>Chave da medida validada profissionalmente
            <input type="text" placeholder="Ex.: peso" value={key} disabled={busy}
              onChange={(e) => setKey(e.target.value)} />
          </label>
          <label>Unidade original conferida
            <input type="text" placeholder="Ex.: kg" value={unit} disabled={busy}
              onChange={(e) => setUnit(e.target.value)} />
          </label>
          <Button type="button" variant="secondary" onClick={add}
            disabled={busy || selections.length >= 40}>Adicionar medida à proposta</Button>
          <div role="region" aria-label="Medidas propostas" style={{ overflowX: "auto" }}>
            {selections.length ? (
              <table>
                <thead><tr><th>Célula</th><th>Chave informada</th><th>Unidade informada</th><th>Ação</th></tr></thead>
                <tbody>{selections.map((s, i) => (
                  <tr key={`${s.sheet_index}:${s.column_index}:${s.row_index}`}>
                    <td>{s.sheet_index}:{s.column_index}:{s.row_index}</td>
                    <td>{s.measurement_key}</td><td>{s.unit}</td>
                    <td><Button type="button" variant="secondary" disabled={busy} onClick={() => {
                      setSelections((items) => items.filter((_, j) => j !== i));
                      setApprovedPreview(null);
                    }}>Remover</Button></td>
                  </tr>
                ))}</tbody>
              </table>
            ) : <p>Nenhuma medida selecionada.</p>}
          </div>
          <Button type="button" disabled={busy || !assessedOn || !selections.length}
            onClick={() => void request("review_measurements")}>
            Conferir proposta de medidas (sem gravar)
          </Button>
          {approvedPreview ? <Alert variant="info">
            Proposta estrutural gerada: {approvedPreview.proposed_measurement_count} medida(s).
            Identificador técnico <code>{approvedPreview.proposal_sha256?.slice(0, 16)}…</code>.
            A aprovação do mapeamento e a importação de avaliações ainda são etapas separadas. Nenhuma avaliação foi criada.
          </Alert> : null}
        </>
      ) : null}
      {message ? <Alert variant="warning" live="polite">{message}</Alert> : null}
    </div>
  );
}
