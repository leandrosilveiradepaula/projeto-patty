import type { HTMLAttributes } from "react";
import { ClientProtocolMealCard } from "./ClientProtocolMealCard";
import type { ClientProtocolMealCardProps } from "./ClientProtocolMealCard";
import { EmptyState } from "@/components/ui/EmptyState";
import styles from "./ClientProtocolNutrition.module.css";

export type ClientProtocolNutritionVariant = {
  id: string;
  label: string;
  meals: Array<Omit<ClientProtocolMealCardProps, "className">>;
};
export type ClientProtocolNutritionProps = HTMLAttributes<HTMLDivElement> & { variants: ClientProtocolNutritionVariant[]; };

export function ClientProtocolNutrition({ className, variants, ...props }: ClientProtocolNutritionProps) {
  const classNames = [styles.nutrition, className ?? ""].filter(Boolean).join(" ");
  if (variants.length === 0) {
    return <div {...props} className={classNames}><EmptyState description="Nenhuma variante foi registrada nesta estrutura alimentar." title="Sem variantes registradas" /></div>;
  }

  return <div {...props} className={classNames}>{variants.map((variant) => <section className={styles.variant} key={variant.id}><h3>{variant.label}</h3>{variant.meals.length === 0 ? <EmptyState description="Nenhuma refeição foi registrada nesta variante." title="Sem refeições registradas" /> : <ul>{variant.meals.map((meal) => <li key={meal.order}><ClientProtocolMealCard {...meal} /></li>)}</ul>}</section>)}</div>;
}
