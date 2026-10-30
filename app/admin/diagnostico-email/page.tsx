import Link from "next/link";
import { requireRole } from "@/lib/supabase/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { DiagnosticForm } from "./DiagnosticForm";

export default async function EmailDiagnosticPage() {
  await requireRole("admin");
  return (
    <>
      <PageHeader eyebrow="Admin · Jornada 2" title="Diagnóstico de e-mail" description="Teste controlado do envio SMTP, independente dos lembretes reais." />
      <Section title="Envio controlado" description="O resultado SMTP não comprova recebimento. Execute apenas uma vez e confira a caixa autorizada.">
        <DiagnosticForm />
        <p><Link href="/admin/feedback-semanal">Voltar aos Feedbacks Semanais</Link></p>
      </Section>
    </>
  );
}
