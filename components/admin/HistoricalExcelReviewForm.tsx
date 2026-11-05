"use client";

import { useState } from "react";
import type { PublishedHistoricalAnamnesisTargets } from "@/lib/imports/historical-anamnesis-targets";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import styles from "./HistoricalExcelReviewForm.module.css";

const MAX_EXCEL_BYTES = 20 * 1024 * 1024;

type SourcePreview = {
  state: "pending_professional_review";
  persistence: "none";
  sha256: string;
  column_signature_sha256: string;
  worksheet_count: number;
};

type RawCell = {
  sheet_index: number;
  column_index: number;
  row_index: number;
  raw_type: string;
  raw_value: string;
};
type CellReview = {
  state: "raw_unapproved";
  persistence: "none";
  cell_count: number;
  sample_limit: number;
  cells: RawCell[];
};

type PendingMapping = {
  sheet_index: number;
  column_index: number;
  row_index: number;
  question_id: string;
  raw_value: string;
};

type MappingResult = {
  state: "pending_professional_review";
  persistence: "none";
  approval: "human_required";
  proposed_answer_count: number;
  proposal_sha256: string;
};

type ApiResult = {
  state?: string;
  persistence?: string;
  sha256?: string;
  column_signature_sha256?: string;
  worksheet_count?: number;
  cell_count?: number;
  sample_limit?: number;
  cells?: RawCell[];
  error?: string;
  approval?: string;
  proposed_answer_count?: number;
  proposal_sha256?: string;
  import_id?: string;
  source_id?: string;
  answer_count?: number;
};

export function HistoricalExcelReviewForm({ clientId, targets }: {
  clientId: string;
  targets: PublishedHistoricalAnamnesisTargets | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [preview, setPreview] = useState<SourcePreview | null>(null);
  const [review, setReview] = useState<CellReview | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [columnIndex, setColumnIndex] = useState(1);
  const [pending, setPending] = useState(false);
  const [mappings, setMappings] = useState<PendingMapping[]>([]);
  const [mapped, setMapped] = useState<MappingResult | null>(null);
  const [selectedRow, setSelectedRow] = useState(0);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [batchId, setBatchId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [mappingConfirmed, setMappingConfirmed] = useState(false);
  const [custodyConfirmed, setCustodyConfirmed] = useState(false);
  const [stagedReceipt, setStagedReceipt] = useState<string | null>(null);

  const fileValid = file !== null && file.size > 0 && file.size <= MAX_EXCEL_BYTES
    && /\.xlsx$/i.test(file.name);

  function resetFile(next: File | null) {
    setFile(next);
    setPreview(null);
    setReview(null);
    setMessage(null);
    setSheetIndex(0);
    setColumnIndex(1);
    setIdentityConfirmed(false);
    setMappings([]);
    setMapped(null);
    setSelectedRow(0);
    setSelectedQuestion("");
    setBatchId("");
    setSourceId("");
    setMappingConfirmed(false);
    setCustodyConfirmed(false);
    setStagedReceipt(null);
  }

  async function send(operation: "inspect" | "cells" | "map" | "stage") {
    if (pending || !identityConfirmed || !fileValid || !file) return;
    if (operation === "cells" && (!preview || !Number.isSafeInteger(sheetIndex)
      || sheetIndex < 0 || sheetIndex >= preview.worksheet_count
      || !Number.isSafeInteger(columnIndex) || columnIndex < 1 || columnIndex > 16384)) {
      setMessage("Confira a aba e a coluna antes de consultar valores.");
      return;
    }
    if ((operation === "map" || operation === "stage") && (!preview || !targets || mappings.length === 0)) {
      setMessage("Escolha ao menos uma resposta e um campo de destino para conferir o mapeamento.");
      return;
    }
    if (operation === "stage" && (!mapped || !identityConfirmed || !mappingConfirmed || !custodyConfirmed
      || !/^[0-9a-f-]{36}$/i.test(batchId) || !/^source_[0-9]{4}$/.test(sourceId))) {
      setMessage("Para guardar o histórico é necessário conferir lote, origem, identidade, mapeamento e guarda do arquivo.");
      return;
    }
    setPending(true);
    setMessage(null);
    if (operation !== "stage") setMapped(null);
    setStagedReceipt(null);
    if (operation === "inspect") {
      setPreview(null);
      setReview(null);
    } else if (operation === "cells") {
      setReview(null);
    }
    const data = new FormData();
    data.set("operation", operation);
    data.set("excel", file);
    if ((operation === "cells" || operation === "map" || operation === "stage") && preview) {
      data.set("sha256", preview.sha256);
      data.set("column_signature_sha256", preview.column_signature_sha256);
      if (operation === "cells") {
        data.set("sheet_index", String(sheetIndex));
        data.set("column_index", String(columnIndex));
      } else if (targets) {
        if (operation === "stage") {
          data.set("batch_id", batchId);
          data.set("source_id", sourceId);
          data.set("confirmed_identity", String(identityConfirmed));
          data.set("confirmed_mapping", String(mappingConfirmed));
          data.set("confirmed_custody", String(custodyConfirmed));
        }
        data.set("form_version_id", targets.form_version_id);
        data.set("mappings", JSON.stringify(mappings.map(({ sheet_index, column_index, row_index, question_id }) => ({
          sheet_index, column_index, row_index, question_id,
        }))));
      }
    }
    try {
      const result = await fetch(`/api/admin/clients/${clientId}/historical-excel`, {
        method: "POST",
        credentials: "same-origin",
        body: data,
        cache: "no-store",
      });
      const json: ApiResult = await result.json();
      if (!result.ok || json.error) {
        setMessage(result.status === 409
          ? "O arquivo mudou desde a última conferência. Selecione-o novamente."
          : "A conferência não foi concluída. Verifique se o Excel é válido, íntegro e não ultrapassa os limites.");
        setReview(null);
        return;
      }
      if (operation === "inspect") {
        if (json.state !== "pending_professional_review" || json.persistence !== "none"
          || typeof json.sha256 !== "string" || typeof json.column_signature_sha256 !== "string"
          || typeof json.worksheet_count !== "number") {
          setMessage("Resposta de conferência inesperada.");
          return;
        }
        setPreview(json as SourcePreview);
      } else if (operation === "cells") {
        if (json.state !== "raw_unapproved" || json.persistence !== "none"
          || !Array.isArray(json.cells) || typeof json.cell_count !== "number"
          || typeof json.sample_limit !== "number") {
          setMessage("Resposta de valores inesperada.");
          return;
        }
        setReview(json as CellReview);
        setSelectedRow(json.cells[0]?.row_index ?? 0);
      } else if (operation === "stage") {
        if (json.state !== "staged_private" || typeof json.import_id !== "string"
          || json.source_id !== sourceId || json.answer_count !== mappings.length) {
          setMessage("A guarda privada não foi confirmada. Não considere o histórico importado.");
          return;
        }
        setStagedReceipt(json.import_id);
      } else {
        if (json.state !== "pending_professional_review"
          || json.persistence !== "none" || json.approval !== "human_required"
          || typeof json.proposal_sha256 !== "string"
          || typeof json.proposed_answer_count !== "number") {
          setMessage("O mapeamento foi bloqueado. Confira cada correspondência e os tipos de respostas.");
          return;
        }
        setMapped(json as MappingResult);
      }
    } catch {
      setMessage("Não foi possível conferir o Excel. Nenhum valor foi importado.");
      setReview(null);
    } finally {
      setPending(false);
    }
  }

  function exportFamilyMapping() {
    if (!preview || !targets || !mapped || mappings.length < 1) return;
    // The export contains ONLY reviewed coordinates and versioned question IDs.
    // Do not export any original answers, filenames, names or Client IDs.
    const metadata = {
      version: "historical-family-anamnesis-v1",
      column_signature_sha256: preview.column_signature_sha256,
      form_version_id: targets.form_version_id,
      mappings: mappings.map(({ sheet_index, column_index, row_index, question_id }) => ({
        sheet_index, column_index, row_index, question_id,
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(metadata, null, 2)], {
      type: "application/json",
    }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "mapeamento-familia-anamnese.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function addMapping() {
    if (!review || !targets || !selectedQuestion || pending) return;
    const cell = review.cells.find((item) => item.row_index === selectedRow);
    if (!cell) return;
    if (mappings.some((item) => item.question_id === selectedQuestion
      || (item.sheet_index === cell.sheet_index
        && item.column_index === cell.column_index && item.row_index === cell.row_index))
      || mappings.length >= 64) {
      setMessage("Esta célula ou pergunta já foi escolhida, ou o limite de 64 correspondências foi atingido.");
      return;
    }
    setMappingConfirmed(false);
    setStagedReceipt(null);
    setMappings((current) => [...current, {
      sheet_index: cell.sheet_index, column_index: cell.column_index,
      row_index: cell.row_index, question_id: selectedQuestion, raw_value: cell.raw_value,
    }]);
    setMapped(null);
    setMessage(null);
  }

  return (
    <div className={styles.workspace} aria-busy={pending}>
      <FormField
        id="historical-excel-file"
        label="Planilha histórica da cliente"
        description="Selecione diretamente um arquivo Excel .xlsx, até 20 MB. Não envie um ZIP."
        required
      >
        {(props) => (
          <input
            {...props}
            className={styles.file}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={pending}
            onChange={(event) => resetFile(event.target.files?.[0] ?? null)}
          />
        )}
      </FormField>
      <label className={styles.confirmation}>
        <input type="checkbox" checked={identityConfirmed} disabled={!fileValid || pending}
          onChange={(event) => {
            setIdentityConfirmed(event.target.checked);
            setPreview(null);
            setReview(null);
            setMappings([]);
            setMapped(null);
            setMappingConfirmed(false);
            setCustodyConfirmed(false);
            setStagedReceipt(null);
          }} />
        <span>Conferi que esta planilha pertence à cliente identificada no topo da página. Sei que nomes semelhantes não comprovam identidade.</span>
      </label>

      {!fileValid && file ? (
        <Alert variant="warning">Escolha um XLSX válido de até 20 MB. Planilhas .xls não são aceitas nesta etapa.</Alert>
      ) : null}
      {message ? <Alert variant="warning" live="assertive">{message}</Alert> : null}

      <Button type="button" disabled={!fileValid || !identityConfirmed || pending}
        loading={pending} onClick={() => void send("inspect")}>
        Conferir estrutura do Excel
      </Button>

      {preview ? (
        <div className={styles.preview}>
          <strong>Estrutura reconhecida — sem importação</strong>
          <p>Abas detectadas: {preview.worksheet_count}. A conferência ainda não aprova campos nem interpreta respostas.</p>
          <p>Identificador de integridade: <code>{preview.sha256.slice(0, 16)}</code>…</p>
          <div className={styles.selectors}>
            <FormField id="historical-sheet" label="Índice da aba"
              description={`Começa em zero. Máximo: ${preview.worksheet_count - 1}.`}>
              {(props) => (
                <input {...props} type="number" className={styles.number} min={0}
                  max={preview.worksheet_count - 1} step={1} value={sheetIndex}
                  disabled={pending} onChange={(event) => {
                    setSheetIndex(event.currentTarget.valueAsNumber);
                    setReview(null);
                    setMapped(null);
                  }} />
              )}
            </FormField>
            <FormField id="historical-column" label="Número da coluna"
              description="A=1, B=2, C=3. Não representa automaticamente um campo do sistema.">
              {(props) => (
                <input {...props} type="number" className={styles.number} min={1}
                  max={16384} step={1} value={columnIndex}
                  disabled={pending} onChange={(event) => {
                    setColumnIndex(event.currentTarget.valueAsNumber);
                    setReview(null);
                  }} />
              )}
            </FormField>
          </div>
          <Button type="button" variant="secondary" loading={pending} disabled={pending}
            onClick={() => void send("cells")}>
            Conferir valores originais da coluna
          </Button>
        </div>
      ) : null}

      {review ? (
        <div className={styles.preview} aria-live="polite">
          <strong>Valores originais — apenas conferência profissional</strong>
          <p>{review.cell_count} célula(s) na coluna selecionada. Mostrando até {review.sample_limit} primeiras células. Nenhum dado foi gravado.</p>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead><tr><th>Linha</th><th>Tipo original</th><th>Conteúdo original</th></tr></thead>
              <tbody>
                {review.cells.map((cell) => (
                  <tr key={`${cell.sheet_index}:${cell.column_index}:${cell.row_index}`}>
                    <td>{cell.row_index}</td>
                    <td>{cell.raw_type}</td>
                    <td className={styles.rawValue}>{cell.raw_value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Alert variant="info">
            A leitura não atribui campos de Anamnese, Cadastro Atual ou Avaliação. O mapeamento e a identificação devem ser aprovados antes de qualquer gravação.
          </Alert>
          {targets?.questions.length ? (
            <div className={styles.preview}>
              <strong>Associar célula a pergunta existente</strong>
              <p>Versão publicada da Anamnese: {targets.version_number}. Não existe associação automática por título ou posição.</p>
              <div className={styles.selectors}>
                <FormField id="historical-map-row" label="Linha da resposta">
                  {(props) => (
                    <select {...props} className={styles.number} value={selectedRow}
                      disabled={pending} onChange={(event) => setSelectedRow(Number(event.target.value))}>
                      {review.cells.map((cell) => (
                        <option key={cell.row_index} value={cell.row_index}>Linha {cell.row_index}</option>
                      ))}
                    </select>
                  )}
                </FormField>
                <FormField id="historical-map-question" label="Pergunta de destino">
                  {(props) => (
                    <select {...props} className={styles.number} value={selectedQuestion}
                      disabled={pending} onChange={(event) => setSelectedQuestion(event.target.value)}>
                      <option value="">Selecione uma pergunta</option>
                      {targets.questions.map((question) => (
                        <option key={question.id} value={question.id}>{question.label}</option>
                      ))}
                    </select>
                  )}
                </FormField>
              </div>
              <Button type="button" variant="secondary"
                disabled={pending || !selectedRow || !selectedQuestion} onClick={addMapping}>
                Adicionar correspondência para revisão
              </Button>
            </div>
          ) : <p>Não há perguntas versionadas disponíveis para esta importação.</p>}
        </div>
      ) : null}
      {mappings.length > 0 ? (
        <div className={styles.preview}>
          <strong>Correspondências propostas — sem gravação</strong>
          <p>{mappings.length} campo(s). Os valores originais foram mantidos apenas nesta página e não serão enviados a um cadastro até aprovação e implementação de importação histórica.</p>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead><tr><th>Célula</th><th>Pergunta</th><th>Resposta original</th><th>Ação</th></tr></thead>
              <tbody>
                {mappings.map((item) => (
                  <tr key={item.question_id}>
                    <td>{item.sheet_index + 1} / {item.column_index} / {item.row_index}</td>
                    <td>{targets?.questions.find((target) => target.id === item.question_id)?.label ?? "Pergunta indisponível"}</td>
                    <td className={styles.rawValue}>{item.raw_value}</td>
                    <td><Button size="compact" type="button" variant="outline" disabled={pending}
                      onClick={() => { setMappings((current) => current.filter((a) => a.question_id !== item.question_id)); setMapped(null); }}>Remover</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Button type="button" loading={pending} disabled={pending || !targets || !identityConfirmed}
            onClick={() => void send("map")}>Validar correspondências da Anamnese</Button>
          {mapped ? (
            <Button type="button" variant="secondary" disabled={pending}
              onClick={exportFamilyMapping}>Exportar mapa técnico para o lote (sem respostas)</Button>
          ) : null}
          {mapped ? (
            <Alert variant="info" live="polite" title="Proposta conferida — aprovação profissional pendente">
              {mapped.proposed_answer_count} correspondência(s) estruturalmente válidas. Protocolo de integridade: <code>{mapped.proposal_sha256.slice(0, 16)}</code>… Nenhuma resposta foi gravada.
            </Alert>
          ) : null}
          {mapped ? (
            <div className={styles.preview}>
              <strong>Guardar Anamnese histórica privada</strong>
              <p>Esta etapa só funciona para uma origem Excel já registrada no inventário global e associada explicitamente a esta cliente. A associação no inventário é uma proposta e precisa de conferência humana.</p>
              <FormField id="historical-batch-id" label="ID do lote registrado (UUID)">
                {(props) => <input {...props} className={styles.number} type="text" autoComplete="off"
                  value={batchId} disabled={pending} onChange={(e) => setBatchId(e.target.value.trim())}
                  placeholder="UUID do lote" />}
              </FormField>
              <FormField id="historical-source-id" label="ID da origem Excel no lote">
                {(props) => <input {...props} className={styles.number} type="text" autoComplete="off"
                  value={sourceId} disabled={pending} onChange={(e) => setSourceId(e.target.value.trim())}
                  placeholder="source_0001" />}
              </FormField>
              <label className={styles.confirmation}>
                <input type="checkbox" checked={mappingConfirmed} disabled={pending}
                  onChange={(e) => setMappingConfirmed(e.target.checked)} />
                <span>Conferi profissionalmente a interpretação de cada célula, a pergunta de destino e a versão da Anamnese. Não estou declarando um consentimento passado.</span>
              </label>
              <label className={styles.confirmation}>
                <input type="checkbox" checked={custodyConfirmed} disabled={pending}
                  onChange={(e) => setCustodyConfirmed(e.target.checked)} />
                <span>Conferi a autorização, proveniência e guarda privada do arquivo original. Entendo que o histórico ficará apenas na área profissional.</span>
              </label>
              <Button type="button" loading={pending} disabled={pending || !identityConfirmed
                || !mappingConfirmed || !custodyConfirmed || !batchId || !sourceId}
                onClick={() => void send("stage")}>Guardar histórico privado revisado</Button>
              {stagedReceipt ? <Alert variant="info" live="polite" title="Histórico guardado na área privada">
                {mappings.length} resposta(s) originais preservadas. Registro: <code>{stagedReceipt}</code>. Não foi publicada nenhuma Anamnese à cliente.
              </Alert> : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <p className={styles.notice}>
        Antes da guarda privada, o Excel permanece apenas na memória da conferência. Um histórico guardado é separado de submissões atuais, não ativa a cliente e não libera informações ao portal.
      </p>
    </div>
  );
}
