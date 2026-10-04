import Link from "next/link";

import { PasswordRecoveryRequestForm } from "@/components/auth/PasswordRecoveryRequestForm";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";

import styles from "./page.module.css";

export default function PasswordRecoveryPage() {
  return (
    <main className={styles.shell}>
      <section aria-labelledby="recovery-title" className={styles.content}>
        <PageHeader
          description="Informe o email usado no acesso ao aplicativo."
          eyebrow="Corpo & Mente"
          title="Recuperar senha"
          titleId="recovery-title"
        />
        <Card>
          <PasswordRecoveryRequestForm />
        </Card>
        <Link className={styles.backLink} href="/login">
          Voltar ao login
        </Link>
      </section>
    </main>
  );
}
