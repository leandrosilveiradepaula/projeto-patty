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
  const pendingSubmissions = submissions.filter(
    (submission) => !submission.submitted_at,
  );
  const submittedSubmissions = submissions.filter(
    (submission) => Boolean(submission.submitted_at),
  );
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
      {pendingSubmissions.length > 0 ? (
        <Section
          action={<Badge variant="warning">{pendingSubmissions.length} pendente(s)</Badge>}
          description="Anamneses iniciadas que ainda aguardam o envio da cliente."
          title="Aguardando cliente"
        >
          <ol className={styles.submissionList}>
            {pendingSubmissions.map((submission) => {
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
                      <Badge variant="warning">Aguardando cliente</Badge>
                    </div>
                    <p className={styles.submissionMeta}>
                      As respostas ainda não foram enviadas. Rascunhos da cliente não integram o histórico concluído.
                    </p>
                  </Card>
                </li>
              );
            })}
          </ol>
        </Section>
      ) : null}
      <Section
        description="Cada envio concluído preserva as respostas originais e a versão da Anamnese usada naquele momento."
        title="Histórico enviado"
      >
        {submittedSubmissions.length === 0 ? (
          <EmptyState
            description={
              pendingSubmissions.length > 0
                ? "Quando a cliente enviar a Anamnese pendente, ela aparecerá neste histórico."
                : "Nenhuma submissão de Anamnese está registrada para esta cliente."
            }
            title="Sem Anamnese enviada"
          />
        ) : (
          <ol className={styles.submissionList}>
            {submittedSubmissions.map((submission) => {
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
                          Enviada em {formatDateTime(submission.submitted_at!)}
                        </p>
                      </div>
                      <Badge variant="positive">Enviada</Badge>
                    </div>
                    <dl className={styles.submissionDetails}>
                      <div>
                        <dt>Criação</dt>
                        <dd>{formatDateTime(submission.created_at)}</dd>
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
