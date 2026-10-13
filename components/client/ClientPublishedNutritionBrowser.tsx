"use client";

import { useEffect, useState } from "react";
import { ClientProtocolNutrition, type ClientProtocolNutritionVariant } from "./ClientProtocolNutrition";
import styles from "./ClientPublishedNutritionBrowser.module.css";

type Props = {
  publicationId: string;
  variants: ClientProtocolNutritionVariant[];
};

/**
 * Navigation over an already authorized, exact published snapshot.
 * Selection changes only what is displayed; it does not select a clinical
 * phase, mark adherence or persist anything to the server or browser.
 */
export function ClientPublishedNutritionBrowser({ publicationId, variants }: Props) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");
  const [showAll, setShowAll] = useState(false);
  const [hashTarget, setHashTarget] = useState<string | null>(null);
  const selectedIndex = Math.max(0, variants.findIndex((variant) => variant.id === selectedId));
  const selected = variants[selectedIndex];
  const displayed = showAll ? variants : selected ? [selected] : [];

  useEffect(() => {
    function synchronizeWithAnchor() {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!hash) return;
      const matching = variants.find((variant) =>
        variant.anchorId === hash || variant.meals.some((meal) => meal.anchorId === hash)
      );
      if (!matching) return;
      setSelectedId(matching.id);
      setShowAll(false);
      setHashTarget(hash);
    }
    synchronizeWithAnchor();
    window.addEventListener("hashchange", synchronizeWithAnchor);
    return () => window.removeEventListener("hashchange", synchronizeWithAnchor);
  }, [variants]);

  useEffect(() => {
    if (!hashTarget) return;
    const target = document.getElementById(hashTarget);
    if (!target) return;
    target.scrollIntoView({ block: "start" });
    target.focus({ preventScroll: true });
    setHashTarget(null);
  }, [hashTarget, selectedId, showAll]);

  if (variants.length === 0) {
    return <ClientProtocolNutrition variants={[]} />;
  }

  const changeSelection = (next: number) => {
    if (next < 0 || next >= variants.length) return;
    setSelectedId(variants[next].id);
    setShowAll(false);
  };

  return (
    <div className={styles.browser} aria-label="Consultar variações e refeições publicadas">
      <div className={styles.heading}>
        <h4>Consultar minhas refeições</h4>
        <p>Selecione uma variação para ler suas refeições e doses com mais facilidade. A escolha aqui não define a fase ou a etapa que você deve seguir hoje.</p>
      </div>
      <div className={styles.controls}>
        <label htmlFor={`published-variant-${publicationId}`}>Variação do plano publicado
          <select id={`published-variant-${publicationId}`} value={selected?.id ?? ""} onChange={(event) => changeSelection(variants.findIndex(v => v.id === event.target.value))}>
            {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.label}</option>)}
          </select>
        </label>
        <button type="button" className={styles.allButton} aria-pressed={showAll} onClick={() => setShowAll(value => !value)}>
          {showAll ? "Mostrar uma variação" : "Mostrar todas as variações"}
        </button>
      </div>
      {!showAll ? (
        <nav className={styles.paging} aria-label="Navegar entre variações publicadas">
          <button type="button" disabled={selectedIndex === 0} onClick={() => changeSelection(selectedIndex - 1)}>Variação anterior</button>
          <span role="status">Variação {selectedIndex + 1} de {variants.length} · {selected?.meals.length ?? 0} refeição(ões)</span>
          <button type="button" disabled={selectedIndex === variants.length - 1} onClick={() => changeSelection(selectedIndex + 1)}>Próxima variação</button>
        </nav>
      ) : <p className={styles.allNotice} role="status">Exibindo todas as {variants.length} variações liberadas nesta publicação.</p>}
      <div className={styles.nutrition}>
        <ClientProtocolNutrition variants={displayed} />
      </div>
      <a className={styles.backLink} href={`#ciclos-${publicationId}`}>Voltar à sequência dos ciclos</a>
    </div>
  );
}
