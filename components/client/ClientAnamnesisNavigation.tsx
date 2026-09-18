import type { AnamnesisCategory } from "@/lib/anamnesis/catalog";
import styles from "./ClientAnamnesisNavigation.module.css";

type ClientAnamnesisNavigationProps = {
  categories: readonly AnamnesisCategory[];
};

export function ClientAnamnesisNavigation({
  categories,
}: ClientAnamnesisNavigationProps) {
  return (
    <nav aria-label="Seções da anamnese" className={styles.navigation}>
      <h2>Seções</h2>
      <ul>
        {categories.map((category) => (
          <li key={category.id}>
            <a href={`#${category.id}`}>{category.label}</a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
