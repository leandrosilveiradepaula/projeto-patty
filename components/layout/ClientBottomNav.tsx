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
  { href: "/cliente/anamnese", label: "Anamnese" },
  { href: "/cliente/protocolo", label: "Protocolo" },
  { href: "/cliente/conteudos", label: "Conteúdos" },
  { href: "/cliente/perfil", label: "Perfil" },
];

export function isClientNavigationItemActive(pathname: string, href: string) {
  if (href === "/cliente") {
    return pathname === href;
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
