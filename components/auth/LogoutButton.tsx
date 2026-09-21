"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

type LogoutButtonProps = { className?: string; size?: "compact" | "default"; variant?: "ghost" | "outline" };

export function LogoutButton({ className, size = "compact", variant = "ghost" }: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLogout() {
    startTransition(async () => {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (!error) {
        router.replace("/login");
        router.refresh();
      }
    });
  }

  return <Button aria-label="Encerrar sessão" className={className} loading={isPending} onClick={handleLogout} size={size} type="button" variant={variant}>Sair</Button>;
}
