import { ClientProtocolNutrition } from "@/components/client/ClientProtocolNutrition";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./AdminProtocolVersionPlan.module.css";

export type AdminProtocolVersionPlanData = {
  cycles: Array<{
    id: string;
    steps: Array<{
      position: number;
      variantId: string;
      variantKey: string;
      variantLabel: string | null;
    }>;
  }>;
  foodEquivalentCatalogVersionId: string | null;
  id: string;
  variants: Array<{
    id: string;
    label: string | null;
    variantKey: string;
    meals: Array<{
      id: string;
      label: string | null;
      position: number;
      doseAllocations: Array<{
        doseQuantity: number;
        doseType: string;
        id: string;
      }>;
    }>;
  }>;
};

type AdminProtocolVersionPlanProps = {
  plan: AdminProtocolVersionPlanData | null;
};

export function AdminProtocolVersionPlan({
  plan,
}: AdminProtocolVersionPlanProps) {
  if (!plan) {
    return (
      <EmptyState
        description="Nenhuma estrutura alimentar está vinculada a esta versão."
        title="Sem estrutura alimentar"
      />
    );
  }

  return (
    <div className={styles.plan}>
      <Card variant="subtle">
        <dl className={styles.metadata}>
          <div>
            <dt>ID do plano</dt>
            <dd>{plan.id}</dd>
          </div>
          <div>
            <dt>Versão do catálogo de equivalentes</dt>
            <dd>{plan.foodEquivalentCatalogVersionId ?? "Não vinculada"}</dd>
          </div>
        </dl>
      </Card>

      <div className={styles.block}>
        <h4 className={styles.blockTitle}>Variantes, refeições e doses</h4>
        <ClientProtocolNutrition
          variants={plan.variants.map((variant) => ({
            id: variant.id,
            label: variant.label ?? variant.variantKey,
            meals: variant.meals.map((meal) => ({
              doseGroups: meal.doseAllocations,
              label: meal.label ?? `Refeição ${meal.position}`,
              order: meal.position,
            })),
          }))}
        />
      </div>

      <div className={styles.block}>
        <h4 className={styles.blockTitle}>Ciclo registrado</h4>
        {plan.cycles.length === 0 ? (
          <p className={styles.emptyText}>
            Nenhum ciclo foi registrado nesta versão do plano.
          </p>
        ) : (
          <ol className={styles.cycles}>
            {plan.cycles.map((cycle, cycleIndex) => (
              <li className={styles.cycle} key={cycle.id}>
                <p className={styles.cycleTitle}>Ciclo {cycleIndex + 1}</p>
                {cycle.steps.length === 0 ? (
                  <p className={styles.emptyText}>Sem passos registrados.</p>
                ) : (
                  <ol className={styles.steps}>
                    {cycle.steps.map((step) => (
                      <li key={`${cycle.id}-${step.position}`}>
                        <span>Passo {step.position}</span>
                        <strong>
                          {step.variantLabel ?? step.variantKey}
                        </strong>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
