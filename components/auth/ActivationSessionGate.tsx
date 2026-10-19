"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { parseImplicitInviteFragment } from "@/lib/onboarding/implicit-invite";
import { createClient } from "@/lib/supabase/client";
import { ClientActivationPasswordForm } from "./ClientActivationPasswordForm";

type Phase = "checking" | "ready" | "invalid" | "failed";

/** URL fragments are invisible to the server until the browser establishes the session. */
export function ActivationSessionGate({
  invalid,
  role,
}: {
  invalid: boolean;
  role: "admin" | "client" | null;
}) {
  const [phase, setPhase] = useState<Phase>(
    invalid ? "invalid" : role ? "ready" : "checking",
  );

  useEffect(() => {
    if (invalid) {
      setPhase("invalid");
      return;
    }

    const parsed = parseImplicitInviteFragment(window.location.hash);
    if (parsed.kind === "none") {
      if (role) {
        setPhase("ready");
        return;
      }

      // The browser has just received GoTrue's callback cookies, but the
      // initial Server Component may still contain the pre-confirmation role.
      // Browser getUser() can itself lag behind this cookie handoff. A single
      // fresh GET is safe: the *server* remains the sole role authority.
      // The query parameter cannot grant a session, role or access.
      if (new URLSearchParams(window.location.search).get("session_refresh") === "1") {
        setPhase("failed");
        return;
      }
      setPhase("checking");
      window.location.replace("/ativar-conta?session_refresh=1");
      return;
    }

    // Scrub one-time tokens before any asynchronous request.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );
    if (parsed.kind === "invalid") {
      setPhase("invalid");
      return;
    }

    setPhase("checking");
    void (async () => {
      try {
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token: parsed.accessToken,
          refresh_token: parsed.refreshToken,
        });
        if (error) {
          setPhase("invalid");
          return;
        }
        // Re-render server components against the newly established session.
        window.location.replace("/ativar-conta");
      } catch {
        setPhase("failed");
      }
    })();
  }, [invalid, role]);

  if (phase === "ready" && role && !invalid) {
    return <ClientActivationPasswordForm role={role} />;
  }
  if (phase === "invalid") {
    return (
      <Alert live="polite" title="Link inválido ou expirado" variant="warning">
        Este convite não pode mais ser usado. Entre em contato com a Patty
        para receber um novo link.
      </Alert>
    );
  }
  if (phase === "failed") {
    return (
      <Alert live="assertive" title="Não foi possível validar o convite" variant="critical">
        Confira sua conexão. Se não conseguir concluir a ativação, peça à
        Patty um novo link seguro.
      </Alert>
    );
  }
  return (
    <Alert live="polite" title="Validando convite" variant="info">
      Estamos verificando seu acesso antes de liberar a criação da senha.
    </Alert>
  );
}
