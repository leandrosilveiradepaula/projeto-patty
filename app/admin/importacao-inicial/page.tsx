import { requireRole } from "@/lib/supabase/auth";
import { HistoricalInitialLoadLedgerForm } from "@/components/admin/HistoricalInitialLoadLedgerForm";
import { Section } from "@/components/ui/Section";
import { Alert } from "@/components/ui/Alert";

export default async function InitialLoadAdminPage() {
  await requireRole("admin"); // Server-side relational role and MFA AAL2.

  return (
    <main>
      <h1>Carga inicial do acervo</h1>
      <Alert variant="info" title="Preparação e rastreabilidade">
        Registre o inventário de todas as planilhas Excel e fotos da consultoria.
        O arquivo JSON é gerado pela ferramenta local de inventário e contém
        somente identificadores opacos e estados de triagem.
      </Alert>
      <Section
        title="Registrar inventário do lote"
        description="Registre um lote por vez. A gravação confirma somente o recebimento dos metadados; não importa dados de saúde, clientes nem fotografias."
      >
        <HistoricalInitialLoadLedgerForm />
      </Section>
      <Alert variant="warning" title="Ainda não é a importação definitiva">
        Cada fonte deverá passar por conciliação humana de identidade,
        mapeamento de campos, autorização de custódia e reconciliação.
        Nenhuma cliente é ativada e nenhuma foto é liberada por esta etapa.
      </Alert>
    </main>
  );
}
