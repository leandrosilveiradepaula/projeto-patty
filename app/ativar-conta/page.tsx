import { ClientActivationPasswordForm } from "@/components/auth/ClientActivationPasswordForm";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCurrentAuthContext } from "@/lib/supabase/auth";

import styles from "./page.module.css";

type ActivationPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function ActivationPage({
  searchParams,
}: ActivationPageProps) {
  const { error } = await searchParams;
  const context = await getCurrentAuthContext();
  const canActivate = Boolean(context?.role) && error !== "invalid";

  return (
    <main className={styles.shell}>
      <section aria-labelledby="activation-title" className={styles.content}>
        <PageHeader
          description="Confirme seu acesso criando uma senha. Depois disso, o login normal será feito com email e senha."
          eyebrow="Corpo & Mente"
          title="Ativar sua conta"
          titleId="activation-title"
        />
        <Card>
          {canActivate ? (
            <ClientActivationPasswordForm role={context?.role ?? null} />
          ) : (
            <Alert
              live="polite"
              title="Link inválido ou expirado"
              variant="warning"
            >
              Este convite não pode mais ser usado. Entre em contato com a
              Patty para receber um novo link.
            </Alert>
          )}
        </Card>
      </section>
    </main>
  );
}
