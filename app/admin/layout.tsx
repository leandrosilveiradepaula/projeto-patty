import { AdminShell } from "@/components/layout/AdminShell";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { requireRole } from "@/lib/supabase/auth";
import { getCurrentUserProfile } from "@/lib/supabase/data-access";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("admin");
  const profile = await getCurrentUserProfile();

  return (
    <AdminShell
      header={<AdminSidebar displayName={profile?.display_name} mode="mobile" />}
      navigation={<AdminSidebar displayName={profile?.display_name} />}
    >
      {children}
    </AdminShell>
  );
}
