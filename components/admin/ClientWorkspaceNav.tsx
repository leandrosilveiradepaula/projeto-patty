"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./ClientWorkspaceNav.module.css";

type ClientWorkspaceNavProps = {
  clientId: string;
};

export function ClientWorkspaceNav({ clientId }: ClientWorkspaceNavProps) {
  const pathname = usePathname();
  const base = `/admin/clientes/${clientId}`;
  const items = [
    { href: base, label: "Visão geral", exact: true },
    { href: `${base}/anamnese`, label: "Anamnese" },
    { href: `${base}/avaliacoes`, label: "Avaliações" },
    { href: `${base}/evolucao`, label: "Evolução" },
    { href: `${base}/protocolos`, label: "Protocolos" },
    { href: `${base}/arquivos`, label: "Arquivos" },
    { href: `${base}/conteudos`, label: "Conteúdos" },
    { href: `${base}/checkins`, label: "Check-ins" },
    { href: `${base}/feedback-semanal`, label: "Feedback semanal" },
    { href: `${base}#treino`, label: "Treino", hash: "#treino" },
  ];

  return (
    <nav aria-label="Áreas da cliente" className={styles.nav}>
      {items.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : item.hash
            ? false
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            aria-current={isActive ? "page" : undefined}
            className={isActive ? styles.activeLink : styles.link}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
