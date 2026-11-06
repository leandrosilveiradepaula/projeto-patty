import { requireRole } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/Alert";

/** Receipt metadata only, never contact values or original source contents. */
export async function HistoricalRegistrationStagedList({clientId}:{clientId:string}){
  await requireRole("admin");
  const db=await createClient();
  const {data,error}=await db.from("historical_registration_imports")
    .select("id,batch_id,source_id,source_sha256,state,imported_at")
    .eq("client_id",clientId).order("imported_at",{ascending:false}).limit(100);
  if(error)return <Alert variant="warning">
    Consulta ao cadastro histórico indisponível. A migration pode estar pendente; isso não significa ausência de histórico.
  </Alert>;
  if(!data?.length)return <p>Nenhum retrato cadastral histórico guardado nesta cliente.</p>;
  return <div style={{display:"grid",gap:"0.5rem",minWidth:0}}>
    <p>Até 100 recibos de custódia privada. Nenhum desses registros substitui o Cadastro Atual.</p>
    <div style={{overflowX:"auto"}}><table>
      <thead><tr><th>Lote</th><th>Origem</th><th>Hash</th><th>Estado</th><th>Recibo</th></tr></thead>
      <tbody>{data.map(row=><tr key={row.id}>
        <td><code>{row.batch_id}</code></td>
        <td><code>{row.source_id}</code></td>
        <td><code>{row.source_sha256.slice(0,12)}…</code></td>
        <td>{row.state==="staged_private"?"Guardado sem publicação":"Conferência necessária"}</td>
        <td><code>{row.id}</code></td>
      </tr>)}</tbody>
    </table></div>
  </div>;
}
