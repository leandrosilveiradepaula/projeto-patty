import { AdminShell } from "@/components/layout/AdminShell";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { requireRole } from "@/lib/supabase/auth";
import type { ReactNode } from "react";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("admin");

  return (
    <AdminShell
      header={<AdminSidebar mode="mobile" />}
      navigation={<AdminSidebar />}
    >
      {children}
    </AdminShell>
  );
}
