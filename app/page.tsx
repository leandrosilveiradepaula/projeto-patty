import { redirect } from "next/navigation";

import { getCurrentAuthContext } from "@/lib/supabase/auth";

export default async function Home() {
  const context = await getCurrentAuthContext();

  if (context?.role === "admin") {
    redirect("/admin");
  }

  if (context?.role === "client") {
    redirect("/cliente");
  }

  redirect("/login");
}
