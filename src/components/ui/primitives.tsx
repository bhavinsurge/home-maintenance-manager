import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-5 py-3 text-base",
        variant === "primary" &&
          "bg-[var(--brand)] text-white shadow-sm hover:bg-[var(--brand-strong)]",
        variant === "secondary" &&
          "border border-[var(--line)] bg-white text-[var(--ink)] hover:bg-[var(--bg-elevated)]",
        variant === "ghost" && "text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink)]",
        variant === "danger" && "bg-[var(--danger)] text-white hover:opacity-90",
        className,
      )}
      {...props}
    />
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]",
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]",
        className,
      )}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-[var(--ink)] outline-none transition focus:border-[var(--brand)] focus:ring-4 focus:ring-[var(--brand-soft)]",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-semibold text-[var(--ink)]", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "brand";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "neutral" && "bg-[#e8eef2] text-[var(--ink-muted)]",
        tone === "success" && "bg-[#e8f8ef] text-[var(--success)]",
        tone === "warning" && "bg-[#fff4e5] text-[var(--warning)]",
        tone === "danger" && "bg-[#fdecec] text-[var(--danger)]",
        tone === "brand" && "bg-[var(--brand-soft)] text-[var(--brand-strong)]",
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-dashed border-[var(--line)] bg-white/70 px-6 py-14 text-center">
      <h3 className="text-xl text-[var(--ink)]">{title}</h3>
      <p className="mt-2 max-w-md text-[var(--ink-muted)]">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Alert({
  tone = "danger",
  children,
}: {
  tone?: "danger" | "success" | "warning";
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        tone === "danger" && "border-[#f3c1c1] bg-[#fff5f5] text-[var(--danger)]",
        tone === "success" && "border-[#b7e4c7] bg-[#f1fbf5] text-[var(--success)]",
        tone === "warning" && "border-[#f5d5a8] bg-[#fff8ef] text-[var(--warning)]",
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl text-[var(--ink)] sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[var(--ink-muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--brand-soft)] border-t-[var(--brand)]",
        className,
      )}
      aria-label="Loading"
    />
  );
}
