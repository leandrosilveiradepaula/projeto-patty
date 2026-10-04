import { LoginForm } from "@/components/auth/LoginForm";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import styles from "./page.module.css";

type LoginPageProps = {
  searchParams: Promise<{ password?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { password } = await searchParams;

  return (
    <main className={styles.shell}>
      <section aria-labelledby="login-title" className={styles.content}>
        <PageHeader
          description="Acesse sua área na Consultoria Corpo & Mente."
          eyebrow="Corpo & Mente"
          title="Entrar"
          titleId="login-title"
        />
        {password === "updated" ? (
          <Alert live="polite" title="Senha atualizada" variant="success">
            Entre novamente usando sua nova senha.
          </Alert>
        ) : null}
        <Card>
          <LoginForm />
        </Card>
      </section>
    </main>
  );
}
