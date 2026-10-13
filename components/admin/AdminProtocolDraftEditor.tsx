"use client";

import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import {
  addProtocolMeal,
  addProtocolMealPlanCycle,
  editProtocolMealPlanCycle,
  removeProtocolMealPlanCycle,
  addProtocolMealDose,
  addProtocolMealPlanVariant,
  createProtocolMealPlan,
  removeProtocolMeal,
  removeProtocolMealDose,
  removeProtocolMealPlanVariant,
  updateProtocolMealDose,
  updateProtocolMealLabel,
  updateProtocolMealPlanVariantLabel,
  type ProtocolLifecycleFormState,
} from "@/app/admin/protocolos/[protocoloId]/actions";
import type { AdminProtocolVersionPlanData } from "@/components/admin/AdminProtocolVersionPlan";
import { Alert } from "@/components/ui/Alert";
import { draftPlanAnchor, draftVariantAddAnchor, draftCycleAddAnchor, draftVariantAnchor, draftMealAnchor, draftCycleAnchor } from "@/lib/protocol/draft-navigation";
import { serializeDraftCycleSteps } from "@/lib/protocol/cycle-editor";
import { serializeOriginalDraftLabel } from "@/lib/protocol/draft-snapshots";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import styles from "./AdminProtocolDraftEditor.module.css";

const initialState: ProtocolLifecycleFormState = {
  message: null,
  success: false,
};

/**
 * Reflect persisted mutations in the version editor; never assume a local
 * success flag means the snapshot has already changed on the page.
 * Form reset is only used for create/add operations, not edits.
 */
function usePersistedProtocolRefresh(
  state: ProtocolLifecycleFormState,
  formRef?: { current: HTMLFormElement | null },
) {
  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      formRef?.current?.reset();
      router.refresh();
    }
  }, [state, router, formRef]);
}


/**
 * Form actions may be submitted twice before React renders isPending.
 * Keep a synchronous, per-form lock until a new action result is received.
 * The dose row also shares a lock between its edit and delete forms.
 * This protects one mounted browser form, not cross-session idempotency.
 */
function useProtocolDraftSubmitGuard(
  state: ProtocolLifecycleFormState,
  pending: boolean,
  options?: { blockAfterSuccess?: boolean; sharedLock?: { current: boolean } },
) {
  const inFlightRef = useRef(false);
  const sharedLock = options?.sharedLock;
  const blockAfterSuccess = options?.blockAfterSuccess ?? false;

  useEffect(() => {
    inFlightRef.current = false;
    if (sharedLock) sharedLock.current = false;
  }, [state, sharedLock]);

  return (event: FormEvent<HTMLFormElement>) => {
    if (inFlightRef.current || pending || (blockAfterSuccess && state.success) || sharedLock?.current) {
      event.preventDefault();
      return;
    }
    inFlightRef.current = true;
    if (sharedLock) sharedLock.current = true;
  };
}

function ActionFeedback({
  state,
}: {
  state: ProtocolLifecycleFormState;
}) {
  if (!state.message) {
    return null;
  }

  return (
    <Alert
      live={state.success ? "polite" : "assertive"}
      title={state.success ? "Alteração salva" : "Não foi possível salvar"}
      variant={state.success ? "success" : "critical"}
    >
      {state.message}
    </Alert>
  );
}

function CreatePlanForm({
  protocolId,
  protocolVersionId,
}: {
  protocolId: string;
  protocolVersionId: string;
}) {
  const action = createProtocolMealPlan.bind(null, protocolId, protocolVersionId);
  const [state, formAction, pending] = useActionState(action, initialState);
  usePersistedProtocolRefresh(state);
  const submitGuard = useProtocolDraftSubmitGuard(state, pending, { blockAfterSuccess: true });

  return (
    <form action={formAction} aria-busy={pending} onSubmit={submitGuard} className={styles.form}>
      <ActionFeedback state={state} />
      <p className={styles.help}>
        Inicie a estrutura alimentar deste rascunho. Isso não publica nada para a cliente.
      </p>
      <Button disabled={pending} loading={pending} type="submit">
        Iniciar estrutura alimentar
      </Button>
    </form>
  );
}

function AddVariantForm({
  mealPlanVersionId,
  protocolId,
  protocolVersionId,
}: {
  mealPlanVersionId: string;
  protocolId: string;
  protocolVersionId: string;
}) {
  const action = addProtocolMealPlanVariant.bind(
    null,
    protocolId,
    protocolVersionId,
    mealPlanVersionId,
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  usePersistedProtocolRefresh(state, formRef);
  const submitGuard = useProtocolDraftSubmitGuard(state, pending);

  return (
    <form action={formAction} aria-busy={pending} onSubmit={submitGuard} className={styles.form} ref={formRef}>
      <ActionFeedback state={state} />
      <FormField
        description="Ex.: Linear, Dia 1, Dia 2, Low ou High. Use apenas nomes que façam sentido para este protocolo."
        id={`variant-label-${mealPlanVersionId}`}
        label="Nome da variação"
        required
      >
        {(fieldProps) => (
          <TextInput
            disabled={pending}
            {...fieldProps}
            maxLength={120}
            name="label"
            required
            type="text"
          />
        )}
      </FormField>
      <Button disabled={pending} loading={pending} type="submit">
        Adicionar variação
      </Button>
    </form>
  );
}

function AddMealForm({
  mealPlanVersionId,
  protocolId,
  protocolVersionId,
  variantId,
}: {
  mealPlanVersionId: string;
  protocolId: string;
  protocolVersionId: string;
  variantId: string;
}) {
  const action = addProtocolMeal.bind(
    null,
    protocolId,
    protocolVersionId,
    mealPlanVersionId,
    variantId,
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  usePersistedProtocolRefresh(state, formRef);
  const submitGuard = useProtocolDraftSubmitGuard(state, pending);

  return (
    <form action={formAction} aria-busy={pending} onSubmit={submitGuard} className={styles.form} ref={formRef}>
      <ActionFeedback state={state} />
      <FormField
        description="A posição é definida automaticamente pela ordem de inclusão."
        id={`meal-label-${variantId}`}
        label="Nome da refeição"
        required
      >
        {(fieldProps) => (
          <TextInput
            disabled={pending}
            {...fieldProps}
            maxLength={120}
            name="label"
            required
            type="text"
          />
        )}
      </FormField>
      <Button disabled={pending} loading={pending} size="compact" type="submit">
        Adicionar refeição
      </Button>
    </form>
  );
}

function AddDoseForm({
  mealId,
  mealPlanVersionId,
  protocolId,
  protocolVersionId,
}: {
  mealId: string;
  mealPlanVersionId: string;
  protocolId: string;
  protocolVersionId: string;
}) {
  const action = addProtocolMealDose.bind(
    null,
    protocolId,
    protocolVersionId,
    mealPlanVersionId,
    mealId,
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  usePersistedProtocolRefresh(state, formRef);
  const submitGuard = useProtocolDraftSubmitGuard(state, pending);

  return (
    <form action={formAction} aria-busy={pending} onSubmit={submitGuard} className={styles.doseForm} ref={formRef}>
      <ActionFeedback state={state} />
      <label className={styles.selectField}>
        <span>Macro</span>
        <select disabled={pending} name="doseType" required>
          <option value="">Selecione</option>
          <option value="protein">Proteína</option>
          <option value="carbohydrate">Carboidrato</option>
          <option value="fat">Gordura</option>
        </select>
      </label>
      <FormField
        description="Aceita doses fracionadas com até quatro casas decimais."
        id={`dose-quantity-${mealId}`}
        label="Quantidade de doses"
        required
      >
        {(fieldProps) => (
          <TextInput
            disabled={pending}
            {...fieldProps}
            inputMode="decimal"
            max="999"
            min="0.0001"
            name="doseQuantity"
            required
            step="0.0001"
            type="number"
          />
        )}
      </FormField>
      <Button disabled={pending} loading={pending} size="compact" type="submit">
        Adicionar dose
      </Button>
    </form>
  );
}


function UpdateVariantForm({
  label,
  mealPlanVersionId,
  protocolId,
  protocolVersionId,
  variantId,
}: {
  label: string | null;
  mealPlanVersionId: string;
  protocolId: string;
  protocolVersionId: string;
  variantId: string;
}) {
  const action = updateProtocolMealPlanVariantLabel.bind(
    null,
    protocolId,
    protocolVersionId,
    mealPlanVersionId,
    variantId,
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  usePersistedProtocolRefresh(state);
  const submitGuard = useProtocolDraftSubmitGuard(state, pending);

  return (
    <form action={formAction} aria-busy={pending} onSubmit={submitGuard} className={styles.inlineEdit}>
      <input type="hidden" name="originalLabel" value={serializeOriginalDraftLabel(label)} />
      <ActionFeedback state={state} />
      <FormField
        id={`variant-edit-${variantId}`}
        label="Nome da variação"
        required
      >
        {(fieldProps) => (
          <TextInput
            disabled={pending}
            {...fieldProps}
            defaultValue={label ?? ""}
            maxLength={120}
            name="label"
            required
            type="text"
          />
        )}
      </FormField>
      <Button disabled={pending} loading={pending} size="compact" type="submit" variant="secondary">
        Salvar nome
      </Button>
    </form>
  );
}

function RemoveVariantForm({
  label,
  variantKey,
  mealPlanVersionId,
  protocolId,
  protocolVersionId,
  variantId,
}: {
  label: string | null;
  variantKey: string;
  mealPlanVersionId: string;
  protocolId: string;
  protocolVersionId: string;
  variantId: string;
}) {
  const action = removeProtocolMealPlanVariant.bind(
    null,
    protocolId,
    protocolVersionId,
    mealPlanVersionId,
    variantId,
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  usePersistedProtocolRefresh(state);
  const submitGuard = useProtocolDraftSubmitGuard(state, pending, { blockAfterSuccess: true });

  return (
    <form action={formAction} aria-busy={pending} onSubmit={submitGuard} className={styles.inlineAction}>
      <input type="hidden" name="originalLabel" value={serializeOriginalDraftLabel(label)} />
      <input type="hidden" name="originalVariantKey" value={variantKey} />
      <ActionFeedback state={state} />
      {!confirmRemoval ? (
        <Button disabled={pending || state.success} onClick={() => setConfirmRemoval(true)} size="compact" type="button" variant="danger">
          Remover variação vazia
        </Button>
      ) : (
        <>
          <p className={styles.help}>Confirma remover esta variação do rascunho? Esta ação não altera versões já publicadas.</p>
          <div className={styles.confirmActions}>
            <Button disabled={pending || state.success} onClick={() => setConfirmRemoval(false)} size="compact" type="button" variant="ghost">
              Cancelar
            </Button>
            <Button disabled={pending} loading={pending} size="compact" type="submit" variant="danger">
              Confirmar remoção
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

function UpdateMealForm({
  label,
  position,
  variantId,
  mealId,
  mealPlanVersionId,
  protocolId,
  protocolVersionId,
}: {
  position: number;
  variantId: string;
  label: string | null;
  mealId: string;
  mealPlanVersionId: string;
  protocolId: string;
  protocolVersionId: string;
}) {
  const action = updateProtocolMealLabel.bind(
    null,
    protocolId,
    protocolVersionId,
    mealPlanVersionId,
    mealId,
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  usePersistedProtocolRefresh(state);
  const submitGuard = useProtocolDraftSubmitGuard(state, pending);

  return (
    <form action={formAction} aria-busy={pending} onSubmit={submitGuard} className={styles.inlineEdit}>
      <input type="hidden" name="originalLabel" value={serializeOriginalDraftLabel(label)} />
      <input type="hidden" name="originalPosition" value={position} />
      <input type="hidden" name="originalVariantId" value={variantId} />
      <ActionFeedback state={state} />
      <FormField id={`meal-edit-${mealId}`} label="Nome da refeição" required>
        {(fieldProps) => (
          <TextInput
            disabled={pending}
            {...fieldProps}
            defaultValue={label ?? ""}
            maxLength={120}
            name="label"
            required
            type="text"
          />
        )}
      </FormField>
      <Button disabled={pending} loading={pending} size="compact" type="submit" variant="secondary">
        Salvar nome
      </Button>
    </form>
  );
}

function RemoveMealForm({
  label,
  position,
  mealId,
  mealPlanVersionId,
  protocolId,
  protocolVersionId,
  variantId,
}: {
  label: string | null;
  position: number;
  mealId: string;
  mealPlanVersionId: string;
  protocolId: string;
  protocolVersionId: string;
  variantId: string;
}) {
  const action = removeProtocolMeal.bind(
    null,
    protocolId,
    protocolVersionId,
    mealPlanVersionId,
    variantId,
    mealId,
  );
  const [state, formAction, pending] = useActionState(action, initialState);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  usePersistedProtocolRefresh(state);
  const submitGuard = useProtocolDraftSubmitGuard(state, pending, { blockAfterSuccess: true });

  return (
    <form action={formAction} aria-busy={pending} onSubmit={submitGuard} className={styles.inlineAction}>
      <input type="hidden" name="originalLabel" value={serializeOriginalDraftLabel(label)} />
      <input type="hidden" name="originalPosition" value={position} />
      <ActionFeedback state={state} />
      {!confirmRemoval ? (
        <Button disabled={pending || state.success} onClick={() => setConfirmRemoval(true)} size="compact" type="button" variant="danger">
          Remover refeição vazia
        </Button>
      ) : (
        <>
          <p className={styles.help}>Confirma remover esta refeição do rascunho? Esta ação não altera versões já publicadas.</p>
          <div className={styles.confirmActions}>
            <Button disabled={pending || state.success} onClick={() => setConfirmRemoval(false)} size="compact" type="button" variant="ghost">
              Cancelar
            </Button>
            <Button disabled={pending} loading={pending} size="compact" type="submit" variant="danger">
              Confirmar remoção
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

function DoseRow({
  dose,
  mealId,
  mealPlanVersionId,
  protocolId,
  protocolVersionId,
}: {
  mealId: string;
  dose: { doseQuantity: number; doseType: string; id: string };
  mealPlanVersionId: string;
  protocolId: string;
  protocolVersionId: string;
}) {
  const updateAction = updateProtocolMealDose.bind(
    null,
    protocolId,
    protocolVersionId,
    mealPlanVersionId,
    dose.id,
  );
  const removeAction = removeProtocolMealDose.bind(
    null,
    protocolId,
    protocolVersionId,
    mealPlanVersionId,
    dose.id,
  );
  const [updateState, updateFormAction, updatePending] = useActionState(
    updateAction,
    initialState,
  );
  const [removeState, removeFormAction, removePending] = useActionState(
    removeAction,
    initialState,
  );
  const [confirmDoseRemoval, setConfirmDoseRemoval] = useState(false);
  usePersistedProtocolRefresh(updateState);
  usePersistedProtocolRefresh(removeState);
  const doseMutationLock = useRef(false);
  const updateSubmitGuard = useProtocolDraftSubmitGuard(updateState, updatePending, { sharedLock: doseMutationLock });
  const removeSubmitGuard = useProtocolDraftSubmitGuard(removeState, removePending, { blockAfterSuccess: true, sharedLock: doseMutationLock });

  const label =
    dose.doseType === "protein"
      ? "Proteína"
      : dose.doseType === "carbohydrate"
        ? "Carboidrato"
        : dose.doseType === "fat"
          ? "Gordura"
          : dose.doseType;

  return (
    <div className={styles.doseRow}>
      <div className={styles.doseIdentity}>
        <strong>{label}</strong>
      </div>
      <form action={updateFormAction} aria-busy={updatePending || removePending} onSubmit={updateSubmitGuard} className={styles.doseEdit}>
        <input type="hidden" name="originalMealId" value={mealId} />
        <input type="hidden" name="originalDoseType" value={dose.doseType} />
        <input type="hidden" name="originalDoseQuantity" value={dose.doseQuantity} />
        <ActionFeedback state={updateState} />
        <FormField
          id={`dose-edit-${dose.id}`}
          label="Quantidade"
          description="Até quatro casas decimais; o valor não é arredondado ao salvar."
          required
        >
          {(fieldProps) => (
            <TextInput
              disabled={updatePending || removePending}
              {...fieldProps}
              defaultValue={String(dose.doseQuantity)}
              inputMode="decimal"
              max="999"
              min="0.0001"
              name="doseQuantity"
              required
              step="0.0001"
              type="number"
            />
          )}
        </FormField>
        <Button
          disabled={updatePending || removePending}
          loading={updatePending}
          size="compact"
          type="submit"
          variant="secondary"
        >
          Salvar dose
        </Button>
      </form>
      <form action={removeFormAction} aria-busy={updatePending || removePending} onSubmit={removeSubmitGuard} className={styles.inlineAction}>
        <input type="hidden" name="originalMealId" value={mealId} />
        <input type="hidden" name="originalDoseType" value={dose.doseType} />
        <input type="hidden" name="originalDoseQuantity" value={dose.doseQuantity} />
        <ActionFeedback state={removeState} />
        {!confirmDoseRemoval ? (
          <Button disabled={updatePending || removePending || removeState.success} onClick={() => setConfirmDoseRemoval(true)} size="compact" type="button" variant="danger">
            Remover dose
          </Button>
        ) : (
          <>
            <p className={styles.help}>Confirma remover esta dose do rascunho?</p>
            <div className={styles.confirmActions}>
              <Button disabled={updatePending || removePending || removeState.success} onClick={() => setConfirmDoseRemoval(false)} size="compact" type="button" variant="ghost">
                Cancelar
              </Button>
              <Button disabled={updatePending || removePending || removeState.success} loading={removePending} size="compact" type="submit" variant="danger">
                Confirmar remoção
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}


type Cycle = NonNullable<AdminProtocolVersionPlanData>["cycles"][number];
type Variant = NonNullable<AdminProtocolVersionPlanData>["variants"][number];

function AddCycleForm({ mealPlanVersionId, protocolId, protocolVersionId }: {
  mealPlanVersionId: string; protocolId: string; protocolVersionId: string;
}) {
  const action = addProtocolMealPlanCycle.bind(null, protocolId, protocolVersionId, mealPlanVersionId);
  const [state, formAction, pending] = useActionState(action, initialState);
  usePersistedProtocolRefresh(state);
  const submitGuard = useProtocolDraftSubmitGuard(state, pending, { blockAfterSuccess: true });
  return <form action={formAction} onSubmit={submitGuard} aria-busy={pending} className={styles.form}>
    <ActionFeedback state={state} />
    <Button size="compact" disabled={pending || state.success} loading={pending} type="submit">Criar ciclo vazio</Button>
  </form>;
}

function CycleStepForm({
  cycle, mealPlanVersionId, operation, position, protocolId, protocolVersionId, variants,
}: {
  cycle: Cycle;
  mealPlanVersionId: string;
  operation: "add" | "replace" | "move_up" | "move_down" | "remove";
  position?: number;
  protocolId: string;
  protocolVersionId: string;
  variants: Variant[];
}) {
  const action = editProtocolMealPlanCycle.bind(null, protocolId, protocolVersionId, mealPlanVersionId, cycle.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  usePersistedProtocolRefresh(state);
  const submitGuard = useProtocolDraftSubmitGuard(state, pending, { blockAfterSuccess: true });
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const isSelect = operation === "add" || operation === "replace";
  const isRemove = operation === "remove";
  const names: Record<typeof operation, string> = {
    add: "Adicionar etapa",
    replace: "Trocar variação",
    move_up: "Subir",
    move_down: "Descer",
    remove: "Remover etapa",
  };
  return <form action={formAction} onSubmit={submitGuard} aria-busy={pending} className={styles.cycleStepForm}>
    <input type="hidden" name="operation" value={operation} />
    <input type="hidden" name="expectedSteps" value={serializeDraftCycleSteps(cycle.steps)} />
    {position !== undefined ? <input type="hidden" name="position" value={position} /> : null}
    <ActionFeedback state={state} />
    {isSelect ? (
      <label className={styles.selectField}>
        <span>{operation === "add" ? "Variação para nova etapa" : "Nova variação"}</span>
        <select name="variantId" required disabled={pending} defaultValue={operation === "replace" ?
          cycle.steps.find((step) => step.position === position)?.variantId : ""}>
          <option value="">Selecione uma variação</option>
          {variants.map((variant) => (
            <option key={variant.id} value={variant.id}>{variant.label ?? variant.variantKey}</option>
          ))}
        </select>
      </label>
    ) : null}
    {isRemove && !confirmRemoval ? (
      <Button type="button" size="compact" variant="danger" disabled={pending || state.success}
        onClick={() => setConfirmRemoval(true)}>Remover etapa</Button>
    ) : (
      <div className={styles.confirmActions}>
        {isRemove ? <Button size="compact" type="button" variant="ghost" disabled={pending}
          onClick={() => setConfirmRemoval(false)}>Cancelar</Button> : null}
        <Button type="submit" size="compact" variant={isRemove ? "danger" : "secondary"}
          disabled={pending || state.success || (isSelect && variants.length === 0)} loading={pending}>
          {isRemove ? "Confirmar remoção" : names[operation]}
        </Button>
      </div>
    )}
  </form>;
}

function RemoveEmptyCycleForm({ cycle, mealPlanVersionId, protocolId, protocolVersionId }: {
  cycle: Cycle; mealPlanVersionId: string; protocolId: string; protocolVersionId: string;
}) {
  const action = removeProtocolMealPlanCycle.bind(null, protocolId, protocolVersionId, mealPlanVersionId, cycle.id);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [confirm, setConfirm] = useState(false);
  usePersistedProtocolRefresh(state);
  const submitGuard = useProtocolDraftSubmitGuard(state, pending, { blockAfterSuccess: true });
  return <form action={formAction} onSubmit={submitGuard} aria-busy={pending} className={styles.inlineAction}>
    <ActionFeedback state={state} />
    {!confirm ? <Button type="button" size="compact" variant="danger" disabled={pending || state.success}
      onClick={() => setConfirm(true)}>Excluir ciclo vazio</Button> :
      <div className={styles.confirmActions}>
        <Button type="button" variant="ghost" size="compact" disabled={pending}
          onClick={() => setConfirm(false)}>Cancelar</Button>
        <Button type="submit" variant="danger" size="compact" disabled={pending || state.success}
          loading={pending}>Confirmar exclusão do ciclo</Button>
      </div>}
  </form>;
}

function ManualCycleEditor({ plan, protocolId, protocolVersionId }: {
  plan: AdminProtocolVersionPlanData; protocolId: string; protocolVersionId: string;
}) {
  return <section className={styles.cycleEditor} id={draftCycleAddAnchor()} aria-label="Montagem manual dos ciclos">
    <h5>Ciclos alimentares</h5>
    <p className={styles.help}>
      Opcional. Escolha a sequência manualmente, incluindo repetições quando necessário.
      O sistema não determina fases, alternâncias ou duração. Apenas versões enviadas para revisão poderão ser aprovadas e publicadas.
    </p>
    <AddCycleForm mealPlanVersionId={plan.id} protocolId={protocolId} protocolVersionId={protocolVersionId} />
    {plan.cycles.length === 0 ? <p className={styles.empty}>Nenhum ciclo registrado neste rascunho.</p> : null}
    {plan.cycles.map((cycle, cycleIndex) => (
      <section className={styles.cyclePanel} id={draftCycleAnchor(cycle.id)} key={cycle.id}>
        <h6>Ciclo {cycleIndex + 1} · {cycle.steps.length} etapa(s)</h6>
        {cycle.steps.length === 0 ? (
          <p className={styles.empty}>Este ciclo está vazio. Adicione uma variação ou exclua o ciclo.</p>
        ) : <ol className={styles.cycleSteps}>
          {cycle.steps.map((step, index) => (
            <li key={step.position} className={styles.cycleStep}>
              <strong>Etapa {index + 1}: {step.variantLabel ?? step.variantKey}</strong>
              <div className={styles.cycleStepActions}>
                <CycleStepForm cycle={cycle} mealPlanVersionId={plan.id} operation="replace" position={step.position}
                  protocolId={protocolId} protocolVersionId={protocolVersionId} variants={plan.variants} />
                {index > 0 ? <CycleStepForm cycle={cycle} mealPlanVersionId={plan.id} operation="move_up"
                  position={step.position} protocolId={protocolId} protocolVersionId={protocolVersionId} variants={plan.variants} /> : null}
                {index < cycle.steps.length - 1 ? <CycleStepForm cycle={cycle} mealPlanVersionId={plan.id}
                  operation="move_down" position={step.position} protocolId={protocolId} protocolVersionId={protocolVersionId}
                  variants={plan.variants} /> : null}
                <CycleStepForm cycle={cycle} mealPlanVersionId={plan.id} operation="remove"
                  position={step.position} protocolId={protocolId} protocolVersionId={protocolVersionId} variants={plan.variants} />
              </div>
            </li>
          ))}
        </ol>}
        {plan.variants.length > 0 ? <CycleStepForm cycle={cycle} mealPlanVersionId={plan.id} operation="add"
          protocolId={protocolId} protocolVersionId={protocolVersionId} variants={plan.variants} /> :
          <p className={styles.empty}>Cadastre uma variação alimentar antes de adicionar etapas.</p>}
        {cycle.steps.length === 0 ? <RemoveEmptyCycleForm cycle={cycle} mealPlanVersionId={plan.id}
          protocolId={protocolId} protocolVersionId={protocolVersionId} /> : null}
      </section>
    ))}
  </section>;
}

type AdminProtocolDraftEditorProps = {
  plan: AdminProtocolVersionPlanData | null;
  protocolId: string;
  protocolVersionId: string;
};

export function AdminProtocolDraftEditor({
  plan,
  protocolId,
  protocolVersionId,
}: AdminProtocolDraftEditorProps) {
  if (!plan) {
    return (
      <div className={styles.editor} id={draftPlanAnchor()}>
        <h5>Montagem do rascunho</h5>
        <CreatePlanForm
          protocolId={protocolId}
          protocolVersionId={protocolVersionId}
        />
      </div>
    );
  }

  return (
    <div className={styles.editor} id={draftPlanAnchor()}>
      <div className={styles.heading}>
        <div>
          <h5>Montagem do rascunho</h5>
          <p>
            Monte manualmente variações, refeições e doses. Nada desta área é
            publicado sem revisão, aprovação e publicação explícitas.
          </p>
        </div>
      </div>



      <div className={styles.variantCreate} id={draftVariantAddAnchor()}><h6>1. Cadastrar variações</h6><AddVariantForm
        mealPlanVersionId={plan.id}
        protocolId={protocolId}
        protocolVersionId={protocolVersionId}
      /></div>

      {plan.variants.length > 0 ? (
        <div className={styles.variants}>
          {plan.variants.map((variant) => (
            <section className={styles.variant} id={draftVariantAnchor(variant.id)} key={variant.id}>
              <div className={styles.variantHeader}>
                <h6>{variant.label ?? "Variação sem nome"}</h6>
                <span>{variant.meals.length} refeição(ões)</span>
              </div>

              <details className={styles.optionalEditor}><summary>Renomear variação</summary><div className={styles.optionalEditorBody}><UpdateVariantForm
                label={variant.label}
                mealPlanVersionId={plan.id}
                protocolId={protocolId}
                protocolVersionId={protocolVersionId}
                variantId={variant.id}
              /></div></details>

              {variant.meals.length === 0 ? (
                <RemoveVariantForm
                  label={variant.label}
                  variantKey={variant.variantKey}
                  mealPlanVersionId={plan.id}
                  protocolId={protocolId}
                  protocolVersionId={protocolVersionId}
                  variantId={variant.id}
                />
              ) : null}

              <AddMealForm
                mealPlanVersionId={plan.id}
                protocolId={protocolId}
                protocolVersionId={protocolVersionId}
                variantId={variant.id}
              />

              {variant.meals.length > 0 ? (
                <div className={styles.meals}>
                  {variant.meals.map((meal) => (
                    <div className={styles.meal} id={draftMealAnchor(meal.id)} key={meal.id}>
                      <div className={styles.mealHeader}>
                        <strong>{meal.label ?? `Refeição ${meal.position}`}</strong>
                        <span>{meal.doseAllocations.length} macro(s)</span>
                      </div>

                      <details className={styles.optionalEditor}><summary>Renomear refeição</summary><div className={styles.optionalEditorBody}><UpdateMealForm
                        label={meal.label}
                        position={meal.position}
                        variantId={variant.id}
                        mealId={meal.id}
                        mealPlanVersionId={plan.id}
                        protocolId={protocolId}
                        protocolVersionId={protocolVersionId}
                      /></div></details>

                      {meal.doseAllocations.length === 0 ? (
                        <RemoveMealForm
                          label={meal.label}
                          position={meal.position}
                          mealId={meal.id}
                          mealPlanVersionId={plan.id}
                          protocolId={protocolId}
                          protocolVersionId={protocolVersionId}
                          variantId={variant.id}
                        />
                      ) : (
                        <div className={styles.doseRows}>
                          {meal.doseAllocations.map((dose) => (
                            <DoseRow
                              dose={dose}
                              mealId={meal.id}
                              key={dose.id}
                              mealPlanVersionId={plan.id}
                              protocolId={protocolId}
                              protocolVersionId={protocolVersionId}
                            />
                          ))}
                        </div>
                      )}

                      <AddDoseForm
                        mealId={meal.id}
                        mealPlanVersionId={plan.id}
                        protocolId={protocolId}
                        protocolVersionId={protocolVersionId}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.empty}>Adicione a primeira refeição desta variação.</p>
              )}
            </section>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>Adicione a primeira variação alimentar.</p>
      )}
      <ManualCycleEditor plan={plan} protocolId={protocolId} protocolVersionId={protocolVersionId} />
    </div>
  );
}
