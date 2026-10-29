"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { normalizedReleasedContentSearch } from "@/lib/content/release-explorer";
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
  initialVersionId?: string;
  options: ClientContentReleaseOption[];
};

export function ClientContentReleaseForm({
  clientId,
  initialVersionId = "",
  options,
}: ClientContentReleaseFormProps) {
  const action = releaseContentToClient.bind(null, clientId);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const router = useRouter();
  const [selectedVersionId, setSelectedVersionId] = useState(() => options.some((option) => option.id === initialVersionId) ? initialVersionId : "");
  const [confirmRelease, setConfirmRelease] = useState(false);
  const [query, setQuery] = useState("");
  const submitInFlightRef = useRef(false);
  const selectedVersion = options.find((option) => option.id === selectedVersionId);
  const visibleOptions = useMemo(() => {
    const needle = normalizedReleasedContentSearch(query);
    const candidates = needle
      ? options.filter((option) => normalizedReleasedContentSearch(
          option.title + " versão " + option.versionNumber,
        ).includes(needle))
      : options;
    // Never remove a selected option silently while typing a new search.
    return selectedVersion && !candidates.some((option) => option.id === selectedVersion.id)
      ? [selectedVersion, ...candidates]
      : candidates;
  }, [options, query, selectedVersion]);


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
        if (submitInFlightRef.current || isPending || state.success || !confirmRelease || !selectedVersion) {
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

      <label className={styles.searchField}>
        <span>Localizar material publicado</span>
        <input type="search" maxLength={160} value={query} disabled={isPending || state.success}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busque pelo título ou número da versão" />
      </label>
      <p className={styles.notice} role="status">{visibleOptions.length} de {options.length} versão(ões) na seleção.</p>
      {query.trim() && visibleOptions.length === 0 ? (
        <p className={styles.notice}>Nenhuma versão corresponde à busca. Limpe o texto para consultar todas as versões disponíveis.</p>
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
            disabled={isPending || state.success}
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
            {visibleOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title} · versão {option.versionNumber}
                {option.hasAsset ? "" : " · indisponível"}
              </option>
            ))}
          </select>
        )}
      </FormField>

      {selectedVersion ? (
        <p className={styles.notice} role="status">
          Selecionado: {selectedVersion.title} · versão {selectedVersion.versionNumber}.
          Esta escolha não altera liberações anteriores.
        </p>
      ) : null}
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
          <Button disabled={isPending || state.success} onClick={() => setConfirmRelease(false)} type="button" variant="ghost">
            Cancelar
          </Button>
          <Button disabled={isPending || state.success} loading={isPending} type="submit">
            Confirmar liberação
          </Button>
        </div>
      ) : (
        <Button
          disabled={!selectedVersion || isPending || state.success}
          onClick={() => setConfirmRelease(true)}
          type="button"
        >
          Revisar liberação
        </Button>
      )}
    </form>
  );
}
