"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "./HistoricalInitialLoadLedgerForm.module.css";

const MAX_JSON_BYTES = 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Receipt = {
  batch_id: string;
  status: "pending_review";
  source_count: number;
};

/**
 * The JSON comes from the offline initial-load planner. It contains metadata
 * ONLY. Excel and photo bytes never travel through this component.
 */
export function HistoricalInitialLoadLedgerForm() {
  const [file, setFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function register() {
    if (pending || !file || !confirmed || !UUID.test(batchId)
      || !/\.json$/i.test(file.name) || file.size < 1 || file.size > MAX_JSON_BYTES) {
      setError("Selecione um inventário JSON, confirme o escopo e confira o identificador do lote.");
      return;
    }
    setPending(true);
    setReceipt(null);
    setError(null);
    try {
      const plan: unknown = JSON.parse(await file.text());
      const response = await fetch("/api/admin/imports/initial-load", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batch_id: batchId, plan }),
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== "object"
        || !("batch_id" in payload) || !("status" in payload)
        || !("source_count" in payload)
        || payload.batch_id !== batchId || payload.status !== "pending_review"
        || typeof payload.source_count !== "number") {
        throw new Error("not_registered");
      }
      setReceipt(payload as Receipt);
    } catch {
      // Do not echo source content, errors, file names or private metadata.
      setError("O registro não foi concluído. Verifique o inventário, o identificador e possíveis conflitos. Nenhum dado clínico foi importado.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.form} aria-busy={pending}>
      <label className={styles.field}>
        <strong>Inventário global do acervo (.json)</strong>
        <span>Selecione a saída da ferramenta local de carga inicial. Não selecione planilhas, ZIPs nem fotografias nesta etapa.</span>
        <input type="file" accept=".json,application/json" disabled={pending}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setConfirmed(false);
            setReceipt(null);
            setError(null);
            setBatchId("");
          }} />
      </label>
      <div className={styles.field}>
        <strong>Identificador deste lote</strong>
        <span>Guarde este identificador. Para repetir a mesma solicitação, utilize o mesmo inventário e o mesmo código.</span>
        <div className={styles.codeRow}>
          <input aria-label="Identificador do lote" type="text" value={batchId}
            onChange={(event) => { setBatchId(event.target.value.trim()); setReceipt(null); }}
            disabled={pending} autoComplete="off" spellCheck={false} maxLength={36}
            placeholder="Identificador UUID do lote" />
          <Button type="button" variant="secondary" disabled={pending}
            onClick={() => { setBatchId(crypto.randomUUID()); setReceipt(null); }}>
            Gerar código
          </Button>
        </div>
      </div>
      <label className={styles.confirm}>
        <input type="checkbox" checked={confirmed} disabled={pending}
          onChange={(event) => setConfirmed(event.target.checked)} />
        <span>Confirmei que este JSON contém somente o inventário de Excel e fotos, sem respostas de saúde, nomes, e-mails ou arquivos originais. Entendo que registrar o lote não importa o conteúdo para as clientes.</span>
      </label>
      {file && (file.size < 1 || file.size > MAX_JSON_BYTES || !/\.json$/i.test(file.name))
        ? <Alert variant="warning">Inventário inválido. Selecione somente JSON de até 1 MB.</Alert> : null}
      {error ? <Alert variant="warning" live="assertive">{error}</Alert> : null}
      <Button type="button" loading={pending}
        disabled={pending || !confirmed || !file || !UUID.test(batchId)}
        onClick={() => void register()}>
        Registrar lote para conferência
      </Button>
      {receipt ? (
        <Alert variant="info" title="Lote registrado — revisão pendente" live="polite">
          {receipt.source_count} fonte(s) registradas. Código do lote: <code>{receipt.batch_id}</code>.
          Ainda não houve importação de planilhas para cadastros, anamnese ou avaliações, nem envio de fotos.
        </Alert>
      ) : null}
    </div>
  );
}
