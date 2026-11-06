import { notFound } from "next/navigation";
import { getClientForPrivateFileAdministration } from "@/lib/files/private-file-admin";
import { isUuid } from "@/lib/validation/uuid";
import { getPublishedHistoricalAnamnesisTargets } from "@/lib/imports/historical-anamnesis-targets";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { HistoricalExcelReviewForm } from "@/components/admin/HistoricalExcelReviewForm";
import { HistoricalAssessmentReviewForm } from "@/components/admin/HistoricalAssessmentReviewForm";
import { HistoricalAssessmentStagedList } from "@/components/admin/HistoricalAssessmentStagedList";
import { HistoricalRegistrationReviewForm } from "@/components/admin/HistoricalRegistrationReviewForm";
import { HistoricalRegistrationStagedList } from "@/components/admin/HistoricalRegistrationStagedList";
import { HistoricalAnamnesisStagedList } from "@/components/admin/HistoricalAnamnesisStagedList";
import { AdminPrivateFileUploadForm } from "@/components/admin/AdminPrivateFileUploadForm";
import { Section } from "@/components/ui/Section";
import { Alert } from "@/components/ui/Alert";

export default async function HistoricalClientImportPage({
  params,
}: {
  params: Promise<{ clienteId: string }>;
}) {
  const { clienteId } = await params;
  if (!isUuid(clienteId)) notFound();

  // Checks admin role + AAL2 on the server; RLS scopes the client lookup.
  const client = await getClientForPrivateFileAdministration(clienteId);
  if (!client) notFound();

  const name = client.full_name?.trim() || client.profiles?.display_name?.trim();
  const publishedAnamnesis = await getPublishedHistoricalAnamnesisTargets();

  return (
    <>
      <ClientWorkspaceHeader
        displayName={name}
        secondary="Importação de histórico"
        meta="Excel e fotos da cliente — sem ZIP"
      />
      <ClientWorkspaceNav activeArea="importacao" clientId={client.id} />
      <Alert variant="info" title="Guarda histórica profissional e privada">
        A conferência de Excel exige um lote registrado e confirmação profissional de identidade,
        interpretação dos campos e guarda do original antes de armazenar respostas históricas.
        Esse histórico permanece separado da Anamnese preenchida pela cliente e não é publicado.
      </Alert>
      <Section title="1. Conferir Excel da cliente" description="Selecione um arquivo .xlsx diretamente. Os valores serão exibidos apenas para conferência e não serão salvos.">
        <HistoricalExcelReviewForm clientId={client.id} targets={publishedAnamnesis} />
      </Section>
      <Section title="2. Históricos de Anamnese guardados" description="Somente a administração pode consultar os registros; nenhum histórico é liberado para a cliente.">
        <HistoricalAnamnesisStagedList clientId={client.id} />
      </Section>
      <Section title="3. Conferir medidas de avaliação histórica" description="Prepare correspondências de células, unidade e data da avaliação. O resultado é uma proposta sem gravação, aguardando mapeamento e decisão profissional.">
        <HistoricalAssessmentReviewForm clientId={client.id} />
      </Section>
      <Section title="4. Medidas históricas guardadas" description="Recibos privados por data, lote e origem. Esses registros não constituem avaliações finalizadas.">
        <HistoricalAssessmentStagedList clientId={client.id} />
      </Section>
      <Section title="5. Conferir Cadastro Histórico de Excel" description="Dados de contato históricos, sem alterar o Cadastro Atual, login ou acompanhamento.">
        <HistoricalRegistrationReviewForm clientId={client.id} />
      </Section>
      <Section title="6. Cadastros históricos guardados" description="Recibos privados por lote e origem; nenhum registro é publicado para a cliente.">
        <HistoricalRegistrationStagedList clientId={client.id} />
      </Section>
      <Section title="7. Adicionar fotos à cliente" description="Escolha a categoria Foto. Cada imagem enviada fica vinculada a este cadastro interno, inclusive se a cliente estiver inativa. O envio é individual e mantém os arquivos ocultos até liberação explícita.">
        <AdminPrivateFileUploadForm clientId={client.id} />
      </Section>
      <Alert variant="warning" title="Carga inicial completa ainda pendente">
        Esta página permite guardar Anamnese histórica de uma origem Excel reconciliada
        e guardar medidas e campos cadastrais históricos de origens reconciliadas,
        sem criar avaliações atuais nem sobrescrever Cadastro Atual.
        A carga inicial de todos os arquivos do acervo e a reconciliação global
        continuam pendentes até o fornecimento e a verificação dos Excel e fotos.
      </Alert>
    </>
  );
}
