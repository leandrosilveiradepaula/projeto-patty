"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { readClientDirectoryReturn, withClientDirectoryReturn } from "@/lib/operations/client-directory-return";
import { readPendingQueueReturn, withPendingQueueReturn } from "@/lib/operations/pending-queue-return";

import { Badge } from "@/components/ui/Badge";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";

import styles from "./AdminAnamnesisWorkspaceHeader.module.css";

type AdminAnamnesisWorkspaceSection =
  | "respostas"
  | "revisoes"
  | "ia"
  | "esclarecimentos"
  | "correcoes";

type AdminAnamnesisWorkspaceHeaderProps = {
  activeSection: AdminAnamnesisWorkspaceSection;
  clientId: string;
  displayName: string | null | undefined;
  submissionId: string;
  submittedAt: string | null;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function AdminAnamnesisWorkspaceHeaderContent({
  activeSection,
  clientId,
  displayName,
  submissionId,
  submittedAt,
}: AdminAnamnesisWorkspaceHeaderProps) {
  const searchParams = useSearchParams();
  const directoryReturn = readClientDirectoryReturn({ listaQ: searchParams?.get("listaQ") ?? undefined, listaView: searchParams?.get("listaView") ?? undefined, listaPagina: searchParams?.get("listaPagina") ?? undefined });
  const queueReturn = readPendingQueueReturn(searchParams?.get("filaRetorno"));
  const navigate = (href: string) => queueReturn ? withPendingQueueReturn(withClientDirectoryReturn(href,directoryReturn),queueReturn) : withClientDirectoryReturn(href,directoryReturn);
  const items: Array<{
    href: string;
    key: AdminAnamnesisWorkspaceSection;
    label: string;
  }> = [
    {
      href: `/admin/anamneses/${submissionId}`,
      key: "respostas",
      label: "Respostas",
    },
    {
      href: `/admin/anamneses/${submissionId}/revisao`,
      key: "revisoes",
      label: "Revisões",
    },
    ...(submittedAt
      ? [
          {
            href: `/admin/anamneses/${submissionId}/ia`,
            key: "ia" as const,
            label: "Análise IA",
          },
          {
            href: `/admin/anamneses/${submissionId}/esclarecimentos`,
            key: "esclarecimentos" as const,
            label: "Esclarecimentos",
          },
          {
            href: `/admin/anamneses/${submissionId}/correcoes`,
            key: "correcoes" as const,
            label: "Correções",
          },
        ]
      : []),
  ];

  return (
    <>
      <ClientWorkspaceHeader
        actions={
          <Link
            className={styles.backLink}
            href={navigate(`/admin/clientes/${clientId}/anamnese`)}
          >
            Voltar ao histórico da Anamnese
          </Link>
        }
        meta={
          submittedAt
            ? `Enviada em ${formatDateTime(submittedAt)}`
            : "Preenchimento ainda em rascunho"
        }
        displayName={displayName}
        secondary="Anamnese"
        status={
          <Badge variant={submittedAt ? "positive" : "neutral"}>
            {submittedAt ? "Enviada" : "Aguardando cliente"}
          </Badge>
        }
      />
      <ClientWorkspaceNav activeArea="anamnese" clientId={clientId} />
      <nav aria-label="Áreas da Anamnese" className={styles.subnav}>
        {items.map((item) => {
          const active = item.key === activeSection;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={active ? styles.activeLink : styles.link}
              href={navigate(item.href)}
              key={item.key}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

export function AdminAnamnesisWorkspaceHeader(props: AdminAnamnesisWorkspaceHeaderProps) {
  return <Suspense fallback={null}><AdminAnamnesisWorkspaceHeaderContent {...props} /></Suspense>;
}
