import Link from "next/link";

import styles from "./PageSectionNav.module.css";

export type PageSectionNavItem = {
  href: `#${string}`;
  label: string;
};

export function PageSectionNav({
  items,
  label = "Nesta página",
}: {
  items: PageSectionNavItem[];
  label?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={label} className={styles.nav}>
      <p className={styles.label}>{label}</p>
      <div className={styles.links}>
        {items.map((item) => (
          <Link className={styles.link} href={item.href} key={item.href}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
