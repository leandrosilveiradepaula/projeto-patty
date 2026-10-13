import Link from "next/link";
import styles from "./ClientNutritionSupportNavigation.module.css";

/** Links do not imply that an equivalence or educational asset is authorized. */
export function ClientNutritionSupportNavigation({ historical }: { historical: boolean }) {
  return <aside className={styles.guide} aria-labelledby="nutrition-support-title">
    <div className={styles.heading}>
      <h3 id="nutrition-support-title">Precisa consultar uma orientação?</h3>
      <p>{historical ? "Você está lendo uma publicação anterior. Confira seu plano atual antes de usar essas orientações." : "Consulte apenas o que foi liberado para sua conta. Trocas de alimentos e dúvidas sobre doses precisam seguir a orientação da Patty."}</p>
    </div>
    <nav className={styles.actions} aria-label="Apoio ao protocolo alimentar">
      <a href="#refeicoes-publicadas">Rever refeições e doses</a>
      <a href="#ciclos-publicados">Consultar ciclos</a>
      <Link href="/cliente/conteudos">Materiais liberados</Link>
      <Link href="/cliente/feedback-semanal">Enviar feedback à Patty</Link>
    </nav>
    <p className={styles.disclaimer}>Equivalências ou substituições não são geradas automaticamente nesta tela. Use somente orientações e materiais efetivamente publicados para você.</p>
  </aside>;
}
