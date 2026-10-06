"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import styles from "./ClientWorkspaceNav.module.css";

type ClientWorkspaceArea =
  | "visao-geral"
  | "anamnese"
  | "avaliacoes"
  | "evolucao"
  | "protocolos"
  | "arquivos"
  | "conteudos"
  | "checkins"
  | "feedback-semanal"
  | "treino";

type ClientWorkspaceNavProps = {
  activeArea?: ClientWorkspaceArea;
  clientId: string;
};

export function ClientWorkspaceNav({
  activeArea,
  clientId,
}: ClientWorkspaceNavProps) {
  const pathname = usePathname();
  const base = `/admin/clientes/${clientId}`;
  const items: Array<{
    area: ClientWorkspaceArea;
    exact?: boolean;
    href: string;
    label: string;
  }> = [
    { area: "visao-geral", href: base, label: "Visão geral", exact: true },
    { area: "anamnese", href: `${base}/anamnese`, label: "Anamnese" },
    { area: "avaliacoes", href: `${base}/avaliacoes`, label: "Avaliações" },
    { area: "evolucao", href: `${base}/evolucao`, label: "Evolução" },
    { area: "protocolos", href: `${base}/protocolos`, label: "Protocolos" },
    { area: "arquivos", href: `${base}/arquivos`, label: "Arquivos" },
    { area: "conteudos", href: `${base}/conteudos`, label: "Conteúdos" },
    { area: "checkins", href: `${base}/checkins`, label: "Check-ins" },
    {
      area: "feedback-semanal",
      href: `${base}/feedback-semanal`,
      label: "Feedback semanal",
    },
    { area: "treino", href: `${base}/treino`, label: "Treino" },
  ];

  return (
    <nav aria-label="Áreas da cliente" className={styles.nav}>
      {items.map((item) => {
        const isActive = activeArea
          ? activeArea === item.area
          : item.exact
            ? pathname === item.href
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
