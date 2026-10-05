"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <PageHeader
        description="A operação não foi concluída. Registros já persistidos continuam preservados."
        eyebrow="Admin"
        title="Não foi possível carregar esta área"
      />
      <Section title="Recuperação">
        <Card>
          <Alert title="Erro ao carregar ou salvar" variant="critical">
            Tente novamente. Se o erro persistir, volte ao painel e abra o registro
            novamente antes de repetir uma ação de gravação.
          </Alert>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "16px" }}>
            <Button onClick={reset} type="button">
              Tentar novamente
            </Button>
            <Link href="/admin">Voltar ao painel</Link>
          </div>
        </Card>
      </Section>
    </>
  );
}
