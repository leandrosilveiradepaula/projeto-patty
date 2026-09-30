import { endClientAssignmentAction } from "@/app/admin/clientes/[clienteId]/actions";
import { AdminClientRegistrationEditForm } from "@/components/admin/AdminClientRegistrationEditForm";
import { AdminTrainingRequestForm } from "@/components/admin/AdminTrainingRequestForm";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  getAccessibleClientRegistration,
  listAccessibleClientTrainingRequests,
} from "@/lib/supabase/data-access";
import { notFound } from "next/navigation";
import styles from "./page.module.css";

type AdminClienteDetailPageProps = {
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

export default async function AdminClienteDetailPage({
  params,
}: AdminClienteDetailPageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const [registration, trainingRequests] = await Promise.all([
    getAccessibleClientRegistration(client.id),
    listAccessibleClientTrainingRequests(client.id),
  ]);

  const displayName = client.profiles?.display_name?.trim();

  return (
    <>
      <ClientSummaryHeader
        meta="Acompanhamento ativo"
        name={displayName || "Cadastro incompleto"}
        secondary={
          client.profile_id
            ? "Conta da cliente vinculada"
            : "Conta da cliente ainda não vinculada"
        }
        status={<Badge variant="neutral">Ativa</Badge>}
        visual={
          <span>
            {displayName
              ?.split(/\s+/)
              .map((word) => word[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "?"}
          </span>
        }
      />

      <ClientWorkspaceNav clientId={client.id} />

      <Section
        description="Informações atuais de contato, separadas do acesso à conta e da Anamnese."
        title="Cadastro atual"
      >
        <AdminClientRegistrationEditForm
          city={registration?.city ?? undefined}
          clientId={client.id}
          contactEmail={registration?.contact_email ?? undefined}
          instagram={registration?.instagram ?? undefined}
          phone={registration?.phone ?? undefined}
        />
      </Section>

      <Section
        description="Registre a solicitação quando a cliente contratar o serviço de treino."
        title="Treino"
      >
        <div className={styles.trainingGrid}>
          <Card className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Situação atual</h3>
              <Badge variant="neutral">
                {trainingRequests.length > 0
                  ? "Solicitado"
                  : "Não solicitado"}
              </Badge>
            </div>
            <p className={styles.cardDescription}>
              {trainingRequests.length > 0
                ? "Há solicitação de treino registrada no histórico desta cliente."
                : "Nenhuma solicitação de treino foi registrada até o momento."}
            </p>
          </Card>
          <Card className={styles.infoCard}>
            <AdminTrainingRequestForm clientId={client.id} />
          </Card>
        </div>

        {trainingRequests.length > 0 ? (
          <ol className={styles.trainingHistory}>
            {trainingRequests.map((request) => (
              <li key={request.id}>
                <Card variant="subtle">
                  <p className={styles.trainingMeta}>
                    Solicitado em {formatDateTime(request.requested_at)}
                    {request.profiles?.display_name?.trim()
                      ? ` · registrado por ${request.profiles.display_name.trim()}`
                      : ""}
                  </p>
                  <p className={styles.cardDescription}>
                    {request.note?.trim() || "Sem observação adicional."}
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        ) : null}
      </Section>

      <Section
        description="Use esta ação somente quando o acompanhamento atual precisar ser encerrado. O histórico da cliente é preservado."
        title="Encerrar acompanhamento"
      >
        <div className={styles.assignmentPanel}>
          <div>
            <p className={styles.assignmentTitle}>Acompanhamento ativo</p>
            <p className={styles.assignmentDescription}>
              Esta operação não apaga a cliente nem seus dados. Ela encerra
              apenas o vínculo atual de acompanhamento.
            </p>
          </div>
          <form
            action={endClientAssignmentAction.bind(null, client.id)}
            className={styles.dangerForm}
          >
            <label className={styles.dangerConfirmation}>
              <input
                name="confirmEndAssignment"
                required
                type="checkbox"
                value="yes"
              />
              <span>Confirmo que quero encerrar o acompanhamento desta cliente.</span>
            </label>
            <Button type="submit" variant="danger">
              Encerrar acompanhamento
            </Button>
          </form>
        </div>
      </Section>
    </>
  );
}
