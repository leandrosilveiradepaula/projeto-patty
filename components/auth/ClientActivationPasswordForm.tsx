"use client";
import { setInitialClientPassword } from "@/app/ativar-conta/actions";
import { AccessPasswordForm } from "./AccessPasswordForm";
export function ClientActivationPasswordForm({role}:{role:"admin"|"client"|null}) {
 return <AccessPasswordForm action={setInitialClientPassword} mode="activate" role={role}/>;
}
