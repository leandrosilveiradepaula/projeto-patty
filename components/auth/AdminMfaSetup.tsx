"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import { createClient } from "@/lib/supabase/client";

import styles from "./AdminMfa.module.css";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

export function AdminMfaSetup() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function startEnrollment() {
      const supabase = createClient();
      const factors = await supabase.auth.mfa.listFactors();

      if (factors.error) {
        if (!cancelled) {
          setMessage("Não foi possível verificar os fatores MFA existentes.");
          setIsPending(false);
        }
        return;
      }

      const verifiedTotp = factors.data.totp.find(
        (factor) => factor.status === "verified",
      );

      if (verifiedTotp) {
        router.replace("/mfa/admin/challenge");
        router.refresh();
        return;
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Corpo e Mente Admin",
      });

      if (cancelled) return;

      if (error) {
        setMessage("Não foi possível iniciar a configuração do MFA.");
        setIsPending(false);
        return;
      }

      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setIsPending(false);
    }

    void startEnrollment();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function verifyEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!enrollment || !/^\d{6}$/.test(code)) {
      setMessage("Informe o código de 6 dígitos do aplicativo autenticador.");
      return;
    }

    setIsPending(true);
    setMessage(null);

    const supabase = createClient();
    const challenge = await supabase.auth.mfa.challenge({
      factorId: enrollment.factorId,
    });

    if (challenge.error) {
      setMessage("Não foi possível criar o desafio MFA.");
      setIsPending(false);
      return;
    }

    const verification = await supabase.auth.mfa.verify({
      factorId: enrollment.factorId,
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
        <Alert live="assertive" title="MFA não concluído" variant="critical">
          {message}
        </Alert>
      ) : null}

      <p className={styles.text}>
        O acesso administrativo exige um segundo fator. Escaneie o QR code em
        um aplicativo autenticador e confirme com o código de 6 dígitos.
      </p>

      {enrollment ? (
        <>
          <div className={styles.qrPanel}>
            <img
              alt="QR code para configurar o autenticador"
              className={styles.qrCode}
              src={enrollment.qrCode}
            />
          </div>

          <div className={styles.secretPanel}>
            <span className={styles.secretLabel}>Chave manual</span>
            <code className={styles.secret}>{enrollment.secret}</code>
          </div>

          <form className={styles.form} onSubmit={verifyEnrollment}>
            <FormField
              description="Use o código atual do aplicativo autenticador."
              id="admin-mfa-setup-code"
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
              Ativar MFA
            </Button>
          </form>
        </>
      ) : (
        <p className={styles.text}>
          {isPending ? "Preparando configuração segura..." : "MFA indisponível."}
        </p>
      )}
    </div>
  );
}
