"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import styles from "./AdminSidebar.module.css";

type AdminNavigationItem = {
  href: string;
  label: string;
};

const adminNavigationItems: AdminNavigationItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/pendencias", label: "Pendências" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/arquivos", label: "Arquivos" },
  { href: "/admin/avaliacoes", label: "Avaliações" },
  { href: "/admin/protocolos", label: "Protocolos" },
  { href: "/admin/conteudos", label: "Conteúdos" },
  { href: "/admin/exercicios", label: "Exercícios" },
  { href: "/admin/ia", label: "IA" },
];

export function isAdminNavigationItemActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === href;
  }

  if (href === "/admin/arquivos") {
    if (
      pathname === href ||
      pathname.startsWith(`${href}/`) ||
      /^\/admin\/clientes\/[^/]+\/arquivos(?:\/|$)/.test(pathname)
    ) {
      return true;
    }
  }

  if (href === "/admin/clientes") {
    if (/^\/admin\/clientes\/[^/]+\/arquivos(?:\/|$)/.test(pathname)) {
      return false;
    }

    if (pathname.startsWith("/admin/anamneses/")) {
      return true;
    }
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

type AdminSidebarProps = {
  displayName?: string | null;
  mode?: "desktop" | "mobile";
};

export function AdminSidebar({ displayName, mode = "desktop" }: AdminSidebarProps) {
  const pathname = usePathname();
  const drawerId = useId();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (mode === "mobile") {
    return (
      <div className={styles.mobileNavigation}>
        <span className={styles.mobileBrand}>Corpo &amp; Mente</span>
        <button
          aria-label="Abrir navegação administrativa"
          aria-controls={drawerId}
          aria-expanded={isOpen}
          className={styles.menuButton}
          onClick={() => setIsOpen(true)}
          type="button"
        >
          Abrir navegação
        </button>
        {isOpen ? (
          <div className={styles.drawerLayer}>
            <div
              aria-label="Navegação administrativa"
              className={styles.drawer}
              id={drawerId}
            >
              <SidebarContent
                displayName={displayName}
                onNavigate={() => setIsOpen(false)}
                pathname={pathname}
              />
              <button
                className={styles.closeButton}
                onClick={() => setIsOpen(false)}
                type="button"
              >
                Fechar navegação
              </button>
            </div>
            <button
              aria-label="Fechar ao clicar fora da navegação"
              className={styles.backdrop}
              onClick={() => setIsOpen(false)}
              type="button"
            />
          </div>
        ) : null}
      </div>
    );
  }

  return <SidebarContent displayName={displayName} pathname={pathname} />;
}

type SidebarContentProps = {
  displayName?: string | null;
  onNavigate?: () => void;
  pathname: string;
};

function SidebarContent({ displayName, onNavigate, pathname }: SidebarContentProps) {
  return (
    <nav aria-label="Navegação administrativa principal" className={styles.nav}>
      <div className={styles.brand}>Corpo &amp; Mente</div>
      {displayName?.trim() ? <p className={styles.identity}>Admin: {displayName.trim()}</p> : null}
      <ul className={styles.list}>
        {adminNavigationItems.map((item) => {
          const isActive = isAdminNavigationItemActive(pathname, item.href);

          return (
            <li key={item.href}>
              <Link
                aria-current={isActive ? "page" : undefined}
                className={styles.link}
                data-active={isActive ? "true" : undefined}
                href={item.href}
                onClick={onNavigate}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <LogoutButton className={styles.logoutButton} />
    </nav>
  );
}
