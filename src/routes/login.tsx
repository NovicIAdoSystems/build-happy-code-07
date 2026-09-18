import { createFileRoute, useSearch } from "@tanstack/react-router";

import { BrandMark, Field, PageShell } from "@/components/noviciado-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    err: typeof search.err === "string" ? search.err : undefined,
    msg: typeof search.msg === "string" ? search.msg : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — Noviciado Stock" },
      { name: "description", content: "Sign in to the Noviciado private warehouse stock ledger." },
      { property: "og:title", content: "Sign in — Noviciado Stock" },
      { property: "og:description", content: "Access the Noviciado stock ledger." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const search = useSearch({ from: "/login" });
  const errorMessage = search.err
    ? search.msg || (search.err === "429" ? "Too many attempts — wait 15 minutes." : "Wrong email or password.")
    : "";

  return (
    <PageShell>
      <div className="flex min-h-[calc(100vh-2.5rem)] items-center justify-center">
        <form action="/login" method="post" className="grid w-full max-w-[360px] gap-5 rounded-md border border-border bg-card p-6">
          <div>
            <BrandMark />
            <h1 className="mt-2 font-heading text-5xl font-normal leading-none tracking-normal text-foreground">Stock</h1>
          </div>
          {errorMessage ? (
            <div className="rounded-md border border-danger-strong bg-sold-tint px-3 py-2 text-sm text-sold" role="alert">
              {errorMessage}
            </div>
          ) : null}
          <Field label="Email">
            <Input name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password">
            <Input name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Button type="submit">Sign in</Button>
        </form>
      </div>
    </PageShell>
  );
}
