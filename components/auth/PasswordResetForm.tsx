"use client";
import { resetPassword } from "@/app/redefinir-senha/actions";
import { AccessPasswordForm } from "./AccessPasswordForm";
export function PasswordResetForm() { return <AccessPasswordForm action={resetPassword} mode="reset"/>; }
