import { requestTrainingAction } from "@/app/cliente/treino/actions";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import {
  getCurrentClient,
  listAccessibleClientTrainingRequests,
} from "@/lib/supabase/data-access";

import styles from "./page.module.css";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

type ClientTrainingPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function ClientTrainingPage({
  searchParams,
}: ClientTrainingPageProps) {
  const { status } = await searchParams;
  const client = await getCurrentClient();

  if (!client) {
    return (
      <EmptyState
        description="Seu cadastro de cliente ainda não está configurado."
        title="Cadastro pendente"
      />
    );
  }

  const requests = await listAccessibleClientTrainingRequests(client.id);

  return (
    <>
      <PageHeader
        description="Registre aqui quando quiser solicitar o serviço de treino. A solicitação não cria prescrição automática nem altera seu protocolo."
        eyebrow="Cliente"
        title="Treino"
      />
      {status === "requested" ? (
        <Alert live="polite" title="Solicitação enviada" variant="success">
          Sua solicitação de treino foi registrada no acompanhamento e ficará visível para a Patty.
        </Alert>
      ) : status === "request-error" ? (
        <Alert live="assertive" title="Não foi possível enviar" variant="critical">
          Sua solicitação não foi registrada. Tente novamente antes de sair desta página.
        </Alert>
      ) : null}

      <Section
        description="A Patty verá a solicitação no seu histórico de acompanhamento."
        title="Solicitar treino"
      >
        <Card>
          <form action={requestTrainingAction} className={styles.form}>
            <label className={styles.field}>
              <span>Observação opcional</span>
              <textarea
                maxLength={1000}
                name="note"
                placeholder="Se quiser, conte algo importante sobre sua solicitação."
                rows={4}
              />
            </label>
            <Button type="submit">Solicitar treino</Button>
          </form>
        </Card>
      </Section>

      <Section
        description="Histórico preservado das solicitações registradas."
        title="Suas solicitações"
      >
        {requests.length === 0 ? (
          <EmptyState
            description="Você ainda não registrou nenhuma solicitação de treino."
            title="Sem solicitações"
          />
        ) : (
          <ol className={styles.list}>
            {requests.map((request) => (
              <li key={request.id}>
                <Card className={styles.entry} variant="subtle">
                  <div className={styles.header}>
                    <strong>Solicitação de treino</strong>
                    <Badge variant="neutral">
                      {formatDateTime(request.requested_at)}
                    </Badge>
                  </div>
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
