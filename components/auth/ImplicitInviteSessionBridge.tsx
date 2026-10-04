"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { parseImplicitInviteFragment } from "@/lib/onboarding/implicit-invite";
import { createClient } from "@/lib/supabase/client";

export function ImplicitInviteSessionBridge() {
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const parsed = parseImplicitInviteFragment(window.location.hash);

    if (parsed.kind === "none") {
      return;
    }

    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );

    if (parsed.kind === "invalid") {
      window.location.replace("/login?invite=invalid");
      return;
    }

    setProcessing(true);

    void (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.setSession({
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
      });

      if (error) {
        window.location.replace("/login?invite=invalid");
        return;
      }

      window.location.replace("/ativar-conta");
    })();
  }, []);

  if (!processing) {
    return null;
  }

  return (
    <Alert live="polite" title="Validando convite" variant="info">
      Aguarde enquanto preparamos a ativação da sua conta.
    </Alert>
  );
}
