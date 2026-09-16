import type { HTMLAttributes } from "react";
import styles from "./EvaluationMeasureComparison.module.css";

export type EvaluationMeasureComparisonItem = {
  label: string;
  previousValue?: string;
  currentValue?: string;
  unit?: string;
};

export type EvaluationMeasureComparisonProps =
  HTMLAttributes<HTMLDivElement> & {
    currentDate: string;
    items: EvaluationMeasureComparisonItem[];
    previousDate: string;
  };

function formatMeasureValue(value: string | undefined, unit: string | undefined) {
  if (!value) {
    return "Não registrado";
  }

  return unit ? `${value} ${unit}` : value;
}

export function EvaluationMeasureComparison({
  className,
  currentDate,
  items,
  previousDate,
  ...props
}: EvaluationMeasureComparisonProps) {
  const classNames = [styles.comparison, className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div {...props} className={classNames}>
      <table className={styles.table}>
        <caption className={styles.caption}>
          Comparação factual entre avaliações demonstrativas.
        </caption>
        <thead>
          <tr>
            <th scope="col">Medida</th>
            <th scope="col">
              <span>Avaliação anterior</span>
              <span className={styles.date}>{previousDate}</span>
            </th>
            <th scope="col">
              <span>Avaliação atual</span>
              <span className={styles.date}>{currentDate}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.label}>
              <th data-label="Medida" scope="row">
                {item.label}
              </th>
              <td data-label={`Avaliação anterior ${previousDate}`}>
                {formatMeasureValue(item.previousValue, item.unit)}
              </td>
              <td data-label={`Avaliação atual ${currentDate}`}>
                {formatMeasureValue(item.currentValue, item.unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
