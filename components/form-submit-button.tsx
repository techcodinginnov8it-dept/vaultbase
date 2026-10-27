"use client";

import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@/components/ui/button";

type FormSubmitButtonProps = ButtonProps & {
  pendingLabel: string;
};

export function FormSubmitButton({ pendingLabel, children, disabled, ...props }: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending || disabled} {...props}>
      {pending ? <><Loader2 className="animate-spin" /> {pendingLabel}</> : children}
    </Button>
  );
}
