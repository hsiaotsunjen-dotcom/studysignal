import type { InputHTMLAttributes } from "react";

export function SsInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`ss-card min-h-[3.25rem] w-full rounded-[var(--ss-radius-lg)] border border-[var(--ss-border)]/80 px-[1.125rem] py-3.5 text-[15px] leading-normal text-[var(--ss-fg)] outline-none transition duration-200 placeholder:text-[var(--ss-fg-hint)] focus:border-[var(--ss-primary)]/45 focus:ring-[3px] focus:ring-[var(--ss-primary)]/12 ${className}`}
      {...props}
    />
  );
}
