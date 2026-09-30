"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/Button";

type FormSubmitButtonProps = Omit<ButtonProps, "loading" | "type">;

export function FormSubmitButton(props: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return <Button {...props} loading={pending} type="submit" />;
}
