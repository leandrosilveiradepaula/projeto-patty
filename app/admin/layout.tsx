import { AdminShell } from "@/components/layout/AdminShell";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import type { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminShell
      header={<AdminSidebar mode="mobile" />}
      navigation={<AdminSidebar />}
    >
      {children}
    </AdminShell>
  );
}
