import "server-only";

import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getClientForPrivateFileAdministration } from "@/lib/files/private-file-admin";
import { isUuid } from "@/lib/validation/uuid";

export const dynamic = "force-dynamic";

type RawAnswer = {
  question_id: string;
  sheet_index: number;
  column_index: number;
  row_index: number;
  raw_type: string;
  raw_value: string;
};
function isRawAnswer(value: unknown): value is RawAnswer {
  return value !== null && typeof value === "object"
    && "question_id" in value && isUuid((value as RawAnswer).question_id)
    && "raw_value" in value && typeof (value as RawAnswer).raw_value === "string"
    && "sheet_index" in value && Number.isSafeInteger((value as RawAnswer).sheet_index)
    && "column_index" in value && Number.isSafeInteger((value as RawAnswer).column_index)
    && "row_index" in value && Number.isSafeInteger((value as RawAnswer).row_index)
    && "raw_type" in value && typeof (value as RawAnswer).raw_type === "string";
}

export default async function HistoricalImportDetailPage({ params }: {
  params: Promise<{ clienteId: string; registroId: string }>;
}) {
  await requireRole("admin"); // Relational role + MFA AAL2.
  const { clienteId, registroId } = await params;
  if (!isUuid(clienteId) || !isUuid(registroId)) notFound();
  const client = await getClientForPrivateFileAdministration(clienteId);
  if (!client) notFound();

  const db = await createClient(); // Client session + RLS, no service_role.
  const { data: record, error } = await db.from("historical_anamnesis_imports")
    .select("id,source_id,form_version_id,imported_at,state,original_answers")
    .eq("client_id", client.id).eq("id", registroId).maybeSingle();
  if (error || !record || record.state !== "staged_private") notFound();

  if (!Array.isArray(record.original_answers)
    || record.original_answers.length < 1 || record.original_answers.length > 64
    || !record.original_answers.every(isRawAnswer)) notFound();
  const answers = record.original_answers;
  const { data: questions, error: qError } = await db.from("anamnesis_questions")
    .select("id,label").eq("form_version_id", record.form_version_id)
    .in("id", answers.map(a => a.question_id));
  if (qError) notFound();
  const labels = new Map((questions ?? []).map(q => [q.id, q.label]));

  return (
    <main style={{ display: "grid", gap: "1.5rem" }}>
      <nav><Link href={`/admin/clientes/${client.id}/importacao`}>Voltar à importação</Link></nav>
      <h1>Anamnese histórica — registro privado</h1>
      <p>Este registro é anterior ao aplicativo e foi guardado por revisão administrativa.
        Não é uma submissão atual da cliente nem prova de aceite de consentimento.</p>
      <dl>
        <dt>Origem no lote</dt><dd><code>{record.source_id}</code></dd>
        <dt>Registro</dt><dd><code>{record.id}</code></dd>
        <dt>Data da guarda</dt><dd>{new Date(record.imported_at).toLocaleString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        })}</dd>
      </dl>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead><tr><th>Pergunta da versão registrada</th><th>Célula original</th><th>Tipo</th><th>Resposta original</th></tr></thead>
          <tbody>
            {answers.map((answer) => (
              <tr key={answer.question_id}>
                <td>{labels.get(answer.question_id) ?? <code>{answer.question_id}</code>}</td>
                <td>Aba {answer.sheet_index + 1}, coluna {answer.column_index}, linha {answer.row_index}</td>
                <td>{answer.raw_type}</td>
                <td style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{answer.raw_value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>O Excel original permanece guardado em armazenamento privado, sem link público e sem liberação automática.</p>
    </main>
  );
}
