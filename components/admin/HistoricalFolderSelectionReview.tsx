"use client";

import { useRef, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import styles from "./HistoricalFolderSelectionReview.module.css";
import {fingerprintHistoricalPilotFiles,type HistoricalPilotFingerprint} from "@/lib/imports/historical-pilot-local-digest";
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
  const filesRef=useRef<File[]>([]);
  const [fingerprint,setFingerprint]=useState<HistoricalPilotFingerprint|null>(null);
  const [fingerprintBusy,setFingerprintBusy]=useState(false);
  const [fingerprintError,setFingerprintError]=useState(false);
  const [notice,setNotice]=useState("");
  const [selectedFolderName,setSelectedFolderName]=useState<string|null>(null);
  const [hideFolderName,setHideFolderName]=useState(false);
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
    filesRef.current=[];setFingerprint(null);setFingerprintError(false);
    setSelectedFolderName(null);setHideFolderName(false);
    if(!files||files.length===0)return;
    filesRef.current=Array.from(files);
    // webkitRelativePath exposes only the selected directory name and relative
    // children, never a local absolute path. Keep this PII ONLY in client state.
    const firstPath=files[0]?.webkitRelativePath;
    const firstFolder=firstPath?.split("/")[0]??"";
    if(firstFolder.length>0 && firstFolder.length<=255
      && !Array.from(firstFolder).some(ch=>ch.charCodeAt(0)<32 || ch.charCodeAt(0)===127 || ch.charCodeAt(0)===92)
      && Array.from(files).every(file=>file.webkitRelativePath.startsWith(firstFolder+"/"))) {
      setSelectedFolderName(firstFolder);
    }
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

  async function calculateLocalFingerprint() {
    // The trust-boundary scanner below is not a verified ledger. Never upload
    // or persist any result and never infer a Client from a folder name.
    if(fingerprintBusy||!review||filesRef.current.length!==review.files
      ||filesRef.current.length>1200||folders.length!==1
      ||review.state==="blocked"||review.unsupported_count!==review.nested_excel_count
      ||review.oversize_count!==0||review.client_structure_issues!==0
      ||review.excels!==1||review.bytes>300*1024*1024)return;
    setFingerprintBusy(true);setFingerprintError(false);setFingerprint(null);
    try{
      const result=await fingerprintHistoricalPilotFiles(filesRef.current);
      setFingerprint(result);
    }catch{
      setFingerprintError(true);
    }finally{
      setFingerprintBusy(false);
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
      <p className={styles.pickerTitle}>Escolha uma pasta para conferir</p>
      <p className={styles.pickerHint}>
        Você pode começar selecionando diretamente a pasta de uma cliente,
        com seu Excel e suas fotos, inclusive em subpastas por data.
        Depois, a mesma seleção poderá conferir a pasta principal com todas as clientes.
        Não é necessário copiar nem reorganizar os arquivos.
      </p>
      <label>
        <input type="file" className={styles.fileInput} multiple
          aria-label="Selecionar a pasta de uma cliente ou a pasta principal de clientes"
          ref={element=>{
            if(element)element.setAttribute("webkitdirectory","");
          }}
          onChange={e=>chooseFiles(e.currentTarget.files)}/>
        <span className={styles.pickerButton}>Selecionar pasta para conferir</span>
      </label>
      <p className={styles.privacy}>
        O navegador pode mostrar “Fazer upload de arquivos” ao selecionar uma pasta.
        Esse é o aviso padrão do seletor. Nesta etapa, o aplicativo confere apenas
        nomes de tipos de arquivo, tamanhos e estrutura local: não envia bytes nem
        registra dados no servidor.
      </p>
    </div>
    {selectedFolderName?<section className={styles.folderIdentity}
      aria-label="Identificação local da pasta selecionada">
      <div className={styles.folderIdentityText}>
        <strong>Pasta selecionada</strong>
        <p className={styles.folderName} aria-live="polite">
          {hideFolderName?"Nome oculto para privacidade":selectedFolderName}
        </p>
        <p className={styles.folderNote}>
          Nome fornecido pelo navegador, não o caminho completo do computador.
          Apenas conferência local: nenhum arquivo foi importado.
        </p>
      </div>
      <button type="button" className={styles.folderPrivacyButton}
        aria-pressed={hideFolderName}
        onClick={()=>setHideFolderName(value=>!value)}>
        {hideFolderName?"Mostrar nome":"Ocultar nome"}
      </button>
    </section>:null}
    {review?.state==="blocked"?<Alert variant="warning" live="assertive">
      A pasta não pôde ser conferida. Verifique se o caminho é válido, se cada pasta de cliente contém um Excel,
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
        {review.unsupported_count} arquivo(s) em formato ou localização não reconhecida
        (incluindo {review.nested_excel_count} planilha(s) Excel em subpastas);
        {review.oversize_count} acima dos limites da futura importação;
        {review.client_structure_issues} pasta(s) sem exatamente um Excel principal.
        Todos permanecem contados. Nenhum arquivo adicional é associado ou importado
        automaticamente. Não mova nem apague os originais.
      </Alert>:null}
      {review.photo_candidates_truncated?<p className={styles.readyNote}>
        A amostra opcional abaixo mostra somente {photos.length} de {review.photos.toLocaleString("pt-BR")}
        fotos. As demais continuam contabilizadas, mas não foram revisadas.
        A revisão definitiva será realizada na importação por lotes.
      </p>:null}
      <section className={styles.digestPanel} aria-label="Identificação técnica local dos arquivos">
        <h3>Preparação do inventário desta cliente</h3>
        <p>
          Podemos calcular uma impressão digital SHA-256 de cada arquivo selecionado,
          inclusive das planilhas adicionais. Essa leitura só acontece ao clicar
          no botão abaixo; não envia conteúdos, nomes nem caminhos ao servidor.
          As planilhas extras continuam pendentes de análise profissional.
        </p>
        <button type="button" className={styles.digestButton}
          disabled={fingerprintBusy||review.files>1200||review.bytes>300*1024*1024
            ||folders.length!==1||review.excels!==1
            ||review.unsupported_count!==review.nested_excel_count
            ||review.oversize_count!==0||review.client_structure_issues!==0}
          onClick={()=>void calculateLocalFingerprint()}>
          {fingerprintBusy?"Calculando no navegador...":"Identificar arquivos desta cliente"}
        </button>
        {fingerprintError?<Alert variant="warning" live="assertive">
          A identificação local não foi concluída. Nenhum arquivo foi importado.
          Não altere os originais; confira os formatos e limites.
        </Alert>:null}
        {fingerprint?<div role="status" className={styles.digestSummary}>
          <strong>Identificação local concluída — sem gravação</strong>
          <p>{fingerprint.source_count} fontes: {fingerprint.principal_excel_count} Excel principal,
            {" "}{fingerprint.additional_excel_count} Excel adicionais pendentes e
            {" "}{fingerprint.photo_count} fotos.</p>
          <p>{fingerprint.duplicate_binary_count} arquivos com conteúdo duplicado, mantidos
            como origens separadas para revisão.</p>
          <p>Referência técnica local: <code>{fingerprint.inventory_sha256.slice(0,16)}…</code></p>
          <p>Essa referência não é autorização, identificação da cliente, recibo de
            importação nem confirmação das datas das fotos.</p>
        </div>:null}
        {(review.files>1200||review.bytes>300*1024*1024||folders.length!==1
          ||review.unsupported_count!==review.nested_excel_count
          ||review.client_structure_issues!==0||review.oversize_count!==0
          ||review.excels!==1)?<p className={styles.digestHint}>
            Para esta etapa segura, escolha uma única pasta de cliente com um
            Excel principal e sem arquivos fora dos tipos suportados.
            Arquivos extras permanecem contados e não são descartados.
          </p>:null}
      </section>
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
