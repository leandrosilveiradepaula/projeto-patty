import Link from "next/link";

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

export function AdminAnamnesisWorkspaceHeader({
  activeSection,
  clientId,
  displayName,
  submissionId,
  submittedAt,
}: AdminAnamnesisWorkspaceHeaderProps) {
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
        meta={
          submittedAt
            ? `Enviada em ${formatDateTime(submittedAt)}`
            : "Preenchimento ainda em rascunho"
        }
        displayName={displayName}
        secondary="Anamnese"
        status={
          <Badge variant={submittedAt ? "positive" : "warning"}>
            {submittedAt ? "Enviada" : "Rascunho"}
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
              href={item.href}
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
