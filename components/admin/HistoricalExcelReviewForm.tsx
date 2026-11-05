"use client";

import { useState } from "react";
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

type ApiResult = Partial<SourcePreview & CellReview> & { error?: string };

export function HistoricalExcelReviewForm({ clientId }: { clientId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [preview, setPreview] = useState<SourcePreview | null>(null);
  const [review, setReview] = useState<CellReview | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [columnIndex, setColumnIndex] = useState(1);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
  }

  async function send(operation: "inspect" | "cells") {
    if (pending || !identityConfirmed || !fileValid || !file) return;
    if (operation === "cells" && (!preview || !Number.isSafeInteger(sheetIndex)
      || sheetIndex < 0 || sheetIndex >= preview.worksheet_count
      || !Number.isSafeInteger(columnIndex) || columnIndex < 1 || columnIndex > 16384)) {
      setMessage("Confira a aba e a coluna antes de consultar valores.");
      return;
    }
    setPending(true);
    setMessage(null);
    if (operation === "inspect") {
      setPreview(null);
      setReview(null);
    } else {
      setReview(null);
    }
    const data = new FormData();
    data.set("operation", operation);
    data.set("excel", file);
    if (operation === "cells" && preview) {
      data.set("sha256", preview.sha256);
      data.set("column_signature_sha256", preview.column_signature_sha256);
      data.set("sheet_index", String(sheetIndex));
      data.set("column_index", String(columnIndex));
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
      } else {
        if (json.state !== "raw_unapproved" || json.persistence !== "none"
          || !Array.isArray(json.cells) || typeof json.cell_count !== "number"
          || typeof json.sample_limit !== "number") {
          setMessage("Resposta de valores inesperada.");
          return;
        }
        setReview(json as CellReview);
      }
    } catch {
      setMessage("Não foi possível conferir o Excel. Nenhum valor foi importado.");
      setReview(null);
    } finally {
      setPending(false);
    }
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
        </div>
      ) : null}
      <p className={styles.notice}>
        O Excel não é armazenado nesta etapa. Não substitui respostas originais, não ativa a cliente e não libera informações para a cliente.
      </p>
    </div>
  );
}
