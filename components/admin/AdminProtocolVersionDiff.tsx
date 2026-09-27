import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { ProtocolVersionPlanDiff } from "@/lib/protocol/version-diff";

import styles from "./AdminProtocolVersionDiff.module.css";

type AdminProtocolVersionDiffProps = {
  baseVersionId: string | null;
  baseVersionNumber?: number;
  diff: ProtocolVersionPlanDiff | null;
};

function statusLabel(status: ProtocolVersionPlanDiff["variants"][number]["status"]) {
  switch (status) {
    case "added":
      return "Adicionada";
    case "removed":
      return "Removida";
    case "changed":
      return "Alterada";
    case "unchanged":
      return "Sem alteração";
  }
}

function statusVariant(
  status: ProtocolVersionPlanDiff["variants"][number]["status"],
) {
  return status === "unchanged" ? "neutral" : "warning";
}

export function AdminProtocolVersionDiff({
  baseVersionId,
  baseVersionNumber,
  diff,
}: AdminProtocolVersionDiffProps) {
  if (!baseVersionId) {
    return (
      <EmptyState
        description="Esta versão não registra based_on_version_id. O sistema não escolhe automaticamente outra versão como base."
        title="Sem linhagem explícita para comparar"
      />
    );
  }

  if (!diff) {
    return (
      <EmptyState
        description="A versão base ou a versão atual não possui uma estrutura alimentar persistida disponível para comparação."
        title="Comparação indisponível"
      />
    );
  }

  return (
    <div className={styles.layout}>
      <Card variant="subtle">
        <dl className={styles.metadata}>
          <div>
            <dt>Versão base</dt>
            <dd>
              {baseVersionNumber ? `Versão ${baseVersionNumber}` : baseVersionId}
            </dd>
          </div>
          <div>
            <dt>Catálogo de equivalentes</dt>
            <dd>
              {diff.catalogBefore ?? "Não vinculado"} →{" "}
              {diff.catalogAfter ?? "Não vinculado"}
            </dd>
          </div>
        </dl>
        <Badge variant={diff.catalogChanged ? "warning" : "neutral"}>
          {diff.catalogChanged ? "Catálogo alterado" : "Mesmo catálogo"}
        </Badge>
      </Card>

      <div className={styles.block}>
        <h5>Variantes e doses persistidas</h5>
        <ul className={styles.variantList}>
          {diff.variants.map((variant) => (
            <li key={variant.variantKey}>
              <div className={styles.variantHeader}>
                <strong>{variant.variantKey}</strong>
                <Badge variant={statusVariant(variant.status)}>
                  {statusLabel(variant.status)}
                </Badge>
              </div>
              <p>
                Refeições: {variant.beforeMealCount} → {variant.afterMealCount}
              </p>
              {variant.doseTotals.length > 0 ? (
                <dl className={styles.doses}>
                  {variant.doseTotals.map((dose) => (
                    <div key={dose.doseType}>
                      <dt>{dose.doseType}</dt>
                      <dd>
                        {dose.before} → {dose.after}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p>Sem doses registradas nesta variante.</p>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.block}>
        <div className={styles.variantHeader}>
          <h5>Ciclo registrado</h5>
          <Badge variant={diff.cycleChanged ? "warning" : "neutral"}>
            {diff.cycleChanged ? "Ciclo alterado" : "Mesmo ciclo"}
          </Badge>
        </div>
        <div className={styles.cycleGrid}>
          <Card variant="subtle">
            <strong>Base</strong>
            {diff.cycleBefore.length > 0 ? (
              <ol>
                {diff.cycleBefore.map((cycle, index) => (
                  <li key={`before-${index}`}>{cycle || "Ciclo sem passos"}</li>
                ))}
              </ol>
            ) : (
              <p>Sem ciclo registrado.</p>
            )}
          </Card>
          <Card variant="subtle">
            <strong>Atual</strong>
            {diff.cycleAfter.length > 0 ? (
              <ol>
                {diff.cycleAfter.map((cycle, index) => (
                  <li key={`after-${index}`}>{cycle || "Ciclo sem passos"}</li>
                ))}
              </ol>
            ) : (
              <p>Sem ciclo registrado.</p>
            )}
          </Card>
        </div>
      </div>

      <p className={styles.boundary}>
        Esta comparação descreve somente diferenças persistidas. Ela não conclui
        melhora, piora, adequação do protocolo ou próxima fase.
      </p>
    </div>
  );
}
