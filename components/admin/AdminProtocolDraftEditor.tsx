"use client";

import { useActionState } from "react";

import {
  addProtocolMeal,
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
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { TextInput } from "@/components/ui/TextInput";
import styles from "./AdminProtocolDraftEditor.module.css";

const initialState: ProtocolLifecycleFormState = {
  message: null,
  success: false,
};

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

  return (
    <form action={formAction} className={styles.form}>
      <ActionFeedback state={state} />
      <p className={styles.help}>
        Inicie a estrutura alimentar deste rascunho. Isso não publica nada para a cliente.
      </p>
      <Button loading={pending} type="submit">
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

  return (
    <form action={formAction} className={styles.form}>
      <ActionFeedback state={state} />
      <FormField
        description="Ex.: Linear, Dia 1, Dia 2, Low ou High. Use apenas nomes que façam sentido para este protocolo."
        id={`variant-label-${mealPlanVersionId}`}
        label="Nome da variação"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            maxLength={120}
            name="label"
            required
            type="text"
          />
        )}
      </FormField>
      <Button loading={pending} type="submit">
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

  return (
    <form action={formAction} className={styles.form}>
      <ActionFeedback state={state} />
      <FormField
        description="A posição é definida automaticamente pela ordem de inclusão."
        id={`meal-label-${variantId}`}
        label="Nome da refeição"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            maxLength={120}
            name="label"
            required
            type="text"
          />
        )}
      </FormField>
      <Button loading={pending} size="compact" type="submit">
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

  return (
    <form action={formAction} className={styles.doseForm}>
      <ActionFeedback state={state} />
      <label className={styles.selectField}>
        <span>Macro</span>
        <select name="doseType" required>
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
      <Button loading={pending} size="compact" type="submit">
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

  return (
    <form action={formAction} className={styles.inlineEdit}>
      <ActionFeedback state={state} />
      <FormField
        id={`variant-edit-${variantId}`}
        label="Nome da variação"
        required
      >
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            defaultValue={label ?? ""}
            maxLength={120}
            name="label"
            required
            type="text"
          />
        )}
      </FormField>
      <Button loading={pending} size="compact" type="submit" variant="secondary">
        Salvar nome
      </Button>
    </form>
  );
}

function RemoveVariantForm({
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
  const action = removeProtocolMealPlanVariant.bind(
    null,
    protocolId,
    protocolVersionId,
    mealPlanVersionId,
    variantId,
  );
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.inlineAction}>
      <ActionFeedback state={state} />
      <Button loading={pending} size="compact" type="submit" variant="danger">
        Remover variação vazia
      </Button>
    </form>
  );
}

function UpdateMealForm({
  label,
  mealId,
  mealPlanVersionId,
  protocolId,
  protocolVersionId,
}: {
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

  return (
    <form action={formAction} className={styles.inlineEdit}>
      <ActionFeedback state={state} />
      <FormField id={`meal-edit-${mealId}`} label="Nome da refeição" required>
        {(fieldProps) => (
          <TextInput
            {...fieldProps}
            defaultValue={label ?? ""}
            maxLength={120}
            name="label"
            required
            type="text"
          />
        )}
      </FormField>
      <Button loading={pending} size="compact" type="submit" variant="secondary">
        Salvar nome
      </Button>
    </form>
  );
}

function RemoveMealForm({
  mealId,
  mealPlanVersionId,
  protocolId,
  protocolVersionId,
  variantId,
}: {
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

  return (
    <form action={formAction} className={styles.inlineAction}>
      <ActionFeedback state={state} />
      <Button loading={pending} size="compact" type="submit" variant="danger">
        Remover refeição vazia
      </Button>
    </form>
  );
}

function DoseRow({
  dose,
  mealPlanVersionId,
  protocolId,
  protocolVersionId,
}: {
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
      <form action={updateFormAction} className={styles.doseEdit}>
        <ActionFeedback state={updateState} />
        <FormField
          id={`dose-edit-${dose.id}`}
          label="Quantidade"
          description="Até quatro casas decimais; o valor não é arredondado ao salvar."
          required
        >
          {(fieldProps) => (
            <TextInput
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
          loading={updatePending}
          size="compact"
          type="submit"
          variant="secondary"
        >
          Salvar dose
        </Button>
      </form>
      <form action={removeFormAction} className={styles.inlineAction}>
        <ActionFeedback state={removeState} />
        <Button
          loading={removePending}
          size="compact"
          type="submit"
          variant="danger"
        >
          Remover
        </Button>
      </form>
    </div>
  );
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
      <div className={styles.editor}>
        <h5>Montagem do rascunho</h5>
        <CreatePlanForm
          protocolId={protocolId}
          protocolVersionId={protocolVersionId}
        />
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      <div className={styles.heading}>
        <div>
          <h5>Montagem do rascunho</h5>
          <p>
            Monte manualmente variações, refeições e doses. Nada desta área é
            publicado sem revisão, aprovação e publicação explícitas.
          </p>
        </div>
      </div>

      <AddVariantForm
        mealPlanVersionId={plan.id}
        protocolId={protocolId}
        protocolVersionId={protocolVersionId}
      />

      {plan.variants.length > 0 ? (
        <div className={styles.variants}>
          {plan.variants.map((variant) => (
            <section className={styles.variant} key={variant.id}>
              <div className={styles.variantHeader}>
                <h6>{variant.label ?? "Variação sem nome"}</h6>
                <span>{variant.meals.length} refeição(ões)</span>
              </div>

              <UpdateVariantForm
                label={variant.label}
                mealPlanVersionId={plan.id}
                protocolId={protocolId}
                protocolVersionId={protocolVersionId}
                variantId={variant.id}
              />

              {variant.meals.length === 0 ? (
                <RemoveVariantForm
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
                    <div className={styles.meal} key={meal.id}>
                      <div className={styles.mealHeader}>
                        <strong>{meal.label ?? `Refeição ${meal.position}`}</strong>
                        <span>{meal.doseAllocations.length} macro(s)</span>
                      </div>

                      <UpdateMealForm
                        label={meal.label}
                        mealId={meal.id}
                        mealPlanVersionId={plan.id}
                        protocolId={protocolId}
                        protocolVersionId={protocolVersionId}
                      />

                      {meal.doseAllocations.length === 0 ? (
                        <RemoveMealForm
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
    </div>
  );
}
