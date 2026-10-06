"use client";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import Link from "next/link";
import styles from "./error.module.css";

export default function ClientError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <>
      <PageHeader
        description="Não foi possível concluir esta tela agora. Seus dados já salvos continuam preservados."
        eyebrow="Cliente"
        title="Algo não carregou corretamente"
      />
      <Section title="Tente novamente">
        <Card>
          <Alert title="Não foi possível concluir a operação" variant="critical">
            Verifique sua conexão e tente novamente. Se o problema continuar, volte
            ao início e repita a ação mais tarde.
          </Alert>
          <div className={styles.actions}>
            <Button onClick={reset} type="button">
              Tentar novamente
            </Button>
            <Link className={styles.returnLink} href="/cliente">Voltar ao início</Link>
          </div>
        </Card>
      </Section>
    </>
  );
}
