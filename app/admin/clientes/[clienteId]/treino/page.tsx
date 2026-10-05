import { AdminTrainingRequestForm } from "@/components/admin/AdminTrainingRequestForm";
import { ClientSummaryHeader } from "@/components/admin/ClientSummaryHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Section } from "@/components/ui/Section";
import {
  getAccessibleClient,
  listAccessibleClientTrainingRequests,
} from "@/lib/supabase/data-access";
import { notFound } from "next/navigation";

import styles from "./page.module.css";

type PageProps = {
  params: Promise<{ clienteId: string }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export default async function AdminClientTrainingPage({ params }: PageProps) {
  const { clienteId } = await params;
  const client = await getAccessibleClient(clienteId);

  if (!client) {
    notFound();
  }

  const requests = await listAccessibleClientTrainingRequests(client.id);
  const displayName = client.profiles?.display_name?.trim();

  return (
    <>
      <ClientSummaryHeader
        meta="Cliente atribuído"
        name={displayName || "Cliente sem nome informado"}
        secondary="Solicitações de treino"
        status={<Badge variant="neutral">Acompanhamento ativo</Badge>}
      />

      <ClientWorkspaceNav clientId={client.id} />

      <Section
        action={
          <Badge variant={requests.length > 0 ? "positive" : "neutral"}>
            {requests.length > 0 ? "Solicitado" : "Não solicitado"}
          </Badge>
        }
        description="Registre aqui somente a solicitação do serviço. Prescrição, progressão e publicação de treino continuam sendo etapas separadas."
        title="Treino"
      >
        <div className={styles.grid}>
          <Card>
            <div className={styles.summary}>
              <h2>Situação atual</h2>
              <p>
                {requests.length > 0
                  ? `${requests.length} solicitação(ões) registrada(s) no histórico.`
                  : "Nenhuma solicitação de treino registrada até o momento."}
              </p>
            </div>
          </Card>

          <Card>
            <AdminTrainingRequestForm clientId={client.id} />
          </Card>
        </div>
      </Section>

      <Section
        action={<Badge variant="neutral">{requests.length} registro(s)</Badge>}
        description="Histórico preservado das solicitações registradas para esta cliente."
        title="Histórico"
      >
        {requests.length === 0 ? (
          <EmptyState
            description="Quando houver uma solicitação, ela aparecerá aqui."
            title="Sem solicitações de treino"
          />
        ) : (
          <ol className={styles.history}>
            {requests.map((request) => (
              <li key={request.id}>
                <Card variant="subtle">
                  <p className={styles.meta}>
                    Solicitado em {formatDateTime(request.requested_at)}
                    {request.profiles?.display_name?.trim()
                      ? ` · registrado por ${request.profiles.display_name.trim()}`
                      : ""}
                  </p>
                  <p className={styles.note}>
                    {request.note?.trim() || "Sem observação adicional."}
                  </p>
                </Card>
              </li>
            ))}
          </ol>
        )}
      </Section>
    </>
  );
}
