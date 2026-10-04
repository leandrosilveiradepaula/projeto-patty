import Link from "next/link";
import { redirect } from "next/navigation";

import { PasswordResetSessionGate } from "@/components/auth/PasswordResetSessionGate";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";

import styles from "./page.module.css";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    code?: string;
    error?: string;
    sb_flow_id?: string;
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { code, error, sb_flow_id: flowId } = await searchParams;

  if (code) {
    const params = new URLSearchParams({ code });

    if (flowId) {
      params.set("sb_flow_id", flowId);
    }

    redirect(`/auth/recovery?${params.toString()}`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const hasServerSession = typeof claimsData?.claims?.sub === "string";

  return (
    <main className={styles.shell}>
      <section aria-labelledby="reset-title" className={styles.content}>
        <PageHeader
          description="Crie uma nova senha com pelo menos 8 caracteres."
          eyebrow="Corpo & Mente"
          title="Redefinir senha"
          titleId="reset-title"
        />
        <Card>
          {error === "invalid" ? (
            <Alert live="polite" title="Link inválido ou expirado" variant="warning">
              Solicite um novo link de recuperação para continuar.
            </Alert>
          ) : (
            <PasswordResetSessionGate hasServerSession={hasServerSession} />
          )}
        </Card>
        <Link className={styles.backLink} href="/recuperar-senha">
          Solicitar novo link
        </Link>
      </section>
    </main>
  );
}
