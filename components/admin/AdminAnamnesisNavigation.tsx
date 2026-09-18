import type { AnamnesisCategory } from "@/lib/anamnesis/catalog";
import styles from "./AdminAnamnesisNavigation.module.css";

type AdminAnamnesisNavigationProps = {
  categories: readonly AnamnesisCategory[];
};

export function AdminAnamnesisNavigation({
  categories,
}: AdminAnamnesisNavigationProps) {
  return (
    <nav aria-label="Categorias da anamnese" className={styles.navigation}>
      {categories.map((category) => (
        <a href={`#${category.id}`} key={category.id}>
          {category.label}
        </a>
      ))}
    </nav>
  );
}
