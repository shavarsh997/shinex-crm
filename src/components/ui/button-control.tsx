"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export type ButtonControlProps = ButtonPrimitive.Props & { loading?: boolean };

/** Kept separate so buttonVariants remains usable by Server Components. */
export function ButtonControl({ loading = false, disabled, type = "button", children, ...props }: ButtonControlProps) {
  const { pending } = useFormStatus();
  const busy = loading || (type === "submit" && pending);

  return (
    <ButtonPrimitive
      {...props}
      type={type}
      disabled={disabled || busy || pending}
      aria-busy={busy || undefined}
      data-loading={busy || undefined}
    >
      {busy && <LoaderCircle data-slot="button-spinner" aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />}
      {busy ? <span className="contents [&>svg]:hidden">{children}</span> : children}
    </ButtonPrimitive>
  );
}
