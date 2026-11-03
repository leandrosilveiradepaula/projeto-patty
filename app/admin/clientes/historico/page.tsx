import Link from "next/link";
import { requireRole } from "@/lib/supabase/auth";
import { HistoricalClientRegistrationForm } from "@/components/admin/HistoricalClientRegistrationForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { Alert } from "@/components/ui/Alert";

export default async function CadastroHistoricoPage() {
  await requireRole("admin");
  return (
    <>
      <PageHeader
        eyebrow="Admin · Clientes"
        title="Cadastro histórico interno"
        description="Registre uma cliente anterior sem criar conta de acesso ou iniciar acompanhamento."
      />
      <Alert variant="info" title="Antes de cadastrar">
        Confira o <Link href="/admin/clientes">diretório de clientes</Link> e o acervo. O vínculo dos documentos antigos será feito separadamente, após revisão da identidade.
      </Alert>
      <Section title="Identificação profissional" description="Este registro permanecerá inativo e sem acesso da cliente até um processo posterior de ativação.">
        <HistoricalClientRegistrationForm />
      </Section>
    </>
  );
}
