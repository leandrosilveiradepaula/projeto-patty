"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addTrainingPlanItemAction,
  type TrainingPlanFormState,
  updateTrainingPlanItemAction,
} from "@/app/admin/clientes/[clienteId]/treino/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";

import { isHistoricalExerciseSelectionUnavailable } from "@/lib/training/exercise-selection";

import styles from "./AdminTrainingPlanForms.module.css";

const initialState: TrainingPlanFormState = {
  message: null,
  success: false,
};

type ExerciseOption = {
  id: string;
  name: string;
  versionNumber: number;
};

type Item = {
  executionNotes: string | null;
  exerciseName: string;
  exerciseVersionId: string | null;
  id: string;
  repetitionsText: string;
  restText: string | null;
  setsText: string;
};

type Props = {
  clientId: string;
  exerciseOptions: ExerciseOption[];
  item?: Item;
  trainingPlanVersionId: string;
};

export function AdminTrainingPlanItemForm({
  clientId,
  exerciseOptions,
  item,
  trainingPlanVersionId,
}: Props) {
  const action = item
    ? updateTrainingPlanItemAction.bind(
        null,
        clientId,
        trainingPlanVersionId,
        item.id,
      )
    : addTrainingPlanItemAction.bind(
        null,
        clientId,
        trainingPlanVersionId,
      );
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [selectedExerciseId, setSelectedExerciseId] = useState(item?.exerciseVersionId ?? "");
  const formRef = useRef<HTMLFormElement>(null);
  const inFlightRef = useRef(false);
  const router = useRouter();
  const selectedExercise = exerciseOptions.find((exercise) => exercise.id === selectedExerciseId);
  const missingHistoricalVersion = isHistoricalExerciseSelectionUnavailable(
    item?.exerciseVersionId,
    selectedExerciseId,
    exerciseOptions,
  );

  useEffect(() => {
    if (state.success) {
      if (!item) {
        formRef.current?.reset();
        setSelectedExerciseId("");
      }
      router.refresh();
    }
    inFlightRef.current = false;
  }, [state, item?.id, router]);

  useEffect(() => {
    setSelectedExerciseId(item?.exerciseVersionId ?? "");
  }, [item?.exerciseVersionId]);

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className={styles.form}
      onSubmit={(event) => {
        if (inFlightRef.current || missingHistoricalVersion) {
          event.preventDefault();
          return;
        }
        inFlightRef.current = true;
      }}
      ref={formRef}
    >
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={
            state.success
              ? item
                ? "Exercício atualizado"
                : "Exercício adicionado"
              : "Não foi possível salvar"
          }
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <label className={styles.field}>
        <span>Exercício da biblioteca (opcional)</span>
        <select
          className={styles.select}
          disabled={isPending}
          name="exerciseVersionId"
          onChange={(event) => setSelectedExerciseId(event.target.value)}
          value={selectedExerciseId}
        >
          <option value="">Usar nome manual</option>
          {missingHistoricalVersion ? (
            <option disabled value={selectedExerciseId}>
              Versão original indisponível — selecione uma versão publicada ou nome manual
            </option>
          ) : null}
          {exerciseOptions.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name} · v{exercise.versionNumber}
            </option>
          ))}
        </select>
        <small>
          {missingHistoricalVersion
            ? "Esta versão vinculada não está disponível no catálogo. A referência original foi preservada; selecione explicitamente outra versão publicada ou nome manual antes de salvar."
            : selectedExercise
            ? `Selecionado: ${selectedExercise.name} · versão ${selectedExercise.versionNumber}. O nome manual não será enviado.`
            : "Sem versão selecionada: informe o nome manual abaixo para a prescrição."}
        </small>
      </label>

      <FormField
        description="Obrigatório somente quando nenhum exercício da biblioteca for selecionado."
        id={item ? `training-item-name-${item.id}` : "training-item-name-new"}
        label="Nome manual do exercício"
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            defaultValue={item?.exerciseName}
            disabled={isPending || Boolean(selectedExercise) || missingHistoricalVersion}
            maxLength={200}
            name="exerciseName"
            required={!selectedExercise}
          />
        )}
      </FormField>

      <div className={styles.twoColumns}>
        <FormField
          id={item ? `training-item-sets-${item.id}` : "training-item-sets-new"}
          label="Séries"
        >
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              defaultValue={item?.setsText}
              disabled={isPending}
              maxLength={80}
              name="setsText"
              placeholder="Ex.: 3"
              required
            />
          )}
        </FormField>

        <FormField
          id={item ? `training-item-reps-${item.id}` : "training-item-reps-new"}
          label="Repetições"
        >
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              defaultValue={item?.repetitionsText}
              disabled={isPending}
              maxLength={80}
              name="repetitionsText"
              placeholder="Ex.: 10–12"
              required
            />
          )}
        </FormField>
      </div>

      <FormField
        description="Opcional. Pode ser uma faixa ou orientação, sem impor unidade fixa."
        id={item ? `training-item-rest-${item.id}` : "training-item-rest-new"}
        label="Tempo de descanso"
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            defaultValue={item?.restText ?? undefined}
            disabled={isPending}
            maxLength={120}
            name="restText"
            placeholder="Ex.: 60–90 s"
          />
        )}
      </FormField>

      <FormField
        description="Opcional. Instruções de técnica, amplitude, postura ou adaptação."
        id={item ? `training-item-notes-${item.id}` : "training-item-notes-new"}
        label="Orientações de execução"
      >
        {(fieldProps) => (
          <Textarea
            {...fieldProps}
            defaultValue={item?.executionNotes ?? undefined}
            disabled={isPending}
            maxLength={2000}
            name="executionNotes"
            rows={3}
          />
        )}
      </FormField>

      <p className={styles.notice}>
        Carga/peso não é prescrita como valor fixo nesta versão do produto; ela
        depende da capacidade da paciente.
      </p>

      <Button disabled={missingHistoricalVersion || isPending} loading={isPending} type="submit">
        {item ? "Salvar exercício" : "Adicionar exercício"}
      </Button>
    </form>
  );
}
