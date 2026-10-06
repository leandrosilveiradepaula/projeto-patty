"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import styles from "./error.module.css";

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
          <div className={styles.actions}>
            <Button onClick={reset} type="button">
              Tentar novamente
            </Button>
            <Link className={styles.returnLink} href="/admin">Voltar ao painel</Link>
          </div>
        </Card>
      </Section>
    </>
  );
}
