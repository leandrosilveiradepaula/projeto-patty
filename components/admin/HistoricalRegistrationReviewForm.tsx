"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { HISTORICAL_REGISTRATION_FIELDS, type HistoricalRegistrationSelection, type HistoricalRegistrationKey } from "@/lib/imports/historical-registration-review";

type Inspection={sha256:string;column_signature_sha256:string;worksheet_count:number};
type Payload={state?:string;persistence?:string;approval?:string;sha256?:string;column_signature_sha256?:string;
  worksheet_count?:number;proposal_sha256?:string;proposed_field_count?:number;import_id?:string;source_id?:string;field_count?:number};
const labels:Record<HistoricalRegistrationKey,string>={
  city:"Cidade",phone:"Telefone de contato",contact_email:"E-mail de contato (não login)",instagram:"Instagram (informativo)",
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function HistoricalRegistrationReviewForm({clientId}:{clientId:string}){
  const [file,setFile]=useState<File|null>(null);
  const [identity,setIdentity]=useState(false);
  const [inspection,setInspection]=useState<Inspection|null>(null);
  const [sheet,setSheet]=useState("0"),[col,setCol]=useState("1"),[row,setRow]=useState("1");
  const [field,setField]=useState<HistoricalRegistrationKey>("city");
  const [selections,setSelections]=useState<HistoricalRegistrationSelection[]>([]);
  const [review,setReview]=useState<Payload|null>(null);
  const [batchId,setBatchId]=useState(""),[sourceId,setSourceId]=useState("");
  const [mapping,setMapping]=useState(false),[custody,setCustody]=useState(false);
  const [receipt,setReceipt]=useState("");
  const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
  function clearReview(){
    setReview(null);setReceipt("");setMapping(false);setCustody(false);
  }
  function reset(next:File|null){
    setFile(next);setIdentity(false);setInspection(null);setSelections([]);
    setBatchId("");setSourceId("");setMessage("");clearReview();
  }
  function add(){
    if(!inspection || selections.length>=4
      || !/^(0|[1-9][0-9]?)$/.test(sheet) || Number(sheet)>=inspection.worksheet_count
      || !/^[1-9][0-9]*$/.test(col)||Number(col)>16384
      || !/^[1-9][0-9]*$/.test(row)||Number(row)>9999999
      || selections.some(s=>s.field_key===field ||
        (s.sheet_index===Number(sheet)&&s.column_index===Number(col)&&s.row_index===Number(row)))) {
      setMessage("Campo ou coordenada inválida ou duplicada.");return;
    }
    setSelections(prev=>[...prev,{
      sheet_index:Number(sheet),column_index:Number(col),row_index:Number(row),field_key:field,
    }]);clearReview();setMessage("");
  }
  async function run(operation:"inspect"|"review_registration"|"stage_registration"){
    if(busy||!file||!identity||file.size<1||file.size>20*1024*1024
      || file.name.length>255||!/\.xlsx$/i.test(file.name))return;
    if(operation!=="inspect"&&(!inspection||selections.length===0))return;
    if(operation==="stage_registration"&&(!review?.proposal_sha256||!uuid.test(batchId)
      || !/^source_[0-9]{4}$/.test(sourceId)||!mapping||!custody))return;
    setBusy(true);setMessage("");
    if(operation!=="stage_registration")clearReview();
    try{
      const body=new FormData();body.set("operation",operation);body.set("excel",file);
      if(inspection&&operation!=="inspect"){
        body.set("sha256",inspection.sha256);
        body.set("column_signature_sha256",inspection.column_signature_sha256);
        body.set("fields",JSON.stringify(selections));body.set("confirmed_identity","true");
      }
      if(operation==="stage_registration"&&review?.proposal_sha256){
        body.set("proposal_sha256",review.proposal_sha256);
        body.set("batch_id",batchId);body.set("source_id",sourceId);
        body.set("confirmed_mapping","true");body.set("confirmed_custody","true");
      }
      const result=await fetch(`/api/admin/clients/${clientId}/historical-excel`,{
        method:"POST",credentials:"same-origin",cache:"no-store",body,
      });
      const data:Payload=await result.json();
      if(!result.ok)throw Error("blocked");
      if(operation==="inspect"){
        if(data.state!=="pending_professional_review"||data.persistence!=="none"
          ||typeof data.sha256!=="string"||typeof data.column_signature_sha256!=="string"
          ||!Number.isSafeInteger(data.worksheet_count))throw Error("blocked");
        setInspection({sha256:data.sha256,column_signature_sha256:data.column_signature_sha256,
          worksheet_count:data.worksheet_count!});setSelections([]);
      }else if(operation==="review_registration"){
        if(data.state!=="pending_professional_review"||data.persistence!=="none"
          ||data.approval!=="human_required"||typeof data.proposal_sha256!=="string"
          ||data.proposed_field_count!==selections.length)throw Error("blocked");
        setReview(data);
      }else{
        if(data.state!=="staged_private"||typeof data.import_id!=="string"
          ||data.field_count!==selections.length||data.source_id!==sourceId)throw Error("blocked");
        setReceipt(data.import_id);
      }
    }catch{
      setMessage("Conferência ou guarda bloqueada. Confira a origem, as correspondências e as autorizações. Nenhuma conclusão foi presumida.");
    }finally{setBusy(false);}
  }
  return <div style={{display:"grid",gap:"0.75rem"}} aria-busy={busy}>
    <p>Esta área guarda somente um retrato cadastral histórico. Não altera Cidade, Telefone, E-mail ou Instagram do Cadastro Atual, nem cria login, senha ou convite.</p>
    <label>Arquivo Excel original (.xlsx)
      <input type="file" accept=".xlsx" disabled={busy}
        onChange={e=>reset(e.target.files?.[0]??null)}/>
    </label>
    <label><input type="checkbox" checked={identity} disabled={busy||!file}
      onChange={e=>{setIdentity(e.target.checked);setInspection(null);setSelections([]);clearReview();}}/>
      Conferi pessoalmente a identidade desta cliente, sem deduzir pelo nome do arquivo.
    </label>
    <Button type="button" variant="secondary" disabled={busy||!file||!identity}
      onClick={()=>void run("inspect")}>Verificar estrutura do Excel</Button>
    {inspection?<div style={{display:"grid",gap:"0.7rem"}}>
      <p>{inspection.worksheet_count} aba(s); hash do arquivo: <code>{inspection.sha256.slice(0,12)}…</code>. Os valores podem ser conferidos no leitor de células acima.</p>
      <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
        <label>Aba (inicia em 0)<input type="number" min={0} max={inspection.worksheet_count-1}
          value={sheet} disabled={busy} onChange={e=>setSheet(e.target.value)}/></label>
        <label>Coluna (A=1)<input type="number" min={1} max={16384}
          value={col} disabled={busy} onChange={e=>setCol(e.target.value)}/></label>
        <label>Linha<input type="number" min={1} max={9999999}
          value={row} disabled={busy} onChange={e=>setRow(e.target.value)}/></label>
      </div>
      <label>Campo histórico revisado
        <select value={field} disabled={busy}
          onChange={e=>setField(e.target.value as HistoricalRegistrationKey)}>
          {HISTORICAL_REGISTRATION_FIELDS.map(key=><option key={key} value={key}>{labels[key]}</option>)}
        </select>
      </label>
      <Button type="button" variant="secondary" disabled={busy||selections.length>=4}
        onClick={add}>Adicionar correspondência</Button>
      {selections.length?<div style={{overflowX:"auto"}}>
        <table><thead><tr><th>Campo</th><th>Célula</th><th>Conferência</th></tr></thead><tbody>
          {selections.map((s,i)=><tr key={s.field_key}><td>{labels[s.field_key]}</td>
            <td>{s.sheet_index}:{s.column_index}:{s.row_index}</td>
            <td><Button type="button" variant="secondary" disabled={busy}
              onClick={()=>{setSelections(prev=>prev.filter((_,j)=>i!==j));clearReview();}}>Remover</Button></td>
          </tr>)}
        </tbody></table>
      </div>:<p>Informe pelo menos uma célula revisada.</p>}
      <Button type="button" disabled={busy||selections.length===0}
        onClick={()=>void run("review_registration")}>Conferir proposta cadastral (sem guardar)</Button>
      {review?<div style={{display:"grid",gap:"0.65rem"}}>
        <Alert variant="info">
          Proposta de {review.proposed_field_count} campo(s) validada estruturalmente.
          Hash: <code>{review.proposal_sha256?.slice(0,16)}…</code>.
          Nenhum Cadastro Atual foi alterado.
        </Alert>
        <label>ID do lote inventariado
          <input value={batchId} disabled={busy} onChange={e=>{setBatchId(e.target.value.trim());setReceipt("");}}
            placeholder="UUID do lote"/></label>
        <label>Origem Excel no lote
          <input value={sourceId} disabled={busy} onChange={e=>{setSourceId(e.target.value.trim());setReceipt("");}}
            placeholder="source_0001"/></label>
        <label><input type="checkbox" checked={mapping} disabled={busy}
          onChange={e=>setMapping(e.target.checked)}/>
          Conferi o significado histórico dos campos e a associação de cada célula, sem atualização do Cadastro Atual.
        </label>
        <label><input type="checkbox" checked={custody} disabled={busy}
          onChange={e=>setCustody(e.target.checked)}/>
          Confirmei a proveniência e autorização para guarda privada desta fonte.
        </label>
        <Button type="button" loading={busy} disabled={busy||!identity||!mapping||!custody||!uuid.test(batchId)
          ||!/^source_[0-9]{4}$/.test(sourceId)}
          onClick={()=>void run("stage_registration")}>
          Guardar retrato cadastral histórico, sem atualizar Cadastro Atual
        </Button>
      </div>:null}
      {receipt?<Alert variant="info">Histórico guardado em privado, sem publicação.
        Recibo: <code>{receipt}</code>.</Alert>:null}
    </div>:null}
    {message?<Alert variant="warning" live="polite">{message}</Alert>:null}
  </div>;
}
