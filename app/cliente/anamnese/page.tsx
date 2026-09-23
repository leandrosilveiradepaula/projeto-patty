import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getCurrentClient,
  listAccessibleAnamnesisSubmissions,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import styles from "./page.module.css";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ClienteAnamnesePage() {
  const client = await getCurrentClient();
  const submissions = client
    ? await listAccessibleAnamnesisSubmissions(client.id)
    : null;

  return (
    <>
      <PageHeader
        description="Consulte suas submissões de Anamnese já registradas. Rascunhos existentes podem ser retomados sem criar uma nova versão automaticamente."
        eyebrow="Cliente"
        title="Anamnese"
      />
      <Section
        description="Cada registro preserva a versão de formulário usada no momento da submissão."
        title="Histórico"
      >
        {!client ? (
          <EmptyState
            description="Sua conta ainda não está vinculada a uma cliente."
            title="Anamnese indisponível"
          />
        ) : submissions?.length === 0 ? (
          <EmptyState
            description="Nenhuma submissão de Anamnese está registrada para sua conta."
            title="Sem Anamnese registrada"
          />
        ) : (
          <ol className={styles.submissionList}>
            {submissions?.map((submission) => {
              const version = submission.anamnesis_form_versions;

              return (
                <li key={submission.id}>
                  <Card className={styles.submissionCard}>
                    <div className={styles.submissionHeader}>
                      <div>
                        <h2 className={styles.submissionTitle}>
                          {version?.version_number
                            ? `Anamnese · versão ${version.version_number}`
                            : "Anamnese"}
                        </h2>
                        <p className={styles.submissionMeta}>
                          Criada em {formatDateTime(submission.created_at)}
                        </p>
                      </div>
                      <Badge variant="neutral">
                        {submission.submitted_at ? "Enviada" : "Rascunho"}
                      </Badge>
                    </div>
                    <p className={styles.submissionStatus}>
                      {submission.submitted_at
                        ? `Enviada em ${formatDateTime(submission.submitted_at)}`
                        : "Este registro ainda não foi enviado."}
                    </p>
                    <Link
                      className={styles.detailLink}
                      href={`/cliente/anamnese/${submission.id}`}
                    >
                      {submission.submitted_at
                        ? "Ver respostas"
                        : "Continuar rascunho"}
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ol>
        )}
      </Section>
    </>
  );
}
