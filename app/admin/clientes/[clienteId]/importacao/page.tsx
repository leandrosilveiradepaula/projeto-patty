import { notFound } from "next/navigation";
import { getClientForPrivateFileAdministration } from "@/lib/files/private-file-admin";
import { isUuid } from "@/lib/validation/uuid";
import { ClientWorkspaceHeader } from "@/components/admin/ClientWorkspaceHeader";
import { ClientWorkspaceNav } from "@/components/admin/ClientWorkspaceNav";
import { HistoricalExcelReviewForm } from "@/components/admin/HistoricalExcelReviewForm";
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

  return (
    <>
      <ClientWorkspaceHeader
        displayName={name}
        secondary="Importação de histórico"
        meta="Excel e fotos da cliente — sem ZIP"
      />
      <ClientWorkspaceNav activeArea="importacao" clientId={client.id} />
      <Alert variant="info" title="Importação histórica em preparação">
        Primeiro confira a planilha e a identidade da cliente. A leitura do Excel ainda
        não grava respostas de Anamnese, medidas ou Cadastro Atual. Para fotos, o
        envio privado já está disponível abaixo e não faz liberação automática.
      </Alert>
      <Section title="1. Conferir Excel da cliente" description="Selecione um arquivo .xlsx diretamente. Os valores serão exibidos apenas para conferência e não serão salvos.">
        <HistoricalExcelReviewForm clientId={client.id} />
      </Section>
      <Section title="2. Adicionar fotos à cliente" description="Escolha a categoria Foto. Cada imagem enviada fica vinculada a este cadastro interno, inclusive se a cliente estiver inativa. O envio é individual e mantém os arquivos ocultos até liberação explícita.">
        <AdminPrivateFileUploadForm clientId={client.id} />
      </Section>
      <Alert variant="warning" title="Conferência obrigatória antes de concluir o histórico">
        Após a revisão de identidade e do significado das colunas, ainda será necessário
        mapear as respostas, gravar o histórico no domínio correto e reconciliar
        duplicidades de forma auditável. Nenhuma dessas etapas é feita automaticamente
        nesta tela.
      </Alert>
    </>
  );
}
