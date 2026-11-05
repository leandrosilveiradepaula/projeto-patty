import "server-only";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/supabase/auth";
import { Alert } from "@/components/ui/Alert";

/**
 * Admin-only list of staged historical sources. Deliberately does not render
 * raw health answers or storage paths into the HTML/browser by default.
 */
export async function HistoricalAnamnesisStagedList({ clientId }: { clientId: string }) {
  await requireRole("admin");
  const db = await createClient();
  const { data, error } = await db.from("historical_anamnesis_imports")
    .select("id, source_id, state, form_version_id, imported_at")
    .eq("client_id", clientId)
    .order("imported_at", { ascending: false })
    .limit(50);
  if (error) {
    return <Alert variant="warning">
      O histórico privado não está disponível. Verifique se a migration da guarda
      de Anamnese histórica foi aplicada pelo workflow oficial.
    </Alert>;
  }
  if (!data?.length) return <p>Nenhuma Anamnese histórica foi guardada para esta cliente.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead><tr><th>Registro</th><th>Origem</th><th>Situação</th><th>Data de guarda</th></tr></thead>
        <tbody>
          {data.map((record) => (
            <tr key={record.id}>
              <td><code>{record.id}</code></td>
              <td><code>{record.source_id}</code></td>
              <td>{record.state === "staged_private" ? "Guardado — privado" : "Não disponível"}</td>
              <td>{new Date(record.imported_at).toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Estes históricos não são submissões novas, não incluem aceite de consentimento e não estão liberados à cliente.</p>
    </div>
  );
}
