import { ComponentPropsWithoutRef } from "react";

type ShinexLogoProps = ComponentPropsWithoutRef<"span"> & {
  compact?: boolean;
};

export function ShinexLogo({ compact = false, className, ...props }: ShinexLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`} {...props}>
      <svg viewBox="0 0 64 64" className="size-8 shrink-0" role="img" aria-label="SHINEX CRM">
        <rect width="64" height="64" rx="18" fill="currentColor" />
        <path fill="#3b82f6" d="M17 14h22a8 8 0 0 1 8 8v8H35v-5H25v14h14a8 8 0 0 1 8 8v2H17V39h12v5h10V30H25a8 8 0 0 1-8-8V14Z" />
        <path fill="#bfdbfe" d="M35 25h12v5H35zM17 39h12v5H17z" />
      </svg>
      {!compact && <span className="whitespace-nowrap font-semibold tracking-tight">SHINEX <span className="text-muted-foreground">CRM</span></span>}
    </span>
  );
}
