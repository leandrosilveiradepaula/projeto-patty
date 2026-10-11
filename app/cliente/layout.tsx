import { LogoutButton } from "@/components/auth/LogoutButton";
import { ClientBottomNav } from "@/components/layout/ClientBottomNav";
import { ClientShell } from "@/components/layout/ClientShell";
import { requireRole } from "@/lib/supabase/auth";
import { getCurrentClient, getCurrentUserProfile } from "@/lib/supabase/data-access";
import type { ReactNode } from "react";

export default async function ClienteLayout({ children }: { children: ReactNode }) {
  await requireRole("client");
  const [client, profile] = await Promise.all([getCurrentClient(), getCurrentUserProfile()]);

  return (
    <ClientShell
      header={client?.full_name?.trim() || profile?.display_name?.trim() || "Área da cliente"}
      headerAction={<LogoutButton />}
      navigation={<ClientBottomNav />}
    >
      {children}
    </ClientShell>
  );
}
