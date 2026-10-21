"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import {
  ADMIN_MFA_FRIENDLY_NAME,
  decideAdminMfaEnrollment,
} from "@/lib/onboarding/admin-mfa-enrollment";
import { createClient } from "@/lib/supabase/client";

import styles from "./AdminMfa.module.css";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type SetupKind = "checking" | "new" | "reset_pending" | "blocked" | "enrolled";

export function AdminMfaSetup() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [setupKind, setSetupKind] = useState<SetupKind>("checking");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(true);
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function inspectEnrollment() {
      const supabase = createClient();
      const factors = await supabase.auth.mfa.listFactors();
      if (cancelled) return;

      if (factors.error || !factors.data) {
        setMessage("Não foi possível verificar os fatores MFA existentes.");
        setSetupKind("blocked");
        setIsPending(false);
        return;
      }

      // .totp contains only verified factors; .all also includes enrollments
      // interrupted before verification. Inspection NEVER creates or removes MFA.
      const decision = decideAdminMfaEnrollment(factors.data.all);

      if (decision.kind === "challenge") {
        router.replace("/mfa/admin/challenge");
        router.refresh();
        return;
      }

      if (decision.kind === "blocked") {
        setMessage("Há configurações de MFA que exigem conferência antes de prosseguir.");
      }

      setSetupKind(decision.kind);
      setIsPending(false);
    }

    void inspectEnrollment();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function beginEnrollment() {
    // Explicit, single-click authorization is required before discarding a
    // pending factor or creating a new one. Refreshing this page is read-only.
    if (busy.current || (setupKind !== "new" && setupKind !== "reset_pending")) {
      return;
    }

    busy.current = true;
    setIsPending(true);
    setMessage(null);
    setCode("");

    try {
      const supabase = createClient();
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error || !factors.data) {
        setMessage("Não foi possível conferir a configuração de MFA. Tente novamente.");
        return;
      }

      const decision = decideAdminMfaEnrollment(factors.data.all);
      if (decision.kind === "challenge") {
        router.replace("/mfa/admin/challenge");
        router.refresh();
        return;
      }

      if (decision.kind === "blocked") {
        setSetupKind("blocked");
        setMessage("Não é seguro alterar os fatores MFA desta sessão. Solicite suporte.");
        return;
      }

      if (decision.kind === "reset_pending") {
        // Only the exact unfinished TOTP enrollment of this app may be removed.
        // Verified factors and enrollments belonging to other flows are never
        // passed to unenroll(). Supabase requires AAL2 to remove a verified MFA.
        const removal = await supabase.auth.mfa.unenroll({
          factorId: decision.factorId,
        });

        if (removal.error) {
          setMessage("Não foi possível descartar o cadastro MFA pendente. Solicite suporte.");
          return;
        }

        setSetupKind("new");
        const afterRemoval = await supabase.auth.mfa.listFactors();
        if (afterRemoval.error || !afterRemoval.data) {
          setMessage("Não foi possível conferir a remoção do fator pendente. Solicite suporte.");
          return;
        }

        const afterDecision = decideAdminMfaEnrollment(afterRemoval.data.all);
        if (afterDecision.kind !== "new") {
          setSetupKind("blocked");
          setMessage("A configuração MFA mudou durante a operação. Solicite suporte.");
          return;
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: ADMIN_MFA_FRIENDLY_NAME,
      });

      if (error || !data) {
        setMessage(
          error?.code === "mfa_factor_name_conflict"
            ? "Já existe um cadastro MFA pendente. Reabra esta página para conferi-lo."
            : "Não foi possível iniciar a configuração do MFA. Tente novamente.",
        );
        return;
      }

      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
      setSetupKind("enrolled");
    } catch {
      setMessage("Não foi possível continuar a configuração do MFA. Tente novamente.");
    } finally {
      busy.current = false;
      setIsPending(false);
    }
  }

  async function verifyEnrollment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending || busy.current) return;
    if (!enrollment || !/^\d{6}$/.test(code)) {
      setMessage("Informe o código de 6 dígitos do aplicativo autenticador.");
      return;
    }

    busy.current = true;
    setIsPending(true);
    setMessage(null);

    try {
      const supabase = createClient();
      const challenge = await supabase.auth.mfa.challenge({
        factorId: enrollment.factorId,
      });

      if (challenge.error) {
        setMessage("Não foi possível criar o desafio MFA.");
        return;
      }

      const verification = await supabase.auth.mfa.verify({
        factorId: enrollment.factorId,
        challengeId: challenge.data.id,
        code,
      });

      if (verification.error) {
        setMessage("Código inválido ou expirado. Gere um novo código e tente novamente.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setMessage("Não foi possível validar o segundo fator. Tente novamente.");
    } finally {
      busy.current = false;
      setIsPending(false);
    }
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
          <Alert variant="warning" title="Chave de autenticação privada">
            Não compartilhe capturas do QR code, chave manual ou códigos de seis dígitos.
            Se essa chave for exposta antes da ativação, recarregue a página e
            descarte a configuração pendente para gerar outra.
          </Alert>

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

            <Button disabled={isPending} loading={isPending} type="submit">
              Ativar MFA
            </Button>
          </form>
        </>
      ) : setupKind === "new" || setupKind === "reset_pending" ? (
        <>
          {setupKind === "reset_pending" ? (
            <Alert title="Configuração anterior não concluída" variant="warning">
              Há um autenticador pendente nesta conta. Ao continuar, somente
              essa configuração não verificada será descartada e um novo QR code
              será gerado. Não utilize a chave anterior.
            </Alert>
          ) : (
            <p className={styles.text}>
              Gere uma chave nova somente quando estiver pronto para cadastrar
              o aplicativo autenticador.
            </p>
          )}
          <Button
            disabled={isPending}
            loading={isPending}
            onClick={() => { void beginEnrollment(); }}
            type="button"
          >
            {setupKind === "reset_pending"
              ? "Descartar configuração pendente e gerar nova chave"
              : "Gerar chave de MFA"}
          </Button>
        </>
      ) : (
        <p className={styles.text}>
          {isPending ? "Conferindo configuração segura..." : "MFA indisponível."}
        </p>
      )}
    </div>
  );
}
