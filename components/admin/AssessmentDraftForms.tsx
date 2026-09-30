"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  type AssessmentDraftActionState,
  deleteAssessmentMeasurementAction,
  finalizeAssessmentAction,
  linkAssessmentPhotoAction,
  saveAssessmentMeasurementAction,
  unlinkAssessmentPhotoAction,
  updateAssessmentDraftAction,
} from "@/app/admin/avaliacoes/[avaliacaoId]/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import { ASSESSMENT_KIND_OPTIONS } from "@/lib/evaluations/assessment-draft";

import styles from "./AssessmentDraftForms.module.css";

const initialState: AssessmentDraftActionState = {
  message: null,
  success: false,
};

function ActionAlert({ state }: { state: AssessmentDraftActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <Alert
      live={state.success ? "polite" : "assertive"}
      title={state.success ? "Atualizado" : "Não foi possível concluir"}
      variant={state.success ? "success" : "critical"}
    >
      {state.message}
    </Alert>
  );
}

export function AssessmentDraftMetadataForm({
  assessedAt,
  assessmentId,
  assessmentKind,
}: {
  assessedAt: string;
  assessmentId: string;
  assessmentKind: string | null;
}) {
  const action = updateAssessmentDraftAction.bind(null, assessmentId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <ActionAlert state={state} />

      <FormField
        id="draft-assessment-kind"
        label="Tipo da avaliação"
        required
      >
        {(fieldProps) => (
          <select
            {...fieldProps}
            className={styles.select}
            defaultValue={assessmentKind ?? ""}
            name="assessmentKind"
            required
          >
            <option disabled value="">
              Selecione
            </option>
            {ASSESSMENT_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <FormField
        id="draft-assessment-date"
        label="Data da avaliação"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            defaultValue={assessedAt.slice(0, 10)}
            name="assessedAt"
            required
            type="date"
          />
        )}
      </FormField>

      <Button loading={isPending} type="submit" variant="secondary">
        Salvar dados do rascunho
      </Button>
    </form>
  );
}

export function AssessmentMeasurementForm({
  assessmentId,
}: {
  assessmentId: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = saveAssessmentMeasurementAction.bind(null, assessmentId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form action={formAction} className={styles.form} ref={formRef}>
      <ActionAlert state={state} />

      <div className={styles.measurementGrid}>
        <FormField
          description="Use uma chave descritiva. Enquanto o catálogo final não estiver fechado, o sistema não impõe nomes automáticos."
          id="draft-measurement-key"
          label="Medida"
          required
        >
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              maxLength={120}
              name="measurementKey"
              placeholder="Ex.: cintura"
              required
            />
          )}
        </FormField>

        <FormField
          id="draft-measurement-value"
          label="Valor"
          required
        >
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              inputMode="decimal"
              name="measurementValue"
              placeholder="Ex.: 74,5"
              required
            />
          )}
        </FormField>

        <FormField
          description="A unidade continua explícita porque o catálogo definitivo ainda está aberto."
          id="draft-measurement-unit"
          label="Unidade"
          required
        >
          {(fieldProps) => (
            <TextInput
              {...fieldProps}
              maxLength={40}
              name="unit"
              placeholder="Ex.: cm"
              required
            />
          )}
        </FormField>
      </div>

      <p className={styles.notice}>
        Salvar novamente a mesma chave atualiza a medida enquanto a avaliação
        estiver em rascunho.
      </p>

      <Button loading={isPending} type="submit">
        Salvar medida
      </Button>
    </form>
  );
}

export function AssessmentDeleteMeasurementButton({
  assessmentId,
  measurementId,
}: {
  assessmentId: string;
  measurementId: string;
}) {
  const action = deleteAssessmentMeasurementAction.bind(
    null,
    assessmentId,
    measurementId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.inlineAction}>
      <ActionAlert state={state} />
      <Button loading={isPending} size="compact" type="submit" variant="danger">
        Remover do rascunho
      </Button>
    </form>
  );
}

export function AssessmentPhotoLinkForm({
  assessmentId,
  photos,
}: {
  assessmentId: string;
  photos: Array<{
    id: string;
    label: string;
  }>;
}) {
  const action = linkAssessmentPhotoAction.bind(null, assessmentId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <ActionAlert state={state} />

      <FormField
        description="Somente fotos privadas já cadastradas para esta cliente podem ser vinculadas."
        id="draft-assessment-photo"
        label="Foto privada"
        required
      >
        {(fieldProps) => (
          <select
            {...fieldProps}
            className={styles.select}
            defaultValue=""
            name="clientFileId"
            required
          >
            <option disabled value="">
              Selecione
            </option>
            {photos.map((photo) => (
              <option key={photo.id} value={photo.id}>
                {photo.label}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <Button
        disabled={photos.length === 0}
        loading={isPending}
        type="submit"
        variant="secondary"
      >
        Vincular foto
      </Button>
    </form>
  );
}

export function AssessmentPhotoUnlinkButton({
  assessmentId,
  clientFileId,
}: {
  assessmentId: string;
  clientFileId: string;
}) {
  const action = unlinkAssessmentPhotoAction.bind(
    null,
    assessmentId,
    clientFileId,
  );
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.inlineAction}>
      <ActionAlert state={state} />
      <Button loading={isPending} size="compact" type="submit" variant="outline">
        Desvincular
      </Button>
    </form>
  );
}

export function AssessmentFinalizeForm({
  assessmentId,
  isMonthly,
  readinessItems,
}: {
  assessmentId: string;
  isMonthly: boolean;
  readinessItems: Array<{
    key: string;
    label: string;
    present: boolean;
  }>;
}) {
  const action = finalizeAssessmentAction.bind(null, assessmentId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      <ActionAlert state={state} />

      <div className={styles.readiness}>
        <p className={styles.notice}>
          Itens mínimos reconhecidos para esta cadência:
        </p>
        <ul className={styles.readinessList}>
          {readinessItems.map((item) => (
            <li key={item.key}>
              <span aria-hidden="true">{item.present ? "✓" : "○"}</span>
              <span>{item.label}</span>
              <strong>{item.present ? "Registrado" : "Pendente"}</strong>
            </li>
          ))}
        </ul>
      </div>

      {isMonthly ? (
        <label className={styles.confirmation}>
          <input
            name="confirmMonthlyMeasures"
            required
            type="checkbox"
            value="yes"
          />
          <span>
            Revisei o conjunto completo de medidas da avaliação mensal. O
            catálogo mensal definitivo ainda está aberto e, por isso, essa
            completude depende de revisão humana.
          </span>
        </label>
      ) : null}

      <label className={styles.confirmation}>
        <input name="confirmFinalization" required type="checkbox" value="yes" />
        <span>
          Revisei data, tipo, medidas e fotos. Entendo que a finalização torna
          esses dados imutáveis e que correções futuras deverão usar um fluxo
          histórico separado.
        </span>
      </label>

      <Button loading={isPending} type="submit">
        Finalizar avaliação
      </Button>
    </form>
  );
}
