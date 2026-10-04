import Link from "next/link";

import { PasswordResetForm } from "@/components/auth/PasswordResetForm";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

import styles from "./page.module.css";

type ResetPasswordPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { error } = await searchParams;

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
            <PasswordResetForm />
          )}
        </Card>
        <Link className={styles.backLink} href="/recuperar-senha">
          Solicitar novo link
        </Link>
      </section>
    </main>
  );
}
