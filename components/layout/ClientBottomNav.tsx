"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./ClientBottomNav.module.css";

type ClientNavigationItem = {
  href: string;
  label: string;
};

const clientNavigationItems: ClientNavigationItem[] = [
  { href: "/cliente", label: "Início" },
  { href: "/cliente/protocolo", label: "Protocolo" },
  { href: "/cliente/checkins", label: "Check-ins" },
  { href: "/cliente/feedback-semanal", label: "Feedback" },
  { href: "/cliente/mais", label: "Mais" },
];

const moreSectionPrefixes = [
  "/cliente/anamnese",
  "/cliente/avaliacoes",
  "/cliente/evolucao",
  "/cliente/exercicios",
  "/cliente/conteudos",
  "/cliente/arquivos",
  "/cliente/treino",
  "/cliente/jornada",
  "/cliente/perfil",
];

export function isClientNavigationItemActive(pathname: string, href: string) {
  if (href === "/cliente") {
    return pathname === href;
  }

  if (href === "/cliente/mais") {
    return (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      moreSectionPrefixes.some(
        (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
      )
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ClientBottomNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal da cliente" className={styles.nav}>
      <ul className={styles.list}>
        {clientNavigationItems.map((item) => {
          const isActive = isClientNavigationItemActive(pathname, item.href);

          return (
            <li className={styles.item} key={item.href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={styles.link}
                data-active={isActive ? "true" : undefined}
                href={item.href}
              >
                <span aria-hidden="true" className={styles.marker} />
                <span className={styles.label}>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
