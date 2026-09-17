import type { HTMLAttributes } from "react";
import { ProtocolMealCard } from "./ProtocolMealCard";
import type { ProtocolMealCardProps } from "./ProtocolMealCard";
import styles from "./ProtocolNutritionPlan.module.css";

export type ProtocolNutritionVariant = {
  label: string;
  meals: Array<Omit<ProtocolMealCardProps, "className">>;
};

export type ProtocolNutritionPlanProps = HTMLAttributes<HTMLElement> & {
  fastingGuidance?: string;
  registeredFoodRule?: string;
  variants: ProtocolNutritionVariant[];
};

export function ProtocolNutritionPlan({ className, fastingGuidance, registeredFoodRule, variants, ...props }: ProtocolNutritionPlanProps) {
  const classNames = [styles.plan, className ?? ""].filter(Boolean).join(" ");

  return (
    <div {...props} className={classNames}>
      {fastingGuidance ? <aside className={styles.guidance}><p className={styles.guidanceTitle}>Jejum</p><p className={styles.guidanceText}>{fastingGuidance}</p></aside> : null}
      {registeredFoodRule ? <aside className={styles.guidance}><p className={styles.guidanceTitle}>Regra alimentar registrada</p><p className={styles.guidanceText}>{registeredFoodRule}</p></aside> : null}
      <div className={styles.variants}>
        {variants.map((variant) => <section className={styles.variant} key={variant.label}><h3>{variant.label}</h3><ul className={styles.mealList}>{variant.meals.map((meal) => <li key={`${variant.label}-${meal.order}`}><ProtocolMealCard {...meal} /></li>)}</ul></section>)}
      </div>
    </div>
  );
}
