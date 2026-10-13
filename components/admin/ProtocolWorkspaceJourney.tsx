import type { ProtocolLifecycleAction } from "@/lib/protocol/lifecycle";
import styles from "./ProtocolWorkspaceJourney.module.css";

type Props = {
  action: ProtocolLifecycleAction;
  hasPlan: boolean;
  ready: boolean;
  versionNumber: number;
};

const stages = [
  { label: "Montagem", description: "Editar a estrutura alimentar", anchor: "rascunho-plano-iniciar" },
  { label: "Revisão", description: "Submeter a versão para revisão", anchor: "conferencia-plano" },
  { label: "Aprovação", description: "Registrar aprovação profissional", anchor: "acao-protocolo" },
  { label: "Publicação", description: "Liberar a versão aprovada", anchor: "acao-protocolo" },
] as const;

/** A display of persisted lifecycle facts, not an automatic clinical decision. */
export function ProtocolWorkspaceJourney({ action, hasPlan, ready, versionNumber }: Props) {
  const active = action === "submit" ? 0 : action === "approve" ? 2 : action === "publish" ? 3 : 4;
  const next = action === "submit"
    ? { href: hasPlan && ready ? "#conferencia-plano" : "#rascunho-plano-iniciar",
        label: hasPlan && ready ? "Conferir estrutura antes de submeter" : "Continuar montagem" }
    : action === "approve"
      ? { href: "#acao-protocolo", label: "Ir para aprovação" }
      : action === "publish"
        ? { href: "#acao-protocolo", label: "Ir para publicação" }
        : { href: "#conferencia-plano", label: "Consultar versão publicada" };

  return (
    <section className={styles.journey} aria-label={`Etapas da versão ${versionNumber}`}>
      <div className={styles.header}>
        <div>
          <h4>Etapas da versão {versionNumber}</h4>
          <p>Montagem, revisão, aprovação e publicação são operações diferentes. Nada é publicado automaticamente.</p>
        </div>
        <a className={styles.next} href={next.href}>{next.label}</a>
      </div>
      <ol className={styles.steps}>
        {stages.map((stage, index) => {
          const state = action === "complete" || index < active
            ? "Concluída" : index === active
              ? "Etapa atual" : "Pendente";
          return <li key={stage.label} className={index === active ? styles.current : undefined}>
            <strong>{index + 1}. {stage.label}</strong>
            <span>{state}</span>
            <small>{stage.description}</small>
          </li>;
        })}
      </ol>
      {action === "submit" ? <p className={styles.hint} role="status">
        {ready ? "A estrutura mínima técnica foi registrada. Confira todas as informações e decida manualmente quando enviar para revisão."
          : "A estrutura mínima ainda exige conferência. Use o mapa de pendências para localizar o que falta."}
      </p> : null}
    </section>
  );
}
