"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";

export function ClientAnamnesisDraftProgressRefresh() {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  return (
    <Button
      disabled={isRefreshing}
      loading={isRefreshing}
      onClick={() => startTransition(() => router.refresh())}
      size="compact"
      type="button"
      variant="secondary"
    >
      Atualizar resumo de respostas salvas
    </Button>
  );
}
