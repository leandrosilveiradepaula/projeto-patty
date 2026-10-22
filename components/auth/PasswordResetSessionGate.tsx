"use client";

import { useEffect, useState } from "react";

import { Alert } from "@/components/ui/Alert";
import { parseImplicitRecoveryFragment } from "@/lib/onboarding/implicit-recovery";

import { PasswordResetForm } from "./PasswordResetForm";

export function PasswordResetSessionGate({
  hasVerifiedRecovery,
}: {
  hasVerifiedRecovery: boolean;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const parsed = parseImplicitRecoveryFragment(window.location.hash);

    if (parsed.kind !== "none") {
      // An implicit URL fragment is client-controlled. In particular a
      // passwordless login and legacy implicit reset can both produce a JWT
      // with amr=otp. No server-side callback can attest the recovery purpose,
      // so never install that session or unlock password changes here.
      // The customer can request a fresh PKCE recovery link instead.
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
      window.location.replace("/redefinir-senha?error=invalid");
      return;
    }

    if (hasVerifiedRecovery) {
      setReady(true);
      return;
    }

    window.location.replace("/redefinir-senha?error=invalid");
  }, [hasVerifiedRecovery]);

  if (!ready) {
    return (
      <Alert live="polite" title="Validando recuperação" variant="info">
        Aguarde enquanto verificamos o link e a sessão antes de liberar a troca de senha.
      </Alert>
    );
  }

  return <PasswordResetForm />;
}
