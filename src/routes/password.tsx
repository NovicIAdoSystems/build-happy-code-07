import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppHeader, FeedbackBanner, Field, PageShell } from "@/components/noviciado-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sampleActor } from "@/lib/noviciado-api";

export const Route = createFileRoute("/password")({
  head: () => ({
    meta: [
      { title: "Change password — Noviciado Stock" },
      { name: "description", content: "Change the password for a Noviciado stock ledger account." },
      { property: "og:title", content: "Change password — Noviciado Stock" },
      { property: "og:description", content: "Update access for the Noviciado stock ledger." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PasswordPage,
});

function PasswordPage() {
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [values, setValues] = useState({ current: "", next: "", repeat: "" });

  async function signOut() {
    try {
      await fetch("/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.href = "/login";
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (values.next.length < 10) {
      setFeedback({ message: "New password must be at least 10 characters.", tone: "error" });
      return;
    }
    if (values.next !== values.repeat) {
      setFeedback({ message: "New passwords do not match.", tone: "error" });
      return;
    }

    const body = new FormData();
    body.set("current", values.current);
    body.set("new", values.next);
    body.set("new2", values.repeat);

    try {
      const response = await fetch("/password", { method: "POST", body, credentials: "include" });
      if (!response.ok) {
        try {
          const data = (await response.json()) as { error?: string };
          throw new Error(data.error || "Could not change password.");
        } catch (error) {
          if (error instanceof Error && error.message !== "Unexpected end of JSON input") throw error;
          throw new Error("Could not change password.");
        }
      }
      setValues({ current: "", next: "", repeat: "" });
      setFeedback({ message: "Password changed.", tone: "success" });
    } catch (error) {
      setFeedback({ message: error instanceof Error ? error.message : "Could not change password.", tone: "error" });
    }
  }

  return (
    <PageShell>
      <AppHeader actor={sampleActor} onSignOut={signOut} />
      <FeedbackBanner message={feedback?.message} tone={feedback?.tone} />
      <div className="mx-auto mt-6 w-full max-w-7xl">
        <form className="grid max-w-[440px] gap-4 rounded-md border border-border bg-card p-5" onSubmit={(event) => void submit(event)}>
          <h1 className="font-heading text-3xl font-normal tracking-normal text-foreground">Change password</h1>
          <Field label="Current">
            <Input
              type="password"
              autoComplete="current-password"
              value={values.current}
              onChange={(event) => setValues((current) => ({ ...current, current: event.target.value }))}
              required
            />
          </Field>
          <Field label="New">
            <Input
              type="password"
              autoComplete="new-password"
              minLength={10}
              value={values.next}
              onChange={(event) => setValues((current) => ({ ...current, next: event.target.value }))}
              required
            />
          </Field>
          <Field label="Repeat">
            <Input
              type="password"
              autoComplete="new-password"
              minLength={10}
              value={values.repeat}
              onChange={(event) => setValues((current) => ({ ...current, repeat: event.target.value }))}
              required
            />
          </Field>
          <Button type="submit" className="w-fit">Save</Button>
        </form>
      </div>
    </PageShell>
  );
}
