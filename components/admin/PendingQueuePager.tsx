import Link from "next/link";
import { visiblePendingQueuePages, pendingExplorerPageHref, type PendingExplorerState, type PendingQueuePage } from "@/lib/operations/pending-explorer";
import { withClientDirectoryReturn, type ClientDirectoryReturn } from "@/lib/operations/client-directory-return";
import type { OperationalPendingGroup } from "@/lib/operations/pending";
import styles from "@/app/admin/pendencias/page.module.css";

const GROUP_NAMES: Record<OperationalPendingGroup,string> = {patty:"Ações profissionais",client:"Aguardando cliente",operational:"Operacional do sistema"};
const PAGE_KEYS: Record<OperationalPendingGroup,string> = {patty:"paginaPatty",client:"paginaCliente",operational:"paginaSistema"};
const GROUP_ANCHORS: Record<OperationalPendingGroup,string> = {patty:"acao-da-patty",client:"aguardando-cliente",operational:"operacional-do-sistema"};
export function PendingQueuePager({group,filters,page,directoryReturn}:{group:OperationalPendingGroup;filters:PendingExplorerState;page:PendingQueuePage<unknown>;directoryReturn:ClientDirectoryReturn}){
 if(page.total===0)return null;
 const href=(number:number)=>withClientDirectoryReturn(pendingExplorerPageHref(group,filters,number),directoryReturn);
 // Keep all other group pages and the already validated directory/filter context.
 // The selected group's page is supplied by the number input instead.
 const jumpParams=new URL(href(page.page),"https://pending.local").searchParams;
 jumpParams.delete(PAGE_KEYS[group]);
 return <nav aria-label={`Páginas: ${GROUP_NAMES[group]}`} className={styles.groupNavigation}>
  <span role="status">Exibindo {page.from}–{page.to} de {page.total}</span>
  {page.adjusted ? <p className={styles.pageAdjustment} role="status">
   A página solicitada está fora do intervalo. Exibindo a página {page.page} de {page.pageCount}.
   {" "}<Link href={href(page.page)}>Atualizar endereço</Link>
  </p> : null}
  {page.pageCount>1 ? <>
   {page.page>1 ? <Link href={href(page.page-1)}>Anterior</Link> : <span>Anterior</span>}
   {visiblePendingQueuePages(page.page,page.pageCount).map((number,index,all)=><span key={number} className={styles.pageNumber}>
    {index>0 && number-all[index-1]>1 ? <span aria-hidden="true">…</span> : null}
    {number===page.page ? <strong aria-current="page">{number}</strong> : <Link aria-label={`Ir para página ${number} de ${GROUP_NAMES[group]}`} href={href(number)}>{number}</Link>}
   </span>)}
   {page.page<page.pageCount ? <Link href={href(page.page+1)}>Próxima</Link> : <span>Próxima</span>}
  </> : null}
  {page.pageCount>7 ? (
   <form className={styles.pageJump} action={`/admin/pendencias#${GROUP_ANCHORS[group]}`} method="get" aria-label={`Ir diretamente para uma página: ${GROUP_NAMES[group]}`}>
    {[...jumpParams.entries()].map(([name,value])=><input key={name} type="hidden" name={name} value={value}/>)}
    <label htmlFor={`pendencias-pagina-${group}`}>Ir para a página</label>
    <input id={`pendencias-pagina-${group}`} aria-label={`Número da página de ${GROUP_NAMES[group]}`} name={PAGE_KEYS[group]} type="number" min={1} max={page.pageCount} step={1} defaultValue={page.page} inputMode="numeric" required/>
    <button type="submit">Ir</button>
   </form>
  ) : null}
 </nav>;
}
