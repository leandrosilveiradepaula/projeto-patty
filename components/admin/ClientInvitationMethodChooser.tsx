"use client";

import { useCallback, useState } from "react";
import { ClientInviteForm } from "@/components/admin/ClientInviteForm";
import { ManualClientInviteForm } from "@/components/admin/ManualClientInviteForm";
import { Card } from "@/components/ui/Card";

type Method = "email" | "manual";

/** Only one Auth provisioning flow is mounted at any given time. */
export function ClientInvitationMethodChooser() {
  const [method, setMethod] = useState<Method>("manual");
  const [attempted, setAttempted] = useState(false);
  const unlockSafeRetry = useCallback(() => setAttempted(false), []);

  return (
    <div>
      <fieldset disabled={attempted} style={{ border: 0, margin: "0 0 1rem", padding: 0 }}>
        <legend style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Como deseja convidar esta cliente?</legend>
        <label style={{ display: "block", padding: "0.5rem 0" }}>
          <input type="radio" name="invitationMethod" checked={method === "manual"} onChange={() => setMethod("manual")} />
          {" "}Gerar um link de ativação para enviar manualmente
        </label>
        <label style={{ display: "block", padding: "0.5rem 0" }}>
          <input type="radio" name="invitationMethod" checked={method === "email"} onChange={() => setMethod("email")} />
          {" "}Solicitar ao Supabase o envio por email (requer SMTP configurado)
        </label>
      </fieldset>
      {attempted ? (
        <p role="status">Método bloqueado enquanto o resultado da criação da conta é verificado. Se a identidade puder existir, confira a conta antes de tentar novamente.</p>
      ) : null}
      <Card>
        {method === "manual" ? (
          <>
            <p>Cria conta e gera link individual. Não use como reenvio de convite existente.</p>
            <ManualClientInviteForm onProvisioningAttempt={() => setAttempted(true)} onSafeRetryAllowed={unlockSafeRetry} />
          </>
        ) : (
          <>
            <p>Cria conta e solicita envio. A aceitação pelo Supabase não comprova entrega do email.</p>
            <ClientInviteForm onProvisioningAttempt={() => setAttempted(true)} onSafeRetryAllowed={unlockSafeRetry} />
          </>
        )}
      </Card>
    </div>
  );
}
