import Link from "next/link";

import styles from "@/app/admin/clientes/[clienteId]/treino/page.module.css";

export type TrainingWorkspaceStage = "request" | "compose" | "review" | "publish" | "published";

type Props = {
  exerciseCount: number;
  stage: TrainingWorkspaceStage;
};

const stages = [
  { label: "Solicitação", description: "Pedido registrado", id: "solicitacao-treino" },
  { label: "Montagem", description: "Exercícios escolhidos pela Patty", id: "prescricao-treino" },
  { label: "Revisão", description: "Conferência profissional da versão", id: "conferencia-treino" },
  { label: "Publicação", description: "Disponibilização à cliente", id: "publicar-treino" },
] as const;

export function AdminTrainingWorkflowOverview({ stage, exerciseCount }: Props) {
  const activeIndex = stage === "request" ? 0 : stage === "compose" ? 1 : stage === "review" ? 2 : 3;
  const completedThrough = stage === "published" ? 3 : stage === "publish" ? 2 : stage === "review" ? 1 : stage === "compose" ? 0 : -1;
  const next = stage === "request"
    ? { label: "Registrar solicitação", href: "#solicitacao-treino" }
    : stage === "compose"
      ? { label: "Continuar montagem do treino", href: "#prescricao-treino" }
      : stage === "review"
        ? { label: "Conferir antes de revisar", href: "#conferencia-treino" }
        : stage === "publish"
        ? { label: "Conferir versão antes de publicar", href: "#publicar-treino" }
        : { label: "Consultar versões publicadas", href: "#historico-versoes-treino" };

  return (
    <section className={styles.workflowOverview} aria-labelledby="training-workflow-heading">
      <div className={styles.workflowHeading}>
        <div>
          <h2 id="training-workflow-heading">Etapas do treino individual</h2>
          <p>Solicitação, montagem, revisão e publicação são ações separadas. Nada é liberado automaticamente.</p>
        </div>
        <Link className={styles.workflowNext} href={next.href}>{next.label}</Link>
      </div>
      <ol className={styles.workflowStages}>
        {stages.map((item, index) => {
          const status = index <= completedThrough
            ? "Concluída"
            : index === activeIndex
              ? "Etapa atual"
              : "Pendente";
          return (
            <li className={index === activeIndex && stage !== "published" ? styles.workflowActive : undefined} key={item.id}>
              <span className={styles.workflowStageName}>{index + 1}. {item.label}</span>
              <span className={styles.workflowStageStatus}>{status}</span>
              <span className={styles.workflowStageDetail}>{item.description}</span>
            </li>
          );
        })}
      </ol>
      {(stage === "compose" || stage === "review") ? (
        <p className={styles.workflowHint} role="status">
          {exerciseCount === 0
            ? "O rascunho ainda não tem exercícios. Adicione e confira os itens antes de solicitar a revisão."
            : `Rascunho com ${exerciseCount} exercício(s). Confira cada orientação antes de congelar a versão.`}
        </p>
      ) : null}
      {stage === "publish" ? (
        <p className={styles.workflowHint}>A versão já foi revisada e está congelada. Confira o resumo antes de publicar.</p>
      ) : null}
    </section>
  );
}
