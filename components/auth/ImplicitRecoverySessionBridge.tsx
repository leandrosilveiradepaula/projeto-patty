"use client";

import { useEffect } from "react";

import { Alert } from "@/components/ui/Alert";
import { parseImplicitRecoveryFragment } from "@/lib/onboarding/implicit-recovery";
import { createClient } from "@/lib/supabase/client";

export function ImplicitRecoverySessionBridge() {
  useEffect(() => {
    const parsed = parseImplicitRecoveryFragment(window.location.hash);

    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );

    if (parsed.kind !== "recovery") {
      window.location.replace("/redefinir-senha?error=invalid");
      return;
    }

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
  }, []);

  return (
    <Alert live="polite" title="Validando link de recuperação" variant="info">
      Aguarde enquanto preparamos a redefinição da sua senha.
    </Alert>
  );
}
