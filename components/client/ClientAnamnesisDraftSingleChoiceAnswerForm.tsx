"use client";

import { useActionState } from "react";

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
  required: boolean;
  submissionId: string;
};

export function ClientAnamnesisDraftSingleChoiceAnswerForm({
  initialValue,
  label,
  options,
  questionId,
  required,
  submissionId,
}: ClientAnamnesisDraftSingleChoiceAnswerFormProps) {
  const action = saveClientAnamnesisDraftSingleChoiceAnswer.bind(
    null,
    submissionId,
    questionId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);
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
          restante em outro momento; o envio final ainda não está disponível.
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
