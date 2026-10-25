"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  updateProtocolVersionManualGuidance,
  type ProtocolLifecycleFormState,
} from "@/app/admin/protocolos/[protocoloId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import type { ManualGuidance } from "@/lib/protocol/manual-guidance";
import styles from "./AdminProtocolManualGuidanceForm.module.css";

const initialState: ProtocolLifecycleFormState = { message: null, success: false };

export function AdminProtocolManualGuidanceForm({
  protocolId, protocolVersionId, values,
}: {
  protocolId: string;
  protocolVersionId: string;
  values: ManualGuidance;
}) {
  const action = updateProtocolVersionManualGuidance.bind(null, protocolId, protocolVersionId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const inFlight = useRef(false);
  const router = useRouter();
  useEffect(() => {
    if (state.success) router.refresh();
    inFlight.current = false;
  }, [state, router]);

  return (
    <form action={formAction} className={styles.form} aria-busy={pending} onSubmit={event => {
      if (pending || inFlight.current) { event.preventDefault(); return; }
      inFlight.current = true;
    }}>
      <input type="hidden" name="expectedStage" value={JSON.stringify(values.manualStageLabel)} />
      <input type="hidden" name="expectedStart" value={JSON.stringify(values.plannedStartOn)} />
      <input type="hidden" name="expectedInstructions" value={JSON.stringify(values.clientInstructions)} />
      <input type="hidden" name="expectedFreeMealGuidance" value={JSON.stringify(values.freeMealGuidance)} />
      <input type="hidden" name="expectedSupplementGuidance" value={JSON.stringify(values.supplementGuidance)} />
      <input type="hidden" name="expectedCompoundedGuidance" value={JSON.stringify(values.compoundedGuidance)} />
      {state.message ? (
        <Alert title={state.success ? "Orientações salvas" : "Não foi possível salvar"}
          variant={state.success ? "success" : "critical"} live={state.success ? "polite" : "assertive"}>
          {state.message}
        </Alert>
      ) : null}
      <p className={styles.notice}>
        Estes campos são opcionais, preenchidos manualmente pela Patty e destinados à cliente.
        Não inclua anotações internas. Nada é publicado ao salvar o rascunho.
      </p>
      <div className={styles.fields}>
        <FormField id={`stage-${protocolVersionId}`} label="Fase ou etapa indicada pela Patty"
          description="Texto descritivo; não seleciona nem avança fases automaticamente.">
          {fieldProps => <TextInput {...fieldProps} name="stageLabel"
            defaultValue={values.manualStageLabel ?? ""} maxLength={120} disabled={pending} />}
        </FormField>
        <FormField id={`start-${protocolVersionId}`} label="Data de início informada"
          description="Não agenda nem altera o protocolo automaticamente.">
          {fieldProps => <TextInput {...fieldProps} name="plannedStartOn" type="date"
            defaultValue={values.plannedStartOn ?? ""} disabled={pending} />}
        </FormField>
      </div>
      <FormField id={`instructions-${protocolVersionId}`} label="Orientações para a cliente"
        description="Texto visível à cliente somente depois da publicação explícita desta versão.">
        {fieldProps => <Textarea {...fieldProps} name="clientInstructions" rows={5}
          maxLength={4000} defaultValue={values.clientInstructions ?? ""} disabled={pending} />}
      </FormField>
      <FormField id={`free-meal-${protocolVersionId}`} label="Refeição livre (quando indicada)"
        description="A Patty define individualmente se e como usar. Nenhuma frequência ou quantidade é preenchida automaticamente.">
        {fieldProps => <Textarea {...fieldProps} name="freeMealGuidance" rows={3} maxLength={4000}
          defaultValue={values.freeMealGuidance ?? ""} disabled={pending} />}
      </FormField>
      <FormField id={`supplements-${protocolVersionId}`} label="Suplementação (quando indicada)"
        description="Somente a orientação registrada pela profissional. O aplicativo não recomenda produtos nem doses.">
        {fieldProps => <Textarea {...fieldProps} name="supplementGuidance" rows={3} maxLength={4000}
          defaultValue={values.supplementGuidance ?? ""} disabled={pending} />}
      </FormField>
      <FormField id={`compounded-${protocolVersionId}`} label="Manipulados (quando indicados)"
        description="Orientação individual da Patty; não há prescrição, fórmula ou dose automática.">
        {fieldProps => <Textarea {...fieldProps} name="compoundedGuidance" rows={3} maxLength={4000}
          defaultValue={values.compoundedGuidance ?? ""} disabled={pending} />}
      </FormField>
      <Button disabled={pending} loading={pending} type="submit">Salvar orientações no rascunho</Button>
    </form>
  );
}
