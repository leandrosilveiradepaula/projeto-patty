"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  type ClientAnamnesisDraftAnswerFormState,
  saveClientAnamnesisDraftSingleChoiceAnswer,
} from "@/app/cliente/anamnese/[anamneseId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import styles from "./ClientAnamnesisDraftSingleChoiceAnswerForm.module.css";

const initialState: ClientAnamnesisDraftAnswerFormState = {
  message: null,
  success: false,
};

type ClientAnamnesisDraftSingleChoiceAnswerFormProps = {
  initialValue: string | null;
  label: string;
  options: string[];
  questionId: string;
  reloadPageOnSuccess?: boolean;
  required: boolean;
  submissionId: string;
};

export function ClientAnamnesisDraftSingleChoiceAnswerForm({
  initialValue,
  label,
  options,
  questionId,
  reloadPageOnSuccess = false,
  required,
  submissionId,
}: ClientAnamnesisDraftSingleChoiceAnswerFormProps) {
  const action = saveClientAnamnesisDraftSingleChoiceAnswer.bind(
    null,
    submissionId,
    questionId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();

  useEffect(() => {
    if (!state.success) {
      return;
    }

    if (reloadPageOnSuccess) {
      window.location.assign(`/cliente/anamnese/${submissionId}`);
      return;
    }

    router.refresh();
  }, [reloadPageOnSuccess, router, state.success, submissionId]);

  const descriptionId = `anamnesis-draft-choice-${questionId}-description`;

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Rascunho salvo" : "Não foi possível salvar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          <span>{label}</span>
          {required ? (
            <span className={styles.required} aria-label="obrigatorio">
              *
            </span>
          ) : null}
        </legend>
        <p className={styles.description} id={descriptionId}>
          Selecione uma opção para esta resposta. Você pode salvar e continuar o
          restante em outro momento. Quando terminar todos os campos aplicáveis,
          use a seção de finalização para enviar a Anamnese.
        </p>
        <div
          aria-describedby={descriptionId}
          className={styles.optionList}
          role="radiogroup"
        >
          {options.map((option, index) => {
            const optionId = `anamnesis-draft-choice-${questionId}-${index}`;

            return (
              <label className={styles.option} htmlFor={optionId} key={option}>
                <input
                  defaultChecked={initialValue === option}
                  id={optionId}
                  name="answerValue"
                  type="radio"
                  value={option}
                />
                <span>{option}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className={styles.actions}>
        <Button loading={isPending} size="compact" type="submit">
          Salvar no rascunho
        </Button>
      </div>
    </form>
  );
}
