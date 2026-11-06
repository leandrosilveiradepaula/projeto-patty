"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  isValidHistoricalPhotoDate,
  reviewHistoricalFolderSelection,
  type HistoricalFolderReview,
} from "@/lib/imports/historical-folder-review";

type PhotoChoice=Readonly<{
  mode:"pending"|"suggested"|"manual"|"unknown";
  date:string;
  confirmed:boolean;
}>;
type FolderChoice=Readonly<{sameClient:boolean;custody:boolean}>;
const emptyDate=():PhotoChoice=>({mode:"pending",date:"",confirmed:false});
const emptyFolder=():FolderChoice=>({sameClient:false,custody:false});
const style={display:"grid",gap:"0.75rem"} as const;

/**
 * Browser folder picker is a private, ephemeral PRE-REVIEW only.
 * It never invokes the import API and never persists paths, dates or images.
 * The authoritative ledger, identity association and uploads are distinct steps.
 */
export function HistoricalFolderSelectionReview() {
  const [review,setReview]=useState<HistoricalFolderReview|null>(null);
  const [photoChoices,setPhotoChoices]=useState<Record<number,PhotoChoice>>({});
  const [folderChoices,setFolderChoices]=useState<Record<number,FolderChoice>>({});
  const [notice,setNotice]=useState("");
  const photos=review?.photo_candidates??[];
  const folders=review?.folders??[];
  const confirmedPhotos=photos.filter(p=>{
    const d=photoChoices[p.index];
    return !!d?.confirmed && (
      d.mode==="unknown" ||
      (d.mode==="suggested" && !!p.proposed_date && d.date===p.proposed_date) ||
      (d.mode==="manual" && isValidHistoricalPhotoDate(d.date))
    );
  }).length;
  const confirmedFolders=folders.filter(f=>{
    const d=folderChoices[f.folder_index];
    return d?.sameClient===true&&d.custody===true;
  }).length;
  const complete=review?.state==="ready_for_local_review"
    && confirmedPhotos===photos.length
    && confirmedFolders===folders.length;

  function chooseFiles(files:FileList|null) {
    setReview(null);setPhotoChoices({});setFolderChoices({});setNotice("");
    if(!files||files.length===0)return;
    // Only use names and relative paths inside a pure in-memory review call.
    // No File object or path is stored in React state or sent over the network.
    const scanned=reviewHistoricalFolderSelection(Array.from(files,file=>({
      relativePath:file.webkitRelativePath,size:file.size,
    })));
    setReview(scanned);
    if(scanned.state==="blocked"){
      setNotice("Esta seleção foi bloqueada. Confira estrutura, extensões, limites e um Excel por pasta de cliente.");
    }
  }
  function patchPhoto(id:number,change:Partial<PhotoChoice>) {
    setPhotoChoices(prev=>({
      ...prev,[id]:{...(prev[id]??emptyDate()),...change,confirmed:false},
    }));
  }
  function patchFolder(id:number,change:Partial<FolderChoice>) {
    setFolderChoices(prev=>({
      ...prev,[id]:{...(prev[id]??emptyFolder()),...change},
    }));
  }
  return <div style={style}>
    <p>Selecione a pasta principal que contém as subpastas das clientes. A conferência é
      realizada neste navegador, sem ZIP e sem enviar fotos, Excel, nomes ou datas ao servidor.
      Uma pasta de cliente deve conter um Excel; as fotos podem estar nela ou em subpastas datadas.</p>
    <label style={style}>
      <strong>Selecionar pasta principal do computador</strong>
      <input type="file" multiple
        ref={element=>{
          if(element)element.setAttribute("webkitdirectory","");
        }}
        onChange={e=>chooseFiles(e.currentTarget.files)}/>
    </label>
    <Alert variant="info">
      O navegador pode não listar pastas vazias ou links simbólicos. Esta prévia não comprova
      a integridade total do disco, a identidade de cada cliente ou as datas clínicas.
      As decisões desta tela são temporárias e desaparecem ao atualizar a página.
    </Alert>
    {review?.state==="blocked"?<Alert variant="warning" live="assertive">
      Seleção incompatível. Código de validação: {review.errors.join(", ")}.
      Nenhum arquivo foi importado, registrado ou enviado.
    </Alert>:null}
    {review?.state==="ready_for_local_review"?<div style={style}>
      <Alert variant="info" title="Conferência local — sem gravação">
        {folders.length} pasta(s) de cliente, {review.excels} Excel e {review.photos} foto(s)
        reconhecidos. Dados de saúde e caminhos originais não foram enviados.
      </Alert>
      {folders.map(folder=>{
        const group=folderChoices[folder.folder_index]??emptyFolder();
        const related=photos.filter(p=>p.folder_index===folder.folder_index);
        return <section key={folder.folder_index}
          style={{...style,border:"1px solid var(--color-border)",
            borderRadius:"0.75rem",padding:"1rem",minWidth:0}}>
          <h3>Pasta de cliente {folder.folder_index}</h3>
          <p>1 Excel, {folder.photo_count} foto(s), {folder.proposed_date_count}
            com sugestão de data pela pasta. O nome da pasta não comprova identidade.</p>
          <label>
            <input type="checkbox" checked={group.sameClient}
              onChange={e=>patchFolder(folder.folder_index,{sameClient:e.target.checked})}/>
            Conferi localmente que o Excel e as fotos aparentam pertencer à mesma cliente;
            o vínculo ao cadastro do sistema ainda precisará de validação.
          </label>
          <label>
            <input type="checkbox" checked={group.custody}
              onChange={e=>patchFolder(folder.folder_index,{custody:e.target.checked})}/>
            Conferi a proveniência do acervo desta pasta; a autorização de guarda
            definitiva ainda será verificada na importação.
          </label>
          {related.length?<div style={style}>
            <h4>Datas das fotografias</h4>
            {related.map(photo=>{
              const d=photoChoices[photo.index]??emptyDate();
              const valid=d.mode==="unknown"
                ||(d.mode==="suggested"&&!!photo.proposed_date&&d.date===photo.proposed_date)
                ||(d.mode==="manual"&&isValidHistoricalPhotoDate(d.date));
              return <div key={photo.index}
                style={{...style,borderTop:"1px solid var(--color-border)",paddingTop:"0.65rem"}}>
                <strong>Foto {photo.index} — sem associação clínica</strong>
                <p>Sugestão pela pasta: {photo.proposed_date??"não identificada"}.
                  Essa sugestão não é uma data confirmada.</p>
                <label>Decisão sobre a data
                  <select value={d.mode}
                    onChange={e=>{
                      const mode=e.target.value as PhotoChoice["mode"];
                      patchPhoto(photo.index,{mode,
                        date:mode==="suggested"?(photo.proposed_date??""):""});
                    }}>
                    <option value="pending">Pendente de revisão</option>
                    {photo.proposed_date?<option value="suggested">Utilizar data sugerida</option>:null}
                    <option value="manual">Informar outra data</option>
                    <option value="unknown">Data desconhecida</option>
                  </select>
                </label>
                {d.mode==="manual"?<label>Data verificada na fonte
                  <input type="date" value={d.date}
                    onChange={e=>patchPhoto(photo.index,{date:e.target.value})}/>
                </label>:null}
                <label>
                  <input type="checkbox" checked={d.confirmed}
                    disabled={!valid}
                    onChange={e=>setPhotoChoices(prev=>({
                      ...prev,[photo.index]:{...(prev[photo.index]??emptyDate()),
                        confirmed:e.target.checked},
                    }))}/>
                  Confirmei esta decisão local sobre a data da foto.
                </label>
              </div>;
            })}
          </div>:null}
        </section>;
      })}
      <Alert variant="info" title="Estado da revisão local" live="polite">
        {confirmedFolders} de {folders.length} pasta(s) conferida(s);
        {confirmedPhotos} de {photos.length} foto(s) com decisão de data.
        {complete?" Pré-conferência concluída localmente; ainda não é importação.":" Existem conferências pendentes."}
      </Alert>
    </div>:null}
    {notice?<p role="status">{notice}</p>:null}
  </div>;
}
