import { redirect } from "next/navigation";

import { AdminMfaChallenge } from "@/components/auth/AdminMfaChallenge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getAuthenticatorAssuranceState,
  requireRoleIdentity,
} from "@/lib/supabase/auth";

import styles from "../page.module.css";

export default async function AdminMfaChallengePage() {
  await requireRoleIdentity("admin");
  const assurance = await getAuthenticatorAssuranceState();

  if (assurance.currentLevel === "aal2") {
    redirect("/admin");
  }

  if (assurance.nextLevel !== "aal2") {
    redirect("/mfa/admin/setup");
  }

  return (
    <main className={styles.shell}>
      <section aria-labelledby="mfa-challenge-title" className={styles.content}>
        <PageHeader
          description="Confirme o segundo fator para concluir o login administrativo."
          eyebrow="Segurança"
          title="Verificação em duas etapas"
          titleId="mfa-challenge-title"
        />
        <Card>
          <AdminMfaChallenge />
        </Card>
      </section>
    </main>
  );
}
