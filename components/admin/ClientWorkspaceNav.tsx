"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { clientDirectoryReturnHref, readClientDirectoryReturn, withClientDirectoryReturn } from "@/lib/operations/client-directory-return";
import { readPendingQueueReturn, withPendingQueueReturn } from "@/lib/operations/pending-queue-return";

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

function ClientWorkspaceNavContent({
  activeArea,
  clientId,
}: ClientWorkspaceNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const directoryReturn = readClientDirectoryReturn({
    listaQ: searchParams?.get("listaQ") ?? undefined,
    listaView: searchParams?.get("listaView") ?? undefined,
    listaPagina: searchParams?.get("listaPagina") ?? undefined,
  });
  const queueReturn = readPendingQueueReturn(searchParams?.get("filaRetorno"));
  const navigate = (href: string) => queueReturn ? withPendingQueueReturn(withClientDirectoryReturn(href, directoryReturn),queueReturn) : withClientDirectoryReturn(href, directoryReturn);
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

  const resolvedActiveArea =
    activeArea ??
    items.find((item) =>
      item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`),
    )?.area ??
    "visao-geral";

  return (
    <>
      {resolvedActiveArea !== "visao-geral" ? (
        <nav aria-label="Retornar à lista de clientes" className={styles.returnNavigation}>
          <Link href={clientDirectoryReturnHref(directoryReturn)}>Voltar à lista de clientes</Link>
        </nav>
      ) : null}
      <nav aria-label="Áreas da cliente" className={styles.nav}>
        {items.map((item) => {
          const isActive = resolvedActiveArea === item.area;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? styles.activeLink : styles.link}
              href={navigate(item.href)}
              key={item.href}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav aria-label="Áreas da cliente" className={styles.mobileNav}>
        <label className={styles.mobileField}>
          <span className={styles.mobileLabel}>Área da cliente</span>
          <select
            aria-label="Área da cliente"
            className={styles.mobileSelect}
            onChange={(event) => router.push(event.target.value)}
            value={navigate(items.find((item) => item.area === resolvedActiveArea)?.href ?? base)}
          >
            {items.map((item) => (
              <option key={item.href} value={navigate(item.href)}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </nav>
    </>
  );
}

/** Isolate useSearchParams behind Suspense to avoid a client-side rendering bailout. */
export function ClientWorkspaceNav(props: ClientWorkspaceNavProps) {
  return (
    <Suspense fallback={<nav aria-label="Áreas da cliente" className={styles.returnNavigation}><Link href="/admin/clientes">Voltar à lista de clientes</Link></nav>}>
      <ClientWorkspaceNavContent {...props} />
    </Suspense>
  );
}
