import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getCurrentClient,
  listAccessibleAnamnesisSubmissions,
} from "@/lib/supabase/data-access";
import { getCurrentClientAnamnesisStartAvailability } from "@/lib/anamnesis/start";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { startClientAnamnesisDraft } from "./actions";
import styles from "./page.module.css";

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

export default async function ClienteAnamnesePage() {
  const client = await getCurrentClient();
  const [submissions, startAvailability] = client
    ? await Promise.all([
        listAccessibleAnamnesisSubmissions(client.id),
        getCurrentClientAnamnesisStartAvailability(),
      ])
    : [null, { available: false } as const];

  const hasCurrentDraft =
    startAvailability.available &&
    submissions?.some(
      (submission) =>
        submission.form_version_id === startAvailability.formVersionId &&
        submission.submitted_at === null,
    );

  return (
    <>
      <PageHeader
        description="Consulte suas submissões de Anamnese já registradas. Rascunhos existentes podem ser retomados sem criar uma nova versão automaticamente."
        eyebrow="Cliente"
        title="Anamnese"
      />
      {client && startAvailability.available && !hasCurrentDraft ? (
        <Section
          description="O rascunho será vinculado à versão oficial publicada da Anamnese. Você poderá salvar e continuar depois."
          title="Começar Anamnese"
        >
          <Card className={styles.startCard}>
            <div>
              <h2 className={styles.submissionTitle}>
                Anamnese · versão {startAvailability.versionNumber}
              </h2>
              <p className={styles.submissionStatus}>
                Você pode iniciar o rascunho, salvar as respostas e enviar a Anamnese quando todos os campos obrigatórios aplicáveis estiverem preenchidos e o consentimento final estiver marcado.
              </p>
            </div>
            <form action={startClientAnamnesisDraft}>
              <Button type="submit">Começar Anamnese</Button>
            </form>
          </Card>
        </Section>
      ) : null}
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
            description={startAvailability.available ? "Ainda não há submissões. Use a seção Começar Anamnese acima para iniciar seu preenchimento." : "Ainda não há submissões nem formulário disponível para começar neste momento."}
            title="Sem Anamnese registrada"
            action={<Link href="/cliente">Voltar ao início</Link>}
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
