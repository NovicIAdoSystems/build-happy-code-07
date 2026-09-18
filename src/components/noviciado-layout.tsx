import { Link } from "@tanstack/react-router";
import { KeyRound, LogOut } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { Actor } from "@/lib/noviciado-api";
import { cn } from "@/lib/utils";

export function BrandMark() {
  return <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gold">NOVICIADO</div>;
}

export function PageShell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-6 lg:px-8">{children}</main>;
}

export function AppHeader({ actor, onSignOut }: { actor?: Actor; onSignOut: () => void }) {
  return (
    <header className="mx-auto flex w-full max-w-7xl flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <BrandMark />
        <h1 className="mt-1 font-heading text-[42px] leading-none tracking-normal text-foreground">Stock</h1>
      </div>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="max-w-[220px] truncate text-cream">{actor?.actor || "preview@noviciado.com"}</span>
        <span aria-hidden="true" className="text-label">·</span>
        <Button asChild variant="ghost" size="sm">
          <Link to="/password">
            <KeyRound aria-hidden="true" />
            password
          </Link>
        </Button>
        <span aria-hidden="true" className="text-label">·</span>
        <Button type="button" variant="ghost" size="sm" onClick={onSignOut}>
          <LogOut aria-hidden="true" />
          sign out
        </Button>
      </nav>
    </header>
  );
}

export function FeedbackBanner({ message, tone }: { message?: string | undefined; tone?: "success" | "error" | undefined }) {
  if (!message) return null;

  return (
    <div
      role="status"
      className={cn(
        "mx-auto mt-5 w-full max-w-7xl rounded-md border px-4 py-3 text-sm",
        tone === "error"
          ? "border-danger-strong bg-sold-tint text-sold"
          : "border-dim-gold bg-gold-tint text-foreground",
      )}
    >
      {message}
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-label">{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-label">{label}</span>
      {children}
    </label>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-md border border-border bg-card", className)}>{children}</section>;
}

export function DetailsPanel({ title, meta, children }: { title: string; meta?: string; children: ReactNode }) {
  return (
    <details className="rounded-md border border-border bg-card">
      <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-4 px-4 py-3 text-sm font-semibold text-foreground marker:text-gold">
        <span>{title}</span>
        {meta ? <span className="text-xs font-normal text-muted-foreground">{meta}</span> : null}
      </summary>
      <div className="border-t border-border p-4">{children}</div>
    </details>
  );
}
