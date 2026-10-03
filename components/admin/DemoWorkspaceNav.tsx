import Link from "next/link";

import styles from "./DemoWorkspaceNav.module.css";

const items = [
  { href: "/admin/demo", label: "Visao geral" },
  { href: "/admin/demo/cliente", label: "Cliente" },
  { href: "/admin/demo/protocolo", label: "Protocolo" },
  { href: "/admin/demo/feedback-semanal", label: "Feedback semanal" },
];

export function DemoWorkspaceNav() {
  return (
    <nav aria-label="Fluxo demonstrativo da Patty" className={styles.nav}>
      {items.map((item) => (
        <Link className={styles.link} href={item.href} key={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
