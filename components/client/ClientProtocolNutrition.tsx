import type { HTMLAttributes } from "react";
import { ClientProtocolMealCard } from "./ClientProtocolMealCard";
import type { ClientProtocolMealCardProps } from "./ClientProtocolMealCard";
import styles from "./ClientProtocolNutrition.module.css";

export type ClientProtocolNutritionVariant = { label: string; meals: Array<Omit<ClientProtocolMealCardProps, "className">>; };
export type ClientProtocolNutritionProps = HTMLAttributes<HTMLDivElement> & { variants: ClientProtocolNutritionVariant[]; };

export function ClientProtocolNutrition({ className, variants, ...props }: ClientProtocolNutritionProps) {
  const classNames = [styles.nutrition, className ?? ""].filter(Boolean).join(" ");
  return <div {...props} className={classNames}>{variants.map((variant) => <section className={styles.variant} key={variant.label}><h3>{variant.label}</h3><ul>{variant.meals.map((meal) => <li key={`${variant.label}-${meal.order}`}><ClientProtocolMealCard {...meal} /></li>)}</ul></section>)}</div>;
}
