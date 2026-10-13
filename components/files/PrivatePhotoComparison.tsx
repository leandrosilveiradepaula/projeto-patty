import Link from "next/link";
import { eligiblePrivatePhotos, resolvePrivatePhotoPair, type PrivatePhotoCandidate, privatePhotoDisplayDate, adjacentPrivatePhoto } from "@/lib/files/private-photo-comparison";
import styles from "./PrivatePhotoComparison.module.css";

export function PrivatePhotoComparison<T extends PrivatePhotoCandidate>({ files, clientId, before, after, path, fileRoute }: {
 files: readonly T[]; clientId:string; before:unknown; after:unknown; path:string; fileRoute:string;
}) {
 const photos=eligiblePrivatePhotos(files,clientId);
 const selection=resolvePrivatePhotoPair(photos,before,after);
 return <section aria-labelledby="comparar-fotos" className={styles.section}>
  <h2 id="comparar-fotos">Comparar duas fotos privadas</h2>
  <p>Selecione duas fotos do mesmo cadastro para conferência visual. Nenhuma interpretação, análise corporal ou classificação é realizada pelo aplicativo.</p>
  {photos.length < 2 ? <p role="status">São necessárias pelo menos duas fotos disponíveis nesta conta para fazer a comparação.</p> : <>
   <form action={path} method="get" className={styles.form}>
     <label>Primeira foto
       <select name="fotoAntes" defaultValue={typeof before==="string"?before:""} required>
         <option value="">Selecione</option>
         {photos.map(file=><option key={file.id} value={file.id}>{file.original_filename?.trim()||"Foto sem nome"} · {privatePhotoDisplayDate(file.created_at)}</option>)}
       </select>
     </label>
     <label>Segunda foto
       <select name="fotoDepois" defaultValue={typeof after==="string"?after:""} required>
         <option value="">Selecione</option>
         {photos.map(file=><option key={file.id} value={file.id}>{file.original_filename?.trim()||"Foto sem nome"} · {file.created_at.slice(0,10)}</option>)}
       </select>
     </label>
     <button type="submit">Comparar fotos</button>
     <Link href={path+"#comparar-fotos"}>Limpar seleção</Link>
   </form>
   {selection.state==="invalid"?<p role="alert">Selecione duas fotos diferentes disponíveis neste cadastro. Nenhuma foto externa foi carregada.</p>:null}
   {selection.state==="ready"?<nav aria-label="Navegação das fotos privadas" className={styles.form}>
    {adjacentPrivatePhoto(photos,selection.before.id,1)?<Link href={path+"?fotoAntes="+encodeURIComponent(adjacentPrivatePhoto(photos,selection.before.id,1)!.id)+"&fotoDepois="+encodeURIComponent(selection.after.id)+"#comparar-fotos"}>Primeira foto anterior</Link>:null}
    {adjacentPrivatePhoto(photos,selection.before.id,-1)?<Link href={path+"?fotoAntes="+encodeURIComponent(adjacentPrivatePhoto(photos,selection.before.id,-1)!.id)+"&fotoDepois="+encodeURIComponent(selection.after.id)+"#comparar-fotos"}>Primeira foto seguinte</Link>:null}
    {adjacentPrivatePhoto(photos,selection.after.id,1)?<Link href={path+"?fotoAntes="+encodeURIComponent(selection.before.id)+"&fotoDepois="+encodeURIComponent(adjacentPrivatePhoto(photos,selection.after.id,1)!.id)+"#comparar-fotos"}>Segunda foto anterior</Link>:null}
    {adjacentPrivatePhoto(photos,selection.after.id,-1)?<Link href={path+"?fotoAntes="+encodeURIComponent(selection.before.id)+"&fotoDepois="+encodeURIComponent(adjacentPrivatePhoto(photos,selection.after.id,-1)!.id)+"#comparar-fotos"}>Segunda foto seguinte</Link>:null}
   </nav>:null}
   {selection.state==="ready"?<div className={styles.grid}>
    {([{label:"Primeira foto",file:selection.before},{label:"Segunda foto",file:selection.after}] as const).map(({label,file})=><figure key={file.id} className={styles.photo}>
      <figcaption><strong>{label}</strong><span>{file.original_filename?.trim()||"Foto sem nome"}</span></figcaption>
      <img alt={label+" selecionada para comparação visual"} src={fileRoute+"/"+file.id+"?preview=1"} loading="lazy" referrerPolicy="no-referrer"/>
      <Link href={fileRoute+"/"+file.id} prefetch={false}>Baixar arquivo original</Link>
    </figure>)}
   </div>:null}
  </>}
 </section>;
}
