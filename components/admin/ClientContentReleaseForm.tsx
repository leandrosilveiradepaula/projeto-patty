"use client";

import { useActionState } from "react";

import {
  type ClientContentReleaseFormState,
  releaseContentToClient,
} from "@/app/admin/clientes/[clienteId]/conteudos/actions";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import styles from "./ClientContentReleaseForm.module.css";

const initialState: ClientContentReleaseFormState = {
  message: null,
  success: false,
};

export type ClientContentReleaseOption = {
  hasAsset: boolean;
  id: string;
  title: string;
  versionNumber: number;
};

type ClientContentReleaseFormProps = {
  clientId: string;
  options: ClientContentReleaseOption[];
};

export function ClientContentReleaseForm({
  clientId,
  options,
}: ClientContentReleaseFormProps) {
  const action = releaseContentToClient.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className={styles.form}>
      {state.message ? (
        <Alert
          live={state.success ? "polite" : "assertive"}
          title={state.success ? "Conteúdo liberado" : "Não foi possível liberar"}
          variant={state.success ? "success" : "critical"}
        >
          {state.message}
        </Alert>
      ) : null}

      <FormField
        description="Somente versões publicadas podem ser liberadas. A liberação aponta para esta versão exata."
        id="educational-content-version"
        label="Versão de conteúdo"
        required
      >
        {(fieldProps) => (
          <select
            {...fieldProps}
            className={styles.select}
            defaultValue=""
            name="educationalContentVersionId"
            required
          >
            <option disabled value="">
              Selecione uma versão publicada
            </option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title} · versão {option.versionNumber}
                {option.hasAsset ? "" : " · sem arquivo"}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <p className={styles.notice}>
        Versões marcadas como “sem arquivo” podem ser liberadas, mas a cliente
        não terá um arquivo para abrir até que um asset seja cadastrado nessa
        versão exata.
      </p>
      <p className={styles.notice}>
        Esta ação não cria liberação automática por fase e não troca a versão
        liberada se uma nova versão do conteúdo for publicada depois.
      </p>

      <Button loading={isPending} type="submit">
        Liberar conteúdo
      </Button>
    </form>
  );
}
