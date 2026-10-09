"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  deleteTrainingPlanItemAction,
  publishTrainingPlanVersionAction,
  reviewTrainingPlanVersionAction,
  type TrainingPlanFormState,
} from "@/app/admin/clientes/[clienteId]/treino/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

import styles from "./AdminTrainingPlanForms.module.css";

const initialState: TrainingPlanFormState = {
  message: null,
  success: false,
};

type Props =
  | {
      clientId: string;
      mode: "review";
      trainingPlanVersionId: string;
      disabled?: boolean;
    }
  | {
      clientId: string;
      mode: "publish";
      trainingPlanVersionId: string;
      disabled?: boolean;
    }
  | {
      clientId: string;
      itemId: string;
      mode: "delete";
      trainingPlanVersionId: string;
      disabled?: boolean;
    };

export function AdminTrainingPlanLifecycleAction(props: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmTransition, setConfirmTransition] = useState(false);
  const router = useRouter();

  const action =
    props.mode === "review"
      ? reviewTrainingPlanVersionAction.bind(
          null,
          props.clientId,
          props.trainingPlanVersionId,
        )
      : props.mode === "publish"
        ? publishTrainingPlanVersionAction.bind(
            null,
            props.clientId,
            props.trainingPlanVersionId,
          )
        : deleteTrainingPlanItemAction.bind(
            null,
            props.clientId,
            props.trainingPlanVersionId,
            props.itemId,
          );

  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  if (props.mode === "delete" && !confirmDelete) {
    return (
      <Button
        onClick={() => setConfirmDelete(true)}
        size="compact"
        type="button"
        variant="danger"
      >
        Remover exercício
      </Button>
    );
  }

  if (props.mode !== "delete" && !confirmTransition) {
    return (
      <Button
        disabled={props.disabled}
        onClick={() => setConfirmTransition(true)}
        type="button"
        variant={props.mode === "review" ? "secondary" : "primary"}
      >
        {props.mode === "review" ? "Revisar treino" : "Publicar treino"}
      </Button>
    );
  }

  return (
    <form action={formAction} className={styles.actionForm}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Ação concluída" : "Não foi possível concluir"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      {props.mode === "delete" ? (
        <div className={styles.confirmation}>
          <p>
            Remover este exercício do rascunho? Esta ação afeta somente a versão
            ainda não revisada.
          </p>
          <div className={styles.actionRow}>
            <Button
              disabled={isPending}
              onClick={() => setConfirmDelete(false)}
              size="compact"
              type="button"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button
              loading={isPending}
              size="compact"
              type="submit"
              variant="danger"
            >
              Confirmar remoção
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.confirmation}>
          <p>
            {props.mode === "review"
              ? "Confirmar revisão? Esta versão ficará congelada e não poderá mais receber alterações nos exercícios ou orientações."
              : "Confirmar publicação? Somente esta versão revisada ficará visível para a cliente. A ação não pode ser desfeita por esta tela."}
          </p>
          <div className={styles.actionRow}>
            <Button
              disabled={isPending}
              onClick={() => setConfirmTransition(false)}
              type="button"
              variant="ghost"
            >
              Cancelar
            </Button>
            <Button
              loading={isPending}
              type="submit"
              variant={props.mode === "review" ? "secondary" : "primary"}
            >
              {props.mode === "review" ? "Confirmar revisão" : "Confirmar publicação"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
