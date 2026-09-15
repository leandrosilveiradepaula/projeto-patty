import { ClientBottomNav } from "@/components/layout/ClientBottomNav";
import { ClientShell } from "@/components/layout/ClientShell";
import type { ReactNode } from "react";

export default function ClienteLayout({ children }: { children: ReactNode }) {
  return (
    <ClientShell
      header="Área da cliente"
      navigation={<ClientBottomNav />}
    >
      {children}
    </ClientShell>
  );
}
