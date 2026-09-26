import { Card } from "@/components/ui/Card";
import styles from "./AdminMealDraftGuidance.module.css";

type FoodContext = {
  favoriteFoods: string | null;
  leastFavoriteFoods: string | null;
  relationshipWithFood: string | null;
};

type VariantSummary = {
  key: string;
  label: string;
  mealCount: number;
  doseTotals: Array<{
    doseType: string;
    total: number;
  }>;
};

type AdminMealDraftGuidanceProps = {
  foodContext: FoodContext;
  variantSummaries: VariantSummary[];
};

function hasFoodContext(context: FoodContext) {
  return Boolean(
    context.favoriteFoods ||
      context.leastFavoriteFoods ||
      context.relationshipWithFood,
  );
}

export function AdminMealDraftGuidance({
  foodContext,
  variantSummaries,
}: AdminMealDraftGuidanceProps) {
  return (
    <div className={styles.layout}>
      <Card variant="subtle">
        <h5 className={styles.title}>Regras de montagem confirmadas</h5>
        <ul className={styles.rules}>
          <li>Não existe número fixo de refeições; preservar rotina e adesão.</li>
          <li>Horários internos são flexíveis conforme a rotina da cliente.</li>
          <li>
            No jejum intermitente documentado, normalmente são 3 refeições e a
            última ocorre até 12 horas após a primeira.
          </li>
          <li>
            Preferências e substituições devem usar as tabelas/catalogos permitidos.
          </li>
          <li>
            Não aplicar automaticamente regras ainda abertas de gordura, legumes
            ou gordura saturada.
          </li>
        </ul>
      </Card>

      <Card variant="subtle">
        <h5 className={styles.title}>Contexto alimentar da Anamnese</h5>
        {hasFoodContext(foodContext) ? (
          <dl className={styles.context}>
            {foodContext.favoriteFoods ? (
              <div>
                <dt>Alimentos preferidos</dt>
                <dd>{foodContext.favoriteFoods}</dd>
              </div>
            ) : null}
            {foodContext.leastFavoriteFoods ? (
              <div>
                <dt>Alimentos menos preferidos</dt>
                <dd>{foodContext.leastFavoriteFoods}</dd>
              </div>
            ) : null}
            {foodContext.relationshipWithFood ? (
              <div>
                <dt>Relação com a comida</dt>
                <dd>{foodContext.relationshipWithFood}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <p className={styles.empty}>
            Nenhum contexto alimentar da Anamnese enviada está disponível.
          </p>
        )}
      </Card>

      <Card variant="subtle">
        <h5 className={styles.title}>Resumo factual do plano persistido</h5>
        {variantSummaries.length > 0 ? (
          <ul className={styles.variants}>
            {variantSummaries.map((variant) => (
              <li key={variant.key}>
                <strong>{variant.label}</strong>
                <span>{variant.mealCount} refeição(ões) registrada(s)</span>
                {variant.doseTotals.length > 0 ? (
                  <ul className={styles.doses}>
                    {variant.doseTotals.map((dose) => (
                      <li key={dose.doseType}>
                        <span>{dose.doseType}</span>
                        <span>{dose.total}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span>Sem doses registradas.</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>Nenhuma variante alimentar registrada.</p>
        )}
      </Card>
    </div>
  );
}
