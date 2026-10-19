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
  const [authorizedRole, setAuthorizedRole] = useState<typeof role>(role);

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

      // Supabase has finished the invite callback, but the first Server
      // Component can still carry a stale anonymous role. Request a fresh,
      // private, uncached authorization read under the browser's new cookie.
      // No query parameter or browser-supplied role may grant access.
      setPhase("checking");
      const controller = new AbortController();
      void (async () => {
        try {
          const response = await fetch("/ativar-conta/session", {
            cache: "no-store",
            credentials: "same-origin",
            headers: { Accept: "application/json" },
            signal: controller.signal,
          });
          if (!response.ok) throw new Error("Session verification unavailable");
          const verified = await response.json() as { role?: unknown };
          if (controller.signal.aborted) return;
          if (verified.role === "client" || verified.role === "admin") {
            setAuthorizedRole(verified.role);
            setPhase("ready");
          } else {
            setPhase("failed");
          }
        } catch {
          if (!controller.signal.aborted) setPhase("failed");
        }
      })();
      return () => controller.abort();
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

  if (phase === "ready" && authorizedRole && !invalid) {
    return <ClientActivationPasswordForm role={authorizedRole} />;
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
