import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import * as Switch from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

type Tone = "primary" | "ghost" | "quiet";

export function Button({
  tone = "primary",
  full,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; full?: boolean }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 select-none items-center justify-center gap-2 rounded-control px-4 text-sm font-medium transition-[transform,background-color,opacity] duration-150 ease-out active:not-disabled:scale-[0.96] disabled:opacity-40",
        tone === "primary" && "bg-accent text-ink",
        tone === "ghost" && "border border-line bg-surface text-fg",
        tone === "quiet" && "bg-transparent text-muted",
        full && "w-full",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-12 w-full rounded-control border border-line bg-surface px-4 text-base text-fg outline-none placeholder:text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <Switch.Root
      checked={checked}
      onCheckedChange={onChange}
      aria-label={label}
      className="inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-line bg-raised transition-colors data-[state=checked]:bg-accent"
    >
      <Switch.Thumb className="block size-5 translate-x-1 rounded-full bg-muted transition-transform data-[state=checked]:translate-x-6 data-[state=checked]:bg-ink" />
    </Switch.Root>
  );
}

export function MoonMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <circle cx="60" cy="60" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="82" cy="46" r="30" fill="var(--color-bg)" />
    </svg>
  );
}

export function Boot({ label = "Nachtgarten" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg text-fg">
      <p className="font-display text-4xl italic">{label}</p>
    </div>
  );
}

export function Confirm({
  open,
  title,
  body,
  confirm,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirm: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-bg/70 p-4 sm:items-center">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-5">
        <h2 className="font-display text-3xl italic">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
        <div className="mt-5 flex gap-2">
          <Button tone="ghost" full onClick={onCancel}>
            Zurück
          </Button>
          <Button full onClick={onConfirm}>
            {confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-card border border-line bg-surface", className)}>{children}</section>;
}
