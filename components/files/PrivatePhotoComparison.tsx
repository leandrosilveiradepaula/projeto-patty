import Link from "next/link";
import {
  eligiblePrivatePhotos,
  resolvePrivatePhotoPair,
  adjacentDistinctPrivatePhoto,
  privatePhotoPairPresets,
  privatePhotoSelectionHref,
  privatePhotoDisplayDate,
  privatePhotoPosition,
  type PrivatePhotoCandidate,
} from "@/lib/files/private-photo-comparison";
import { privateFileSaoPauloDateTime } from "@/lib/files/private-file-calendar";
import { formatPrivateFileSize } from "@/lib/files/private-file-history-view";
import styles from "./PrivatePhotoComparison.module.css";

export function PrivatePhotoComparison<T extends PrivatePhotoCandidate>({
  files, clientId, before, after, path, fileRoute, returnHref,
}: {
  files: readonly T[];
  clientId: string;
  before: unknown;
  after: unknown;
  path: string;
  fileRoute: string;
  returnHref?: string;
}) {
  // Never resolve an arbitrary URL ID or load an unscoped photo: the list was fetched by the caller's permission boundary.
  const photos = eligiblePrivatePhotos(files, clientId);
  const selection = resolvePrivatePhotoPair(photos, before, after);
  const presets = privatePhotoPairPresets(photos);
  const safeContext = returnHref ?? path;
  const href = (beforeId?: string | null, afterId?: string | null) =>
    privatePhotoSelectionHref(safeContext, beforeId, afterId);
  // These fields originate only in the server-generated allowlisted history link, not in raw searchParams.
  const search = safeContext.split("#", 1)[0].split("?")[1] ?? "";
  const contextFields = [...new URLSearchParams(search).entries()]
    .filter(([key]) => key !== "fotoAntes" && key !== "fotoDepois");
  const selectableBefore = typeof before === "string" && photos.some(file => file.id === before) ? before : "";
  const selectableAfter = typeof after === "string" && photos.some(file => file.id === after) ? after : "";
  const beforePrevious = selection.state === "ready"
    ? adjacentDistinctPrivatePhoto(photos, selection.before.id, selection.after.id, 1) : null;
  const beforeNext = selection.state === "ready"
    ? adjacentDistinctPrivatePhoto(photos, selection.before.id, selection.after.id, -1) : null;
  const afterPrevious = selection.state === "ready"
    ? adjacentDistinctPrivatePhoto(photos, selection.after.id, selection.before.id, 1) : null;
  const afterNext = selection.state === "ready"
    ? adjacentDistinctPrivatePhoto(photos, selection.after.id, selection.before.id, -1) : null;

  return <section aria-labelledby="comparar-fotos" className={styles.section}>
    <h2 id="comparar-fotos">Comparar duas fotos privadas</h2>
    <p>Selecione fotos deste cadastro para conferência visual. As datas representam o cadastro do arquivo, não a data em que a foto foi tirada. Nenhuma interpretação corporal é realizada pelo aplicativo.</p>
    <p role="status">{photos.length} foto(s) compatível(is) disponível(is) neste cadastro.</p>
    {photos.length < 2
      ? <p role="status">São necessárias pelo menos duas fotos disponíveis nesta conta para fazer a comparação.</p>
      : <>
        <div className={styles.quickLinks} aria-label="Atalhos para comparar fotos">
          {presets ? <Link href={href(presets.newest.before, presets.newest.after)}>Comparar duas mais recentes</Link> : null}
          {presets?.extremes ? <Link href={href(presets.extremes.before, presets.extremes.after)}>Comparar primeiro e último registros com data válida</Link> : null}
        </div>
        <form action={path + "#comparar-fotos"} method="get" className={styles.form}>
          {contextFields.map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
          <label>Primeira foto
            <select name="fotoAntes" defaultValue={selectableBefore} required>
              <option value="">Selecione</option>
              {photos.map((file,index)=><option key={file.id} value={file.id}>Foto {index+1} de {photos.length} · {file.original_filename?.trim() || "Sem nome"} · {privatePhotoDisplayDate(file.created_at)}</option>)}
            </select>
          </label>
          <label>Segunda foto
            <select name="fotoDepois" defaultValue={selectableAfter} required>
              <option value="">Selecione</option>
              {photos.map((file,index)=><option key={file.id} value={file.id}>Foto {index+1} de {photos.length} · {file.original_filename?.trim() || "Sem nome"} · {privatePhotoDisplayDate(file.created_at)}</option>)}
            </select>
          </label>
          <button type="submit">Comparar fotos</button>
          <Link href={href()}>Limpar seleção</Link>
        </form>
        {selection.state === "partial"
          ? <p role="status">Uma foto foi selecionada. Selecione uma segunda foto diferente para comparar.</p> : null}
        {selection.state === "invalid"
          ? <p role="alert">Selecione duas fotos diferentes disponíveis neste cadastro. Nenhuma foto externa foi carregada.</p> : null}
        {selection.state === "ready" ? <>
          <nav aria-label="Navegação das fotos privadas" className={styles.quickLinks}>
            {beforePrevious ? <Link href={href(beforePrevious.id,selection.after.id)}>Primeira foto anterior</Link> : null}
            {beforeNext ? <Link href={href(beforeNext.id,selection.after.id)}>Primeira foto seguinte</Link> : null}
            {afterPrevious ? <Link href={href(selection.before.id,afterPrevious.id)}>Segunda foto anterior</Link> : null}
            {afterNext ? <Link href={href(selection.before.id,afterNext.id)}>Segunda foto seguinte</Link> : null}
            <Link href={href(selection.after.id,selection.before.id)}>Inverter posições</Link>
          </nav>
          <div className={styles.grid}>
            {([
              {label:"Primeira foto",file:selection.before},
              {label:"Segunda foto",file:selection.after},
            ] as const).map(({label,file})=><figure key={file.id} className={styles.photo}>
              <figcaption>
                <strong>{label} · {privatePhotoPosition(photos,file.id)+1} de {photos.length}</strong>
                <span>{file.original_filename?.trim() || "Foto sem nome informado"}</span>
                <span>Registrada em {privateFileSaoPauloDateTime(file.created_at)}</span>
                {file.byte_size !== undefined ? <span>{formatPrivateFileSize(file.byte_size ?? null)}</span> : null}
              </figcaption>
              <img alt={label + " selecionada para comparação visual"} src={fileRoute+"/"+file.id+"?preview=1"} loading="lazy" referrerPolicy="no-referrer"/>
              <Link href={fileRoute+"/"+file.id} prefetch={false}>Baixar arquivo original</Link>
            </figure>)}
          </div>
        </> : null}
      </>}
  </section>;
}
