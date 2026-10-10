"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [confirmRelease, setConfirmRelease] = useState(false);
  const submitInFlightRef = useRef(false);
  const selectedVersion = options.find((option) => option.id === selectedVersionId);

  useEffect(() => {
    submitInFlightRef.current = false;
    if (state.success) {
      setSelectedVersionId("");
      setConfirmRelease(false);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      action={formAction}
      aria-busy={isPending}
      className={styles.form}
      onSubmit={(event) => {
        if (submitInFlightRef.current || !confirmRelease || !selectedVersion) {
          event.preventDefault();
          return;
        }
        submitInFlightRef.current = true;
      }}
    >
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
        description="Somente versões publicadas com arquivo privado registrado podem ser liberadas. A liberação aponta para esta versão exata."
        id="educational-content-version"
        label="Versão de conteúdo"
        required
      >
        {(fieldProps) => (
          <select
            {...fieldProps}
            className={styles.select}
            disabled={isPending}
            name="educationalContentVersionId"
            onChange={(event) => {
              setSelectedVersionId(event.target.value);
              setConfirmRelease(false);
            }}
            required
            value={selectedVersionId}
          >
            <option disabled value="">
              Selecione uma versão publicada
            </option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title} · versão {option.versionNumber}
                {option.hasAsset ? "" : " · indisponível"}
              </option>
            ))}
          </select>
        )}
      </FormField>

      <p className={styles.notice}>
        O servidor também valida a existência do asset no momento da liberação,
        evitando que uma chamada direta crie um release sem arquivo.
      </p>
      <p className={styles.notice}>
        Esta ação não cria liberação automática por fase e não troca a versão
        liberada se uma nova versão do conteúdo for publicada depois.
      </p>

      {confirmRelease && selectedVersion ? (
        <div className={styles.notice}>
          <p>
            Confirmar liberação de <strong>{selectedVersion.title} · versão {selectedVersion.versionNumber}</strong> para esta cliente?
            A liberação será individual e permanecerá vinculada exatamente a esta versão.
          </p>
          <Button disabled={isPending} onClick={() => setConfirmRelease(false)} type="button" variant="ghost">
            Cancelar
          </Button>
          <Button disabled={isPending} loading={isPending} type="submit">
            Confirmar liberação
          </Button>
        </div>
      ) : (
        <Button
          disabled={!selectedVersion || isPending}
          onClick={() => setConfirmRelease(true)}
          type="button"
        >
          Revisar liberação
        </Button>
      )}
    </form>
  );
}
