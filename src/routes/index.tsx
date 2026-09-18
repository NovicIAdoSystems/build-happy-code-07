import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { AppHeader, DetailsPanel, FeedbackBanner, Field, PageShell, Panel, SectionLabel } from "@/components/noviciado-layout";
import { LedgerTable } from "@/components/noviciado-ledger-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  createMovement,
  createProduct,
  deleteProduct,
  formatDate,
  formatDateTime,
  getLedger,
  getMe,
  getProducts,
  getStock,
  ledgerCsvHref,
  madridToday,
  restoreProduct,
  sampleActor,
  sampleDeleted,
  sampleLedger,
  sampleStock,
  stockCsvHref,
  type Actor,
  type LedgerRow,
  type StockProduct,
  voidMovement,
} from "@/lib/noviciado-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Warehouse — Noviciado Stock" },
      { name: "description", content: "Noviciado warehouse stock counts, quick movements, deleted products, and ledger history." },
      { property: "og:title", content: "Warehouse — Noviciado Stock" },
      { property: "og:description", content: "Track product stock, received items, sold items, and warehouse history for Noviciado." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WarehousePage,
});

type Feedback = { message: string; tone: "success" | "error" } | null;

type QuickQty = Record<string, string>;

function useWarehouseData() {
  const [actor, setActor] = useState<Actor>(sampleActor);
  const [stock, setStock] = useState<StockProduct[]>(sampleStock);
  const [deleted, setDeleted] = useState<StockProduct[]>(sampleDeleted);
  const [products, setProducts] = useState<string[]>(sampleStock.map((product) => product.name));
  const [ledger, setLedger] = useState<LedgerRow[]>(sampleLedger);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(true);

  async function refresh(filters?: { product?: string; from?: string; to?: string }) {
    setLoading(true);
    try {
      const [meData, stockData, deletedData, productData, ledgerData] = await Promise.all([
        getMe(),
        getStock(false),
        getStock(true),
        getProducts(),
        getLedger({ limit: 100, ...filters }),
      ]);
      setActor(meData);
      setStock(stockData.filter((product) => !product.deleted_at));
      setDeleted(deletedData.filter((product) => product.deleted_at));
      setProducts(productData);
      setLedger(ledgerData);
      setUsingDemo(false);
    } catch {
      setActor(sampleActor);
      setStock(sampleStock);
      setDeleted(sampleDeleted);
      setProducts(sampleStock.map((product) => product.name));
      setLedger(sampleLedger);
      setUsingDemo(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return { actor, stock, deleted, products, ledger, loading, usingDemo, refresh };
}

function WarehousePage() {
  const { actor, stock, deleted, products, ledger, loading, usingDemo, refresh } = useWarehouseData();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [quickQty, setQuickQty] = useState<QuickQty>({});
  const [invalidProductId, setInvalidProductId] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [productError, setProductError] = useState("");
  const [movement, setMovement] = useState({ product: "", kind: "in" as "in" | "out", qty: "", day: madridToday(), note: "" });
  const [filters, setFilters] = useState({ product: "", from: "", to: "" });
  const quantityRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const summary = useMemo(() => {
    const units = stock.reduce((total, product) => total + Number(product.in_stock || 0), 0);
    return `${stock.length} products · ${units} units in stock`;
  }, [stock]);

  function setSuccess(message: string) {
    setFeedback({ message, tone: "success" });
  }

  function setError(message: string) {
    setFeedback({ message, tone: "error" });
  }

  function flagInvalid(id: string) {
    setInvalidProductId(id);
    quantityRefs.current[id]?.focus();
    window.setTimeout(() => setInvalidProductId(null), 260);
  }

  async function handleQuickMove(product: StockProduct, kind: "in" | "out") {
    const id = String(product.id);
    const qty = Number(quickQty[id]);
    if (!Number.isFinite(qty) || qty <= 0) {
      flagInvalid(id);
      return;
    }
    try {
      await createMovement({ product: product.name, kind, qty, day: madridToday() });
      setQuickQty((current) => ({ ...current, [id]: "" }));
      setSuccess(`${kind === "in" ? "Received" : "Sold"} ${product.name} × ${qty} on ${madridToday()}.`);
      await refresh(filters);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save movement.");
    }
  }

  async function handleAddProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = productName.trim();
    if (!name) return;
    if (stock.some((product) => product.name.toLowerCase() === name.toLowerCase())) {
      setProductError(`${name} is already in the warehouse`);
      return;
    }
    try {
      await createProduct(name);
      setProductName("");
      setProductError("");
      setSuccess(`${name} added.`);
      await refresh(filters);
    } catch (error) {
      setProductError(error instanceof Error ? error.message : "Could not add product.");
    }
  }

  async function handleMovement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = movement.product.trim();
    const qty = Number(movement.qty);
    if (!name || !Number.isFinite(qty) || qty <= 0) {
      setError("Choose a product and enter a quantity above zero.");
      return;
    }
    try {
      await createMovement({ product: name, kind: movement.kind, qty, day: movement.day, note: movement.note.trim() });
      setMovement((current) => ({ ...current, product: "", qty: "", note: "" }));
      setSuccess(`${movement.kind === "in" ? "Received" : "Sold"} ${name} × ${qty} on ${movement.day}.`);
      await refresh(filters);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save movement.");
    }
  }

  async function handleDelete(product: StockProduct) {
    const ok = window.confirm(
      `Delete ${product.name} for sure? It disappears from the warehouse; its history stays and records who deleted it.`,
    );
    if (!ok) return;
    try {
      await deleteProduct(product.id);
      setSuccess(`${product.name} deleted. Find it under 'Deleted products' to restore.`);
      await refresh(filters);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete product.");
    }
  }

  async function handleRestore(product: StockProduct) {
    try {
      await restoreProduct(product.id);
      setSuccess(`${product.name} restored.`);
      await refresh(filters);
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
      await refresh(filters);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not void movement.");
    }
  }

  async function applyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await refresh(filters);
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
        message={feedback?.message || (usingDemo && !loading ? "Preview data shown until the stock server responds." : undefined)}
        tone={feedback?.tone || "success"}
      />

      <div className="mx-auto mt-6 grid w-full max-w-7xl gap-6">
        <Panel>
          <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-cream">{summary}</div>
            <a className="text-sm font-semibold text-gold underline-offset-4 hover:underline" href={stockCsvHref()}>
              Download CSV
            </a>
          </div>

          {stock.length === 0 ? (
            <div className="px-4 py-12 text-sm text-muted-foreground">Warehouse is empty — add the first product below.</div>
          ) : (
            <div className="divide-y divide-border md:overflow-x-auto">
              <table className="hidden w-full min-w-[900px] border-collapse text-left md:table">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.15em] text-label">
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">In stock</th>
                    <th className="px-4 py-3 font-semibold">Received · last date</th>
                    <th className="px-4 py-3 font-semibold">Sold · last date</th>
                    <th className="px-4 py-3 text-right font-semibold">Quick move</th>
                  </tr>
                </thead>
                <tbody>
                  {stock.map((product) => {
                    const id = String(product.id);
                    return (
                      <tr key={id} className="border-t border-border">
                        <td className="px-4 py-4">
                          <Link
                            to="/product/$id"
                            params={{ id }}
                            className="font-semibold text-foreground underline-offset-4 hover:text-gold hover:underline"
                          >
                            {product.name}
                          </Link>
                        </td>
                        <td className={cn("px-4 py-4 font-heading text-3xl text-gold", product.in_stock <= 0 && "text-sold")}>
                          {product.in_stock}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          <span className="font-semibold text-received">+{product.received}</span> · {formatDate(product.last_in || product.last_day)}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          <span className="font-semibold text-sold">−{product.sold}</span> · {formatDate(product.last_out || product.last_day)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="ml-auto flex max-w-[370px] items-center justify-end gap-2">
                            <Input
                              ref={(node) => {
                                quantityRefs.current[id] = node;
                              }}
                              aria-label={`quantity for ${product.name}`}
                              inputMode="numeric"
                              min="1"
                              value={quickQty[id] || ""}
                              onChange={(event) => setQuickQty((current) => ({ ...current, [id]: event.target.value }))}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") event.preventDefault();
                              }}
                              className={cn("h-10 w-20", invalidProductId === id && "animate-field-shake border-danger-strong")}
                            />
                            <Button type="button" variant="received" onClick={() => void handleQuickMove(product, "in")}>+ In</Button>
                            <Button type="button" variant="sold" onClick={() => void handleQuickMove(product, "out")}>− Out</Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`delete ${product.name}`}
                              onClick={() => void handleDelete(product)}
                              className="hover:text-sold"
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="grid gap-0 md:hidden">
                {stock.map((product) => {
                  const id = String(product.id);
                  return (
                    <article key={id} className="grid gap-3 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          to="/product/$id"
                          params={{ id }}
                          className="font-semibold text-foreground underline-offset-4 hover:text-gold hover:underline"
                        >
                          {product.name}
                        </Link>
                        <div className={cn("font-heading text-4xl leading-none text-gold", product.in_stock <= 0 && "text-sold")}>
                          {product.in_stock}
                        </div>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] gap-2">
                        <Input
                          ref={(node) => {
                            quantityRefs.current[id] = node;
                          }}
                          aria-label={`quantity for ${product.name}`}
                          inputMode="numeric"
                          min="1"
                          value={quickQty[id] || ""}
                          onChange={(event) => setQuickQty((current) => ({ ...current, [id]: event.target.value }))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") event.preventDefault();
                          }}
                          className={cn("h-10", invalidProductId === id && "animate-field-shake border-danger-strong")}
                        />
                        <Button type="button" variant="received" onClick={() => void handleQuickMove(product, "in")}>+ In</Button>
                        <Button type="button" variant="sold" onClick={() => void handleQuickMove(product, "out")}>− Out</Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`delete ${product.name}`}
                          onClick={() => void handleDelete(product)}
                          className="hover:text-sold"
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </Panel>

        <DetailsPanel title="+ New product">
          <div className="grid gap-6 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.2fr)]">
            <form className="grid content-start gap-3" onSubmit={(event) => void handleAddProduct(event)}>
              <SectionLabel>Add with zero stock</SectionLabel>
              <Field label="Name">
                <Input value={productName} onChange={(event) => setProductName(event.target.value)} />
              </Field>
              {productError ? <p className="text-sm text-sold">{productError}</p> : null}
              <Button type="submit" className="w-fit">
                <Plus aria-hidden="true" />
                Add product
              </Button>
            </form>

            <form className="grid gap-3" onSubmit={(event) => void handleMovement(event)}>
              <SectionLabel>Book a movement</SectionLabel>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.1fr_0.7fr_0.55fr_0.75fr]">
                <Field label="Product">
                  <Input
                    list="warehouse-products"
                    value={movement.product}
                    onChange={(event) => setMovement((current) => ({ ...current, product: event.target.value }))}
                  />
                </Field>
                <Field label="Direction">
                  <select
                    value={movement.kind}
                    onChange={(event) => setMovement((current) => ({ ...current, kind: event.target.value as "in" | "out" }))}
                    className="h-10 rounded-md border border-input bg-elevated px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="in">Received</option>
                    <option value="out">Sold</option>
                  </select>
                </Field>
                <Field label="Qty">
                  <Input
                    inputMode="numeric"
                    min="1"
                    value={movement.qty}
                    onChange={(event) => setMovement((current) => ({ ...current, qty: event.target.value }))}
                  />
                </Field>
                <Field label="Date">
                  <Input type="date" value={movement.day} onChange={(event) => setMovement((current) => ({ ...current, day: event.target.value }))} />
                </Field>
              </div>
              <Field label="Note">
                <Textarea value={movement.note} onChange={(event) => setMovement((current) => ({ ...current, note: event.target.value }))} />
              </Field>
              <Button type="submit" className="w-fit">Save</Button>
              <datalist id="warehouse-products">
                {products.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </form>
          </div>
        </DetailsPanel>

        {deleted.length > 0 ? (
          <DetailsPanel title={`Deleted products (${deleted.length})`}>
            <div className="divide-y divide-border">
              {deleted.map((product) => (
                <div key={String(product.id)} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold text-foreground">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      deleted {formatDateTime(product.deleted_at)} by {product.deleted_by || "—"}
                    </div>
                  </div>
                  <Button type="button" variant="ghost" onClick={() => void handleRestore(product)}>
                    restore
                  </Button>
                </div>
              ))}
            </div>
          </DetailsPanel>
        ) : null}

        <Panel>
          <div className="grid gap-4 border-b border-border px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <SectionLabel>All movements</SectionLabel>
                <p className="mt-1 text-sm text-muted-foreground">Last 100 rows unfiltered; filter or download CSV for everything.</p>
              </div>
              <a className="text-sm font-semibold text-gold underline-offset-4 hover:underline" href={ledgerCsvHref(filters)}>
                Download CSV
              </a>
            </div>
            <form className="grid gap-3 sm:grid-cols-4" onSubmit={(event) => void applyFilters(event)}>
              <Field label="Product">
                <select
                  value={filters.product}
                  onChange={(event) => setFilters((current) => ({ ...current, product: event.target.value }))}
                  className="h-10 rounded-md border border-input bg-elevated px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">All products</option>
                  {products.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </Field>
              <Field label="From">
                <Input type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} />
              </Field>
              <Field label="To">
                <Input type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} />
              </Field>
              <div className="flex items-end">
                <Button type="submit" variant="outline" className="w-full">Filter</Button>
              </div>
            </form>
          </div>
          <LedgerTable rows={ledger} onVoid={handleVoid} />
        </Panel>
      </div>
    </PageShell>
  );
}
