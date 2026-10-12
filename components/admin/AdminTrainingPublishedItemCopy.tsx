"use client";
import { useActionState } from "react";
import { copyPublishedTrainingItemAction, type TrainingPlanFormState } from "@/app/admin/clientes/[clienteId]/treino/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

const initial: TrainingPlanFormState = { message: null, success: false };

export function AdminTrainingPublishedItemCopy({clientId,draftVersionId,publishedVersionId,sourceItemId}: {
  clientId:string; draftVersionId:string; publishedVersionId:string; sourceItemId:string;
}) {
  const [state, action, pending] = useActionState(
    copyPublishedTrainingItemAction.bind(null, clientId, draftVersionId, publishedVersionId, sourceItemId), initial,
  );
  return <form action={action} aria-busy={pending}>
    {state.message ? <Alert variant={state.success ? "success" : "critical"} title={state.success ? "Cópia realizada" : "Não foi possível copiar"}>{state.message}</Alert> : null}
    <input type="hidden" name="confirmCopy" value="yes"/>
    <Button type="submit" variant="secondary" loading={pending} disabled={pending || state.success}>
      {state.success ? "Item copiado" : "Copiar para rascunho"}
    </Button>
  </form>;
}
