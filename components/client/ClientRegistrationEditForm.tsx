"use client";
import { ClientRegistrationEditor } from "@/components/client/ClientRegistrationEditor";
import { updateCurrentClientRegistrationAction } from "@/app/cliente/perfil/actions";
import type { ClientRegistrationInput } from "@/lib/clients/registration";

type ClientRegistrationEditFormProps = {
  city?: string;
  contactEmail?: string;
  instagram?: string;
  phone?: string;
  updatedAt?: string | null;
};
export function ClientRegistrationEditForm({city,contactEmail,instagram,phone,updatedAt}:ClientRegistrationEditFormProps){
  const values:ClientRegistrationInput={city:city??null,contactEmail:contactEmail??null,instagram:instagram??null,phone:phone??null};
  return <ClientRegistrationEditor initialValues={values} updatedAt={updatedAt??null}
    action={updateCurrentClientRegistrationAction}
    notice="Este formulário altera somente o Cadastro Atual. Ele não modifica respostas históricas da Anamnese nem o email usado para entrar na conta."/>;
}