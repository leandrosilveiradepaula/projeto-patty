"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import { createClient } from "@/lib/supabase/client";

import styles from "./AdminMfa.module.css";

export function AdminMfaChallenge() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!/^\d{6}$/.test(code)) {
      setMessage("Informe o código de 6 dígitos do aplicativo autenticador.");
      return;
    }

    setIsPending(true);
    setMessage(null);

    const supabase = createClient();
    const factors = await supabase.auth.mfa.listFactors();

    if (factors.error) {
      setMessage("Não foi possível localizar o fator MFA.");
      setIsPending(false);
      return;
    }

    const factor = factors.data.totp.find(
      (item) => item.status === "verified",
    );

    if (!factor) {
      router.replace("/mfa/admin/setup");
      router.refresh();
      return;
    }

    const challenge = await supabase.auth.mfa.challenge({
      factorId: factor.id,
    });

    if (challenge.error) {
      setMessage("Não foi possível criar o desafio MFA.");
      setIsPending(false);
      return;
    }

    const verification = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.data.id,
      code,
    });

    if (verification.error) {
      setMessage("Código inválido ou expirado. Gere um novo código e tente novamente.");
      setIsPending(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <div className={styles.stack}>
      {message ? (
        <Alert live="assertive" title="MFA não confirmado" variant="critical">
          {message}
        </Alert>
      ) : null}

      <p className={styles.text}>
        Digite o código atual do aplicativo autenticador para concluir o acesso
        administrativo.
      </p>

      <form className={styles.form} onSubmit={verify}>
        <FormField
          description="O código TOTP muda periodicamente."
          id="admin-mfa-challenge-code"
          label="Código de autenticação"
          required
        >
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              pattern="[0-9]{6}"
              value={code}
            />
          )}
        </FormField>

        <Button loading={isPending} type="submit">
          Confirmar acesso
        </Button>
      </form>
    </div>
  );
}
