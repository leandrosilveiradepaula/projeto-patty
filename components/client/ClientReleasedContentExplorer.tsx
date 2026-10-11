"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  filterReleasedContent, hasActiveReleasedContentFilters, INITIAL_RELEASE_FILTERS,
  paginateReleasedContent, releasePageForExactId, releasedContentFacetOptions,
  releasedContentTotals, type ReleasedContentEntry,
  type ReleasedContentFilters, type ReleasedContentAvailability,
  type ReleasedContentOrder,
} from "@/lib/content/release-explorer";
import styles from "./ClientReleasedContentExplorer.module.css";

export type ReleasedContentDisplayEntry = ReleasedContentEntry & {
  content: ReactNode;
};

export function ClientReleasedContentExplorer({ entries, missingVersionCount }: {
  entries: ReleasedContentDisplayEntry[];
  missingVersionCount: number;
}) {
  const [filters, setFilters] = useState<ReleasedContentFilters>({...INITIAL_RELEASE_FILTERS});
  const [page, setPage] = useState(1);
  const facets = useMemo(() => releasedContentFacetOptions(entries), [entries]);
  const totals = useMemo(() => releasedContentTotals(entries), [entries]);
  const filtered = useMemo(() => filterReleasedContent(entries, filters), [entries, filters]);
  const paged = useMemo(() => paginateReleasedContent(filtered, page), [filtered, page]);

  const change = (update: Partial<ReleasedContentFilters>) => {
    setFilters((current) => ({...current, ...update}));
    setPage(1);
  };

  useEffect(() => {
    const target = window.location.hash;
    if (!target.startsWith("#conteudo-liberado-")) return;
    let id: string;
    try { id = decodeURIComponent(target.slice("#conteudo-liberado-".length)); }
    catch { return; }
    // If someone arrives with a link to an exact authorized release, reveal
    // its existing position; do not expose unseen releases or fetch anything.
    const selected = entries.find((entry) => entry.id === id);
    if (!selected) return;
    const nextPage = releasePageForExactId(entries, selected.id);
    if (nextPage !== null) {
      setFilters({...INITIAL_RELEASE_FILTERS});
      setPage(nextPage);
    }
  }, [entries]);

  const choosePage = (next: number) => {
    setPage(next);
    document.getElementById("biblioteca-educacional")?.scrollIntoView({block: "start"});
  };

  return (
    <div className={styles.container} id="biblioteca-educacional">
      {missingVersionCount > 0 ? (
        <p role="status" className={styles.notice}>
          {missingVersionCount} liberação(ões) possuem versão indisponível para consulta. A Patty pode verificar o registro.
        </p>
      ) : null}
      <p className={styles.summary} role="status">
        {entries.length} versão(ões) liberada(s) para você. {totals.available} com arquivo e {totals.missing} sem arquivo disponível.
      </p>
      <div className={styles.filterPanel} aria-label="Encontrar conteúdos liberados">
        <label className={styles.field}>
          <span>Buscar na sua biblioteca</span>
          <input type="search" maxLength={160} value={filters.query}
            onChange={(event) => change({query:event.target.value})}
            placeholder="Título, categoria ou tipo" />
        </label>
        <label className={styles.field}><span>Categoria</span>
          <select value={filters.category} onChange={(event)=>change({category:event.target.value})}>
            <option value="all">Todas as categorias</option>
            {facets.categories.map((category)=><option value={category} key={category}>{category}</option>)}
          </select>
        </label>
        <label className={styles.field}><span>Tipo</span>
          <select value={filters.type} onChange={(event)=>change({type:event.target.value})}>
            <option value="all">Todos os tipos</option>
            {facets.types.map((type)=><option value={type} key={type}>{type}</option>)}
          </select>
        </label>
        <label className={styles.field}><span>Arquivo</span>
          <select value={filters.availability} onChange={(event)=>change({availability:event.target.value as ReleasedContentAvailability})}>
            <option value="all">Todas as situações</option>
            <option value="available">Com arquivo ({totals.available})</option>
            <option value="missing">Sem arquivo ({totals.missing})</option>
          </select>
        </label>
        <label className={styles.field}><span>Ordenar</span>
          <select value={filters.order} onChange={(event)=>change({order:event.target.value as ReleasedContentOrder})}>
            <option value="newest">Liberados recentemente</option>
            <option value="oldest">Mais antigos</option>
            <option value="title">Título</option>
            <option value="files">Quantidade de arquivos</option>
          </select>
        </label>
        {hasActiveReleasedContentFilters(filters) ? (
          <button type="button" onClick={()=>{setFilters({...INITIAL_RELEASE_FILTERS});setPage(1);}} className={styles.reset}>Limpar filtros</button>
        ) : null}
      </div>
      <p className={styles.summary} role="status" aria-live="polite">
        {filtered.length === 0 ? "Nenhum conteúdo corresponde aos filtros." :
          `Mostrando ${paged.first}–${paged.last} de ${filtered.length} conteúdo(s) encontrado(s).`}
      </p>
      {filtered.length === 0 ? (
        <div className={styles.empty}>Ajuste a busca ou limpe os filtros. Nenhuma liberação foi removida.</div>
      ) : (
        <ul className={styles.list}>
          {paged.items.map((entry) => <li key={entry.id} id={`conteudo-liberado-${entry.id}`} className={styles.item}>{entry.content}</li>)}
        </ul>
      )}
      {paged.pages > 1 ? <nav aria-label="Páginas da biblioteca liberada" className={styles.pagination}>
        <button type="button" disabled={!paged.previous} onClick={()=>paged.previous && choosePage(paged.previous)}>Anterior</button>
        <span>Página {paged.page} de {paged.pages}</span>
        <button type="button" disabled={!paged.next} onClick={()=>paged.next && choosePage(paged.next)}>Próxima</button>
      </nav> : null}
      <p className={styles.footer}>Os filtros são locais e não alteram seus conteúdos liberados ou o histórico de versões.</p>
    </div>
  );
}
