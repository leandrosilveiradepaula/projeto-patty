import Link from "next/link";
import { visiblePendingQueuePages, pendingExplorerPageHref, type PendingExplorerState, type PendingQueuePage } from "@/lib/operations/pending-explorer";
import { withClientDirectoryReturn, type ClientDirectoryReturn } from "@/lib/operations/client-directory-return";
import type { OperationalPendingGroup } from "@/lib/operations/pending";
import styles from "@/app/admin/pendencias/page.module.css";

const GROUP_NAMES: Record<OperationalPendingGroup,string> = {patty:"Ações da Patty",client:"Aguardando cliente",operational:"Operacional do sistema"};
export function PendingQueuePager({group,filters,page,directoryReturn}:{group:OperationalPendingGroup;filters:PendingExplorerState;page:PendingQueuePage<unknown>;directoryReturn:ClientDirectoryReturn}){
 if(page.total===0)return null;
 const href=(number:number)=>withClientDirectoryReturn(pendingExplorerPageHref(group,filters,number),directoryReturn);
 return <nav aria-label={`Páginas: ${GROUP_NAMES[group]}`} className={styles.groupNavigation}>
  <span role="status">Exibindo {page.from}–{page.to} de {page.total}</span>
  {page.pageCount>1 ? <>
   {page.page>1 ? <Link href={href(page.page-1)}>Anterior</Link> : <span>Anterior</span>}
   {visiblePendingQueuePages(page.page,page.pageCount).map((number,index,all)=><span key={number} className={styles.pageNumber}>
    {index>0 && number-all[index-1]>1 ? <span aria-hidden="true">…</span> : null}
    {number===page.page ? <strong aria-current="page">{number}</strong> : <Link aria-label={`Ir para página ${number} de ${GROUP_NAMES[group]}`} href={href(number)}>{number}</Link>}
   </span>)}
   {page.page<page.pageCount ? <Link href={href(page.page+1)}>Próxima</Link> : <span>Próxima</span>}
  </> : null}
 </nav>;
}
