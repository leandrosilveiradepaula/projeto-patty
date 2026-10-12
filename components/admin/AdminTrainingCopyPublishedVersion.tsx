"use client";
import { useActionState } from "react";
import { copyPublishedTrainingVersionItemsAction, type TrainingPlanFormState } from "@/app/admin/clientes/[clienteId]/treino/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
const initial: TrainingPlanFormState = { message: null, success: false };
export function AdminTrainingCopyPublishedVersion({ clientId, draftVersionId, publishedVersionId, numberOfItems }: {
  clientId:string; draftVersionId:string; publishedVersionId:string; numberOfItems:number;
}) {
  const [state, formAction, pending] = useActionState(
    copyPublishedTrainingVersionItemsAction.bind(null,clientId,draftVersionId,publishedVersionId),initial,
  );
  return <form action={formAction} aria-busy={pending}>
    {state.message ? <Alert title={state.success ? "Itens copiados" : "Cópia não realizada"} variant={state.success ? "success" : "critical"}>{state.message}</Alert> : null}
    <p>Copiar os {numberOfItems} exercícios da versão publicada para este rascunho vazio? Todos os itens poderão ser ajustados antes da revisão. A publicação anterior será preservada.</p>
    <label><input type="checkbox" name="confirmCopyAll" value="yes" required disabled={pending || state.success}/> Confirmo a cópia dos exercícios desta publicação.</label>
    <Button type="submit" variant="secondary" disabled={pending || state.success} loading={pending}>Copiar exercícios publicados</Button>
  </form>;
}
