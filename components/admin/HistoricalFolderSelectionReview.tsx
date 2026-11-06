"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import styles from "./HistoricalFolderSelectionReview.module.css";
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
    && !review.photo_candidates_truncated
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
  return <div className={styles.review}>
    <div className={styles.picker}>
      <p className={styles.pickerTitle}>Escolha a pasta principal dos clientes</p>
      <p className={styles.pickerHint}>
        Os arquivos continuarão no seu computador. Selecione a pasta que contém as
        subpastas com os Excel e as fotografias.
      </p>
      <label>
        <input type="file" className={styles.fileInput} multiple
          aria-label="Selecionar pasta principal dos clientes"
          ref={element=>{
            if(element)element.setAttribute("webkitdirectory","");
          }}
          onChange={e=>chooseFiles(e.currentTarget.files)}/>
        <span className={styles.pickerButton}>Selecionar pasta principal</span>
      </label>
      <p className={styles.privacy}>
        O navegador pode mostrar “Fazer upload de arquivos” ao selecionar uma pasta.
        Esse é o aviso padrão do seletor. Nesta etapa, o aplicativo confere apenas
        nomes de tipos de arquivo, tamanhos e estrutura local: não envia bytes nem
        registra dados no servidor.
      </p>
    </div>
    {review?.state==="blocked"?<Alert variant="warning" live="assertive">
      A pasta não pôde ser conferida. Verifique se cada pasta de cliente contém um Excel,
      se há arquivos em formatos incompatíveis ou se os limites foram ultrapassados.
      Código: {review.errors.join(", ")}. Nenhum arquivo foi importado.
    </Alert>:null}
    {review&&(review.state==="ready_for_local_review"||review.state==="review_with_issues")?<div className={styles.review}>
      <div className={styles.stats} role="status" aria-label="Resumo da pasta selecionada">
        <div className={styles.stat}><strong>{folders.length}</strong><span>Pastas de clientes</span></div>
        <div className={styles.stat}><strong>{review.excels}</strong><span>Planilhas Excel</span></div>
        <div className={styles.stat}><strong>{review.photos}</strong><span>Fotografias</span></div>
      </div>
      <p className={styles.readyNote}>
        {review.files.toLocaleString("pt-BR")} arquivos foram enumerados nesta seleção.
        Esta conferência é local: não lê o conteúdo dos Excel, não verifica identidades,
        não importa fotografias nem comprova que todos os arquivos do disco foram listados.
        Não é necessário revisar todas as fotos agora.
      </p>
      {review.state==="review_with_issues"?<Alert variant="warning" title="Arquivos que precisam de conferência">
        {review.unsupported_count} arquivo(s) em formato ou localização não reconhecida;
        {review.oversize_count} acima dos limites da futura importação;
        {review.client_structure_issues} pasta(s) sem exatamente um Excel.
        Eles permanecem contados no total. Não mova nem apague os originais.
      </Alert>:null}
      {review.photo_candidates_truncated?<p className={styles.readyNote}>
        A amostra opcional abaixo mostra somente {photos.length} de {review.photos.toLocaleString("pt-BR")}
        fotos. As demais continuam contabilizadas, mas não foram revisadas.
        A revisão definitiva será realizada na importação por lotes.
      </p>:null}
      <details className={styles.details}>
        <summary>Conferência opcional das datas das fotos</summary>
        <div className={styles.detailsBody}>
          <p className={styles.detailsIntro}>
            As datas indicadas pelas subpastas são apenas sugestões. Esta lista é uma amostra limitada. As confirmações
            desta seção não são salvas e serão perdidas ao recarregar a página.
            A revisão definitiva ocorrerá na etapa de importação.
          </p>
          <div className={styles.groupGrid}>
            {folders.map(folder=>{
              const group=folderChoices[folder.folder_index]??emptyFolder();
              const related=photos.filter(p=>p.folder_index===folder.folder_index);
              return <section key={folder.folder_index} className={styles.group}>
                <h3>Grupo {folder.folder_index}</h3>
                <p>1 Excel e {folder.photo_count} fotos.
                  {folder.proposed_date_count} foto(s) têm datas sugeridas pelas pastas.</p>
                <label className={styles.check}>
                  <input type="checkbox" checked={group.sameClient}
                    onChange={e=>patchFolder(folder.folder_index,{sameClient:e.target.checked})}/>
                  <span>Conferi que estes arquivos parecem pertencer à mesma cliente.
                    A identificação no banco dependerá de confirmação posterior.</span>
                </label>
                <label className={styles.check}>
                  <input type="checkbox" checked={group.custody}
                    onChange={e=>patchFolder(folder.folder_index,{custody:e.target.checked})}/>
                  <span>Conferi a procedência desta pasta. A autorização para guarda
                    definitiva será validada separadamente.</span>
                </label>
                {related.length?<div className={styles.photos}>
                  <h4>Datas das fotografias</h4>
                  {related.map(photo=>{
                    const d=photoChoices[photo.index]??emptyDate();
                    const valid=d.mode==="unknown"
                      ||(d.mode==="suggested"&&!!photo.proposed_date&&d.date===photo.proposed_date)
                      ||(d.mode==="manual"&&isValidHistoricalPhotoDate(d.date));
                    return <div className={styles.photo} key={photo.index}>
                      <strong>Foto {photo.index}</strong>
                      <p>Data sugerida: {photo.proposed_date??"não identificada"}.</p>
                      <label className={styles.dateField}>
                        Data desta foto
                        <select value={d.mode}
                          onChange={e=>{
                            const mode=e.target.value as PhotoChoice["mode"];
                            patchPhoto(photo.index,{mode,
                              date:mode==="suggested"?(photo.proposed_date??""):""});
                          }}>
                          <option value="pending">Pendente de revisão</option>
                          {photo.proposed_date?<option value="suggested">Confirmar data sugerida</option>:null}
                          <option value="manual">Informar outra data</option>
                          <option value="unknown">Data desconhecida</option>
                        </select>
                      </label>
                      {d.mode==="manual"?<label className={styles.dateField}>
                        Data conferida
                        <input type="date" value={d.date}
                          onChange={e=>patchPhoto(photo.index,{date:e.target.value})}/>
                      </label>:null}
                      <label className={styles.check}>
                        <input type="checkbox" checked={d.confirmed} disabled={!valid}
                          onChange={e=>setPhotoChoices(prev=>({
                            ...prev,[photo.index]:{...(prev[photo.index]??emptyDate()),
                              confirmed:e.target.checked},
                          }))}/>
                        <span>Confirmei minha decisão sobre esta data.</span>
                      </label>
                    </div>;
                  })}
                </div>:null}
              </section>;
            })}
          </div>
          <p className={styles.detailsIntro} role="status">
            Conferidos localmente: {confirmedFolders} de {folders.length} grupos
            e {confirmedPhotos} de {review.photos} fotos.
            {complete?" Pré-conferência concluída; sem importação.":" Ainda há verificações opcionais."}
          </p>
        </div>
      </details>
    </div>:null}
    {notice&&review?.state!=="blocked"?<p role="status">{notice}</p>:null}
  </div>;
}
