"use client";
import { ClientRegistrationEditor } from "@/components/client/ClientRegistrationEditor";
import { updateAdminClientRegistrationAction } from "@/app/admin/clientes/[clienteId]/actions";
import type { ClientRegistrationInput } from "@/lib/clients/registration";
type AdminClientRegistrationEditFormProps={clientId:string;city?:string;contactEmail?:string;instagram?:string;phone?:string;updatedAt?:string|null};
export function AdminClientRegistrationEditForm({clientId,city,contactEmail,instagram,phone,updatedAt}:AdminClientRegistrationEditFormProps){
  const values:ClientRegistrationInput={city:city??null,contactEmail:contactEmail??null,instagram:instagram??null,phone:phone??null};
  return <ClientRegistrationEditor admin initialValues={values} updatedAt={updatedAt??null}
    action={updateAdminClientRegistrationAction.bind(null,clientId)}
    notice="Esta ação altera somente o Cadastro Atual. Anamneses históricas e a identidade de autenticação permanecem separadas; não altera o email de login."/>;
}