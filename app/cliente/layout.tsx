import { LogoutButton } from "@/components/auth/LogoutButton";
import { ClientBottomNav } from "@/components/layout/ClientBottomNav";
import { ClientShell } from "@/components/layout/ClientShell";
import { requireRole } from "@/lib/supabase/auth";
import type { ReactNode } from "react";

export default async function ClienteLayout({ children }: { children: ReactNode }) {
  await requireRole("client");

  return (
    <ClientShell
      header="Área da cliente"
      headerAction={<LogoutButton />}
      navigation={<ClientBottomNav />}
    >
      {children}
    </ClientShell>
  );
}
