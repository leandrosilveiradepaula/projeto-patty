import { notFound } from "next/navigation";
import { getClientForPrivateFileAdministration } from "@/lib/files/private-file-admin";
import { isUuid } from "@/lib/validation/uuid";
import { getPublishedHistoricalAnamnesisTargets } from "@/lib/imports/historical-anamnesis-targets";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { HistoricalExcelReviewForm } from "@/components/admin/HistoricalExcelReviewForm";
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
      <Section title="3. Adicionar fotos à cliente" description="Escolha a categoria Foto. Cada imagem enviada fica vinculada a este cadastro interno, inclusive se a cliente estiver inativa. O envio é individual e mantém os arquivos ocultos até liberação explícita.">
        <AdminPrivateFileUploadForm clientId={client.id} />
      </Section>
      <Alert variant="warning" title="Carga inicial completa ainda pendente">
        Esta página permite guardar Anamnese histórica de uma origem Excel reconciliada.
        A carga inicial em lote, a importação de cadastro, medidas, avaliações e fotos de
        todo o acervo e a reconciliação global continuam sendo entregas separadas.
      </Alert>
    </>
  );
}
