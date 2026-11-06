import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/Alert";

/** Only immutable receipt metadata, never original health values, in this list. */
export async function HistoricalAssessmentStagedList({clientId}:{clientId:string}) {
  await requireRole("admin");
  const db = await createClient();
  const {data,error}=await db.from("historical_assessment_imports")
    .select("id,batch_id,source_id,source_sha256,assessed_on,state,imported_at")
    .eq("client_id",clientId)
    .order("assessed_on",{ascending:false})
    .order("imported_at",{ascending:false})
    .limit(100);
  if (error) return <Alert variant="warning">
    A consulta da guarda histórica de medidas está indisponível.
    A migration pode não estar aplicada; não interprete isso como ausência de avaliações.
  </Alert>;
  if (!data?.length) return <p>Nenhuma medida de avaliação histórica guardada nesta cliente.</p>;
  return (
    <div style={{display:"grid",gap:"0.6rem",minWidth:0}}>
      <p>{data.length} registro(s) de guarda privada exibido(s), até 100 mais recentes.
        São fontes históricas, não avaliações finalizadas nem publicadas.</p>
      <div style={{overflowX:"auto"}}>
        <table>
          <thead><tr><th scope="col">Data da origem</th><th scope="col">Lote</th>
            <th scope="col">Origem</th><th scope="col">Integridade</th>
            <th scope="col">Recibo privado</th></tr></thead>
          <tbody>{data.map((row)=>(
            <tr key={row.id}>
              <td>{row.assessed_on}</td>
              <td><code>{row.batch_id}</code></td>
              <td><code>{row.source_id}</code></td>
              <td><code>{row.source_sha256.slice(0,12)}…</code></td>
              <td><code>{row.id}</code> — {row.state==="staged_private"?"Guardado sem publicação":"Revisão requerida"}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
