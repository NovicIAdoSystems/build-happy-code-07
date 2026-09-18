import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppHeader, FeedbackBanner, Field, PageShell, Panel, SectionLabel } from "@/components/noviciado-layout";
import { LedgerTable } from "@/components/noviciado-ledger-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createMovement,
  deleteProduct,
  formatDate,
  formatDateTime,
  getLedger,
  getMe,
  getStock,
  ledgerCsvHref,
  madridToday,
  restoreProduct,
  sampleActor,
  sampleDeleted,
  sampleLedger,
  sampleStock,
  type Actor,
  type LedgerRow,
  type StockProduct,
  voidMovement,
} from "@/lib/noviciado-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$id")({
  head: () => ({
    meta: [
      { title: "Product — Noviciado Stock" },
      { name: "description", content: "Product stock count, received and sold movements, and history in the Noviciado ledger." },
      { property: "og:title", content: "Product — Noviciado Stock" },
      { property: "og:description", content: "Review and update one product in the Noviciado stock ledger." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProductPage,
});

type Feedback = { message: string; tone: "success" | "error" } | null;

function ProductPage() {
  const { id } = Route.useParams();
  const [actor, setActor] = useState<Actor>(sampleActor);
  const [product, setProduct] = useState<StockProduct | null>(() =>
    [...sampleStock, ...sampleDeleted].find((item) => String(item.id) === id) || null,
  );
  const [ledger, setLedger] = useState<LedgerRow[]>(() => sampleLedger.filter((row) => String(row.product_id) === id));
  const [usingDemo, setUsingDemo] = useState(true);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [form, setForm] = useState({ kind: "in" as "in" | "out", qty: "", day: madridToday(), note: "" });
  const qtyRef = useRef<HTMLInputElement | null>(null);
  const [invalidQty, setInvalidQty] = useState(false);

  const history = useMemo(() => {
    if (!product) return ledger;
    return ledger.filter((row) => String(row.product_id) === id || row.product === product.name || row.product_name === product.name);
  }, [id, ledger, product]);

  async function refresh() {
    try {
      const [meData, allStock] = await Promise.all([getMe(), getStock(true)]);
      const nextProduct = allStock.find((item) => String(item.id) === id) || null;
      const nextLedger = nextProduct ? await getLedger({ product: nextProduct.name, limit: 100 }) : [];
      setActor(meData);
      setProduct(nextProduct);
      setLedger(nextLedger);
      setUsingDemo(false);
    } catch {
      setActor(sampleActor);
      setProduct([...sampleStock, ...sampleDeleted].find((item) => String(item.id) === id) || null);
      setLedger(sampleLedger.filter((row) => String(row.product_id) === id));
      setUsingDemo(true);
    }
  }

  useEffect(() => {
    void refresh();
  }, [id]);

  function setSuccess(message: string) {
    setFeedback({ message, tone: "success" });
  }

  function setError(message: string) {
    setFeedback({ message, tone: "error" });
  }

  function flagInvalid() {
    setInvalidQty(true);
    qtyRef.current?.focus();
    window.setTimeout(() => setInvalidQty(false), 260);
  }

  async function submitMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || product.deleted_at) return;
    const qty = Number(form.qty);
    if (!Number.isFinite(qty) || qty <= 0) {
      flagInvalid();
      return;
    }
    try {
      await createMovement({ product: product.name, kind: form.kind, qty, day: form.day, note: form.note.trim() });
      setForm((current) => ({ ...current, qty: "", note: "" }));
      setSuccess(`${form.kind === "in" ? "Received" : "Sold"} ${product.name} × ${qty} on ${form.day}.`);
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save movement.");
    }
  }

  async function handleDelete() {
    if (!product) return;
    const ok = window.confirm(
      `Delete ${product.name} for sure? It disappears from the warehouse; its history stays and records who deleted it.`,
    );
    if (!ok) return;
    try {
      await deleteProduct(product.id);
      setSuccess(`${product.name} deleted. Find it under 'Deleted products' to restore.`);
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete product.");
    }
  }

  async function handleRestore() {
    if (!product) return;
    try {
      await restoreProduct(product.id);
      setSuccess(`${product.name} restored.`);
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not restore product.");
    }
  }

  async function handleVoid(row: LedgerRow) {
    const ok = window.confirm(`Void movement #${row.id}?`);
    if (!ok) return;
    try {
      await voidMovement(row.id);
      setSuccess(`Movement #${row.id} voided.`);
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not void movement.");
    }
  }

  async function signOut() {
    try {
      await fetch("/logout", { method: "POST", credentials: "include" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <PageShell>
      <AppHeader actor={actor} onSignOut={signOut} />
      <FeedbackBanner
        message={feedback?.message || (usingDemo ? "Preview data shown until the stock server responds." : undefined)}
        tone={feedback?.tone || "success"}
      />

      <div className="mx-auto mt-6 grid w-full max-w-7xl gap-6">
        <Link to="/" className="w-fit text-sm font-semibold text-gold underline-offset-4 hover:underline">
          ← Warehouse
        </Link>

        {!product ? (
          <Panel className="px-5 py-12 text-sm text-muted-foreground">Product not found.</Panel>
        ) : (
          <>
            {product.deleted_at ? (
              <div className="rounded-md border border-danger-strong bg-sold-tint px-4 py-3 text-sm text-sold">
                Deleted {formatDateTime(product.deleted_at)} by {product.deleted_by || "—"} — not shown in the warehouse.
                <Button type="button" variant="ghost" size="sm" className="ml-2 text-sold" onClick={() => void handleRestore()}>
                  Restore
                </Button>
              </div>
            ) : null}

            <Panel className="p-5">
              <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
                <div>
                  <h1 className="font-heading text-4xl font-normal leading-none tracking-normal text-foreground">{product.name}</h1>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <Kpi label="Received" value={`+${product.received}`} detail={formatDate(product.last_in || product.last_day)} tone="received" />
                    <Kpi label="Sold" value={`−${product.sold}`} detail={formatDate(product.last_out || product.last_day)} tone="sold" />
                    <Kpi label="Movements" value={String(history.filter((row) => !row.event && !row.action?.startsWith("product_")).length)} detail="history" />
                  </div>
                </div>
                <div className="lg:text-right">
                  <SectionLabel>In stock</SectionLabel>
                  <div className={cn("mt-1 font-heading text-[56px] leading-none text-gold", product.in_stock <= 0 && "text-sold")}>{product.in_stock}</div>
                </div>
              </div>
            </Panel>

            {!product.deleted_at ? (
              <Panel className="p-5">
                <form className="grid gap-4" onSubmit={(event) => void submitMovement(event)}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <SectionLabel>Movement</SectionLabel>
                      <div className="mt-3 inline-grid grid-cols-2 rounded-md border border-border bg-elevated p-1">
                        <Button
                          type="button"
                          variant={form.kind === "in" ? "received" : "ghost"}
                          onClick={() => setForm((current) => ({ ...current, kind: "in" }))}
                        >
                          + Received
                        </Button>
                        <Button
                          type="button"
                          variant={form.kind === "out" ? "sold" : "ghost"}
                          onClick={() => setForm((current) => ({ ...current, kind: "out" }))}
                        >
                          − Sold
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="w-fit">Save</Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[0.5fr_0.65fr_1fr]">
                    <Field label="Quantity">
                      <Input
                        ref={qtyRef}
                        autoFocus
                        inputMode="numeric"
                        min="1"
                        value={form.qty}
                        onChange={(event) => setForm((current) => ({ ...current, qty: event.target.value }))}
                        className={cn("h-12 text-lg", invalidQty && "animate-field-shake border-danger-strong")}
                      />
                    </Field>
                    <Field label="Date">
                      <Input type="date" value={form.day} onChange={(event) => setForm((current) => ({ ...current, day: event.target.value }))} />
                    </Field>
                    <Field label="Note">
                      <Textarea value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
                    </Field>
                  </div>
                </form>
              </Panel>
            ) : null}

            <Panel>
              <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <SectionLabel>History</SectionLabel>
                  <p className="mt-1 text-sm text-muted-foreground">Movements and product events for this product.</p>
                </div>
                <a className="text-sm font-semibold text-gold underline-offset-4 hover:underline" href={ledgerCsvHref({ product: product.name })}>
                  Download CSV
                </a>
              </div>
              <LedgerTable rows={history} showProduct={false} onVoid={handleVoid} />
            </Panel>

            {!product.deleted_at ? (
              <div className="flex justify-end">
                <Button type="button" variant="ghost" className="text-muted-foreground hover:text-sold" onClick={() => void handleDelete()}>
                  <Trash2 aria-hidden="true" />
                  delete product
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </PageShell>
  );
}

function Kpi({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "received" | "sold" }) {
  return (
    <div className="rounded-md border border-border bg-elevated p-4">
      <SectionLabel>{label}</SectionLabel>
      <div className={cn("mt-2 text-2xl font-semibold text-foreground", tone === "received" && "text-received", tone === "sold" && "text-sold")}>
        {value}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </div>
  );
}
