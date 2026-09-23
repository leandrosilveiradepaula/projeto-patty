import { redirect } from "next/navigation";

import { AdminMfaSetup } from "@/components/auth/AdminMfaSetup";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  getAuthenticatorAssuranceState,
  requireRoleIdentity,
} from "@/lib/supabase/auth";

import styles from "../page.module.css";

export default async function AdminMfaSetupPage() {
  await requireRoleIdentity("admin");
  const assurance = await getAuthenticatorAssuranceState();

  if (assurance.currentLevel === "aal2") {
    redirect("/admin");
  }

  if (assurance.nextLevel === "aal2") {
    redirect("/mfa/admin/challenge");
  }

  return (
    <main className={styles.shell}>
      <section aria-labelledby="mfa-setup-title" className={styles.content}>
        <PageHeader
          description="Configure o segundo fator obrigatório para acessar a área administrativa."
          eyebrow="Segurança"
          title="Ativar autenticação em duas etapas"
          titleId="mfa-setup-title"
        />
        <Card>
          <AdminMfaSetup />
        </Card>
      </section>
    </main>
  );
}
