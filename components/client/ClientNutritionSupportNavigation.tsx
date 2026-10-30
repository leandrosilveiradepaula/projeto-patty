import Link from "next/link";
import styles from "./ClientNutritionSupportNavigation.module.css";

/** Links do not imply that an equivalence or educational asset is authorized. */
export function ClientNutritionSupportNavigation({ historical, publicationId }: { historical: boolean; publicationId: string }) {
  return <aside className={styles.guide} aria-labelledby="nutrition-support-title">
    <div className={styles.heading}>
      <h3 id="nutrition-support-title">Precisa consultar uma orientação?</h3>
      <p>{historical ? "Você está lendo uma publicação anterior. Confira seu plano atual antes de usar essas orientações." : "Consulte apenas o que foi liberado para sua conta. Trocas de alimentos e dúvidas sobre doses precisam seguir a orientação da equipe profissional."}</p>
    </div>
    <nav className={styles.actions} aria-label="Apoio ao protocolo alimentar">
      <a href={`#variacoes-${publicationId}`}>Rever refeições e doses</a>
      <a href={`#ciclos-${publicationId}`}>Consultar ciclos</a>
      <Link href="/cliente/conteudos">Materiais liberados</Link>
      <Link href="/cliente/feedback-semanal">Enviar feedback semanal</Link>
    </nav>
    <p className={styles.disclaimer}>Equivalências ou substituições não são geradas automaticamente nesta tela. Use somente orientações e materiais efetivamente publicados para você.</p>
  </aside>;
}
