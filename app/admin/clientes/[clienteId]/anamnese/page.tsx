import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  listAccessibleAnamnesisSubmissions,
} from "@/lib/supabase/data-access";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminClienteAnamnesePageProps = {
  params: Promise<{
    clienteId: string;
  }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(new Date(value));
}

export default async function AdminClienteAnamnesePage({
  params,
}: AdminClienteAnamnesePageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const submissions = await listAccessibleAnamnesisSubmissions(client.id);
  const displayName = client.profiles?.display_name?.trim();

  return (
    <>
      <ClientWorkspaceHeader
        meta="Respostas e versões preservadas no histórico"
        displayName={displayName}
        secondary="Histórico real de Anamnese"
        status={<Badge variant="neutral">{submissions.length} registro(s)</Badge>}
      />
      <ClientWorkspaceNav activeArea="anamnese" clientId={client.id} />
      <Section
        action={<Badge variant="neutral">{submissions.length} registro(s)</Badge>}
        description="Cada envio preserva as respostas e a versão da Anamnese usada naquele momento."
        title="Anamneses"
      >
        {submissions.length === 0 ? (
          <EmptyState
            description="Nenhuma submissão de Anamnese está registrada para esta cliente."
            title="Sem Anamnese registrada"
          />
        ) : (
          <ol className={styles.submissionList}>
            {submissions.map((submission) => {
              const version = submission.anamnesis_form_versions;
              const submitted = Boolean(submission.submitted_at);

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
                        {submitted ? "Enviada" : "Aguardando cliente"}
                      </Badge>
                    </div>
                    <dl className={styles.submissionDetails}>
                      <div>
                        <dt>Envio</dt>
                        <dd>
                          {submission.submitted_at
                            ? formatDateTime(submission.submitted_at)
                            : "Ainda não enviado"}
                        </dd>
                      </div>
                    </dl>
                    <Link
                      className={styles.detailLink}
                      href={`/admin/anamneses/${submission.id}`}
                    >
                      Ver respostas originais
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
