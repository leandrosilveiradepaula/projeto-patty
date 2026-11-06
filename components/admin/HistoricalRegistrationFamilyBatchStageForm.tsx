"use client";
import { useState } from "react";
import { parseRegistrationFamilyMapping, type RegistrationFamilyMapping } from "@/lib/imports/historical-registration-family-mapping";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

type Source = Readonly<{
  source_id:string;
  source_sha256:string;
  layout_signature_sha256:string;
  client_id:string;
}>;
type Decision = Readonly<{
  file:File|null;identity:boolean;mapping:boolean;custody:boolean;
  proposal:string|null;result:"pending"|"reviewed"|"saved"|"blocked";receipt?:string;
}>;
const EMPTY=():Decision=>({file:null,identity:false,mapping:false,custody:false,proposal:null,result:"pending"});
const MAX_PER_RUN=5, MAX_BYTES=20*1024*1024;
const HASH=/^[a-f0-9]{64}$/;
const SOURCE=/^source_[0-9]{4}$/;
const hex=(a:ArrayBuffer)=>Array.from(new Uint8Array(a),x=>x.toString(16).padStart(2,"0")).join("");
export function HistoricalRegistrationFamilyBatchStageForm({batchId,sources}:{
  batchId:string;sources:readonly Source[];
}){
  const [mapFile,setMapFile]=useState<File|null>(null);
  const [family,setFamily]=useState<RegistrationFamilyMapping|null>(null);
  const [decisions,setDecisions]=useState<Record<string,Decision>>({});
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const compatible=family?sources.filter(s=>
    s.layout_signature_sha256===family.column_signature_sha256
    && HASH.test(s.source_sha256)&&SOURCE.test(s.source_id)):[];
  const ready=compatible.filter(s=>{
    const d=decisions[s.source_id];
    return d?.file && d.identity && d.mapping && d.custody && d.result==="reviewed"
      && d.proposal && d.receipt===undefined;
  });

  function patch(id:string,change:Partial<Decision>){
    setDecisions(prev=>({...prev,[id]:{
      ...(prev[id]??EMPTY()),...change,proposal:null,
      result:"pending",receipt:undefined,
    }}));
  }
  function resetMap(file:File|null){
    setMapFile(file);setFamily(null);setDecisions({});setMessage("");
  }
  async function loadMap(){
    if(!mapFile || mapFile.size<1 || mapFile.size>16*1024
      || !/\.json$/i.test(mapFile.name)||busy) return;
    try{
      const map=parseRegistrationFamilyMapping(JSON.parse(await mapFile.text()) as unknown);
      setFamily(map);setDecisions({});setMessage("");
    }catch{
      setFamily(null);setDecisions({});
      setMessage("Mapa técnico inválido. Confirme a assinatura, campos permitidos e coordenadas.");
    }
  }
  async function checkFile(source:Source,file:File){
    if(file.size<1||file.size>MAX_BYTES||file.name.length>255||!/\.xlsx$/i.test(file.name))
      throw Error("invalid_xlsx");
    const bytes=await file.arrayBuffer();
    const sha=hex(await crypto.subtle.digest("SHA-256",bytes));
    if(sha!==source.source_sha256)throw Error("source_mismatch");
  }
  function buildForm(source:Source,operation:"review_registration"|"stage_registration",d:Decision){
    if(!family||!d.file)return null;
    const form=new FormData();
    form.set("operation",operation);
    form.set("excel",d.file);
    form.set("sha256",source.source_sha256);
    form.set("column_signature_sha256",family.column_signature_sha256);
    form.set("fields",JSON.stringify(family.fields));
    form.set("confirmed_identity","true");
    if(operation==="stage_registration"&&d.proposal){
      form.set("proposal_sha256",d.proposal);
      form.set("batch_id",batchId);
      form.set("source_id",source.source_id);
      form.set("confirmed_mapping","true");
      form.set("confirmed_custody","true");
    }
    return form;
  }
  async function send(source:Source,operation:"review_registration"|"stage_registration",d:Decision){
    const body=buildForm(source,operation,d);
    if(!body||!d.file)throw Error("not_ready");
    await checkFile(source,d.file);
    const res=await fetch(`/api/admin/clients/${source.client_id}/historical-excel`,{
      method:"POST",credentials:"same-origin",cache:"no-store",body,
    });
    const payload:unknown=await res.json();
    if(!res.ok||!payload||typeof payload!=="object")throw Error("blocked");
    return payload as Record<string,unknown>;
  }
  async function reviewOne(source:Source){
    const d=decisions[source.source_id];
    if(busy||!family||!d?.file||!d.identity||!d.mapping||!d.custody
      ||d.result==="saved")return;
    setBusy(true);setMessage("");
    try{
      const p=await send(source,"review_registration",d);
      if(p.state!=="pending_professional_review"||p.persistence!=="none"
        ||p.approval!=="human_required"||p.proposed_field_count!==family.fields.length
        ||typeof p.proposal_sha256!=="string"||!HASH.test(p.proposal_sha256))
        throw Error("review_blocked");
      setDecisions(prev=>({...prev,[source.source_id]:{
        ...(prev[source.source_id]??EMPTY()),result:"reviewed",
        proposal:p.proposal_sha256 as string,
      }}));
    }catch{
      setDecisions(prev=>({...prev,[source.source_id]:{
        ...EMPTY(),result:"blocked",
      }}));
      setMessage("Prévia bloqueada. Confira a origem e seu mapeamento. Nenhum dado foi guardado.");
    }finally{setBusy(false);}
  }
  async function stageSelected(){
    if(busy||ready.length<1||ready.length>MAX_PER_RUN)return;
    setBusy(true);setMessage("");
    // Capture only currently reviewed decisions; process sequentially, not in background.
    for(const source of ready){
      const d=decisions[source.source_id];
      if(!d?.file||!d.proposal||!d.identity||!d.mapping||!d.custody)continue;
      try{
        const p=await send(source,"stage_registration",d);
        if(p.state!=="staged_private"||p.source_id!==source.source_id
          ||p.field_count!==family?.fields.length||typeof p.import_id!=="string")
          throw Error("stage_blocked");
        setDecisions(prev=>({...prev,[source.source_id]:{
          ...EMPTY(),result:"saved",receipt:p.import_id as string,
        }}));
      }catch{
        setDecisions(prev=>({...prev,[source.source_id]:{
          ...EMPTY(),result:"blocked",
        }}));
      }
    }
    setBusy(false);
    setMessage("Rodada encerrada. Confira os recibos individuais e trate as fontes bloqueadas antes de repetir.");
  }
  return <div style={{display:"grid",gap:"1rem"}} aria-busy={busy}>
    <p>Reutilize um mapa técnico para Excel da mesma estrutura. Cada origem exige
      conferência do arquivo e três decisões independentes; o mapa sozinho não comprova
      identidade, conteúdo, consentimento ou autorização de publicação.</p>
    <label>Mapa de Cadastro Histórico da família (.json, sem respostas)
      <input type="file" accept=".json,application/json" disabled={busy}
        onChange={e=>resetMap(e.target.files?.[0]??null)}/>
    </label>
    <Button type="button" variant="secondary" disabled={!mapFile||busy}
      onClick={()=>void loadMap()}>Conferir mapa da família</Button>
    {family?<div style={{display:"grid",gap:"0.75rem"}}>
      <Alert variant="info">
        Mapa válido: {family.fields.length} campo(s) e {compatible.length} origem(ns)
        da mesma assinatura de layout. Não foram lidos dados de clientes pelo mapa.
      </Alert>
      {compatible.length===0?<p>Não há fontes elegíveis dessa família.</p>:null}
      {compatible.map(source=>{
        const d=decisions[source.source_id]??EMPTY();
        return <div key={source.source_id}
          style={{border:"1px solid var(--border, #8884)",borderRadius:"0.75rem",
            padding:"1rem",display:"grid",gap:"0.6rem"}}>
          <strong>Origem {source.source_id} — SHA {source.source_sha256.slice(0,12)}…</strong>
          <p>Identificador de cliente proposto (não verificado pelo layout):
            <code> {source.client_id}</code></p>
          {d.result==="saved"?<Alert variant="info">
            Histórico guardado privadamente. Recibo: <code>{d.receipt}</code>.
            Nenhum Cadastro Atual foi alterado.
          </Alert>:<>
            <label>Arquivo Excel desta origem (.xlsx)
              <input type="file" accept=".xlsx" disabled={busy}
                onChange={e=>patch(source.source_id,{
                  file:e.target.files?.[0]??null,
                  identity:false,mapping:false,custody:false,
                })}/>
            </label>
            <label><input type="checkbox" checked={d.identity} disabled={!d.file||busy}
              onChange={e=>patch(source.source_id,{identity:e.target.checked})}/>
              Conferi pessoalmente a identidade da cliente para esta origem.
            </label>
            <label><input type="checkbox" checked={d.mapping} disabled={!d.file||busy}
              onChange={e=>patch(source.source_id,{mapping:e.target.checked})}/>
              Conferi as células e o significado histórico dos campos deste Excel.
            </label>
            <label><input type="checkbox" checked={d.custody} disabled={!d.file||busy}
              onChange={e=>patch(source.source_id,{custody:e.target.checked})}/>
              Confirmei proveniência e autorização de guarda privada deste arquivo.
            </label>
            {d.result==="blocked"?<Alert variant="warning">
              Origem bloqueada. Faça nova seleção e revisão individual.
            </Alert>:null}
            {d.result==="reviewed"?<Alert variant="info">
              Prévia validada no servidor. Hash: <code>{d.proposal?.slice(0,16)}…</code>.
              A guarda ainda exige ação separada.
            </Alert>:null}
            <Button type="button" variant="secondary" disabled={busy||!d.file||!d.identity
              ||!d.mapping||!d.custody||d.result==="reviewed"}
              onClick={()=>void reviewOne(source)}>
              Conferir esta origem, sem guardar
            </Button>
          </>}
        </div>;
      })}
      <Button type="button" loading={busy} disabled={busy||ready.length<1||ready.length>MAX_PER_RUN}
        onClick={()=>void stageSelected()}>
        Guardar {ready.length} origem(ns) revisada(s), máximo {MAX_PER_RUN} por rodada
      </Button>
    </div>:null}
    {message?<Alert variant="info" live="polite">{message}</Alert>:null}
  </div>;
}
