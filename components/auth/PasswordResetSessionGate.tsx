"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { parseImplicitRecoveryFragment } from "@/lib/onboarding/implicit-recovery";
import { createClient } from "@/lib/supabase/client";

import { PasswordResetForm } from "./PasswordResetForm";

export function PasswordResetSessionGate({
  hasServerSession,
}: {
  hasServerSession: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const parsed = parseImplicitRecoveryFragment(window.location.hash);

    if (parsed.kind === "recovery") {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );

      void (async () => {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token: parsed.accessToken,
          refresh_token: parsed.refreshToken,
        });

        if (error) {
          window.location.replace("/redefinir-senha?error=invalid");
          return;
        }

        window.location.replace("/redefinir-senha");
      })();

      return;
    }

    if (parsed.kind === "invalid") {
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      window.location.replace("/redefinir-senha?error=invalid");
      return;
    }

    if (hasServerSession) {
      setReady(true);
      return;
    }

    window.location.replace("/redefinir-senha?error=invalid");
  }, [hasServerSession]);

  if (!ready) {
    return (
      <Alert live="polite" title="Validando recuperação" variant="info">
        Aguarde enquanto verificamos o link e a sessão antes de liberar a troca de senha.
      </Alert>
    );
  }

  return <PasswordResetForm />;
}
