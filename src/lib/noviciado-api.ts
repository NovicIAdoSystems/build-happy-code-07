export type Actor = {
  actor: string;
  actor_type: "human" | "agent";
  on_behalf_of?: string | null;
};

export type StockProduct = {
  id: number | string;
  name: string;
  received: number;
  sold: number;
  in_stock: number;
  last_day?: string | null;
  last_in?: string | null;
  last_out?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

export type LedgerRow = {
  id: number | string;
  product_id?: number | string | null;
  product?: string | null;
  product_name?: string | null;
  name?: string | null;
  event?: string | null;
  action?: string | null;
  kind?: "in" | "out" | null;
  qty?: number | null;
  day?: string | null;
  note?: string | null;
  actor?: string | null;
  actor_type?: "human" | "agent" | null;
  on_behalf_of?: string | null;
  recorded_at?: string | null;
  at?: string | null;
  voided_at?: string | null;
  voided_by?: string | null;
  void_reason?: string | null;
  detail?: string | null;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const stockServerUnavailable = "The stock server is not available.";

async function errorFrom(response: Response) {
  try {
    const data = (await response.json()) as { error?: string };
    return data.error || response.statusText || stockServerUnavailable;
  } catch {
    return response.statusText || stockServerUnavailable;
  }
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  const response = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw new ApiError(await errorFrom(response), response.status);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(stockServerUnavailable, response.status || 503);
  }

  return (await response.json()) as T;
}

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  return apiJson<T>(path, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
}

export async function getMe() {
  return apiJson<Actor>("/api/me");
}

export async function getStock(deleted = false) {
  return apiJson<StockProduct[]>(deleted ? "/api/stock?deleted=1" : "/api/stock");
}

export async function getProducts() {
  return apiJson<string[]>("/api/products");
}

export async function getLedger(filters: { product?: string; from?: string; to?: string; limit?: number }) {
  const params = new URLSearchParams();
  if (filters.product) params.set("product", filters.product);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.limit) params.set("limit", String(filters.limit));
  params.set("voided", "0");
  const query = params.toString();
  return apiJson<LedgerRow[]>(`/api/ledger${query ? `?${query}` : ""}`);
}

export async function createMovement(payload: {
  product: string;
  kind: "in" | "out";
  qty: number;
  day?: string;
  note?: string;
}) {
  return postJson<{ ok: boolean; id?: number | string }>("/api/movements", payload);
}

export async function createProduct(name: string) {
  return postJson<{ ok: boolean; id?: number | string }>("/api/products", { name });
}

export async function deleteProduct(id: number | string) {
  return postJson<{ ok: boolean }>("/api/products/delete", { id });
}

export async function restoreProduct(id: number | string) {
  return postJson<{ ok: boolean }>("/api/products/restore", { id });
}

export async function voidMovement(id: number | string, reason?: string) {
  return postJson<{ ok: boolean }>("/api/void", { id, reason });
}

export function stockCsvHref() {
  return "/export/stock.csv";
}

export function ledgerCsvHref(filters: { product?: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
  if (filters.product) params.set("product", filters.product);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const query = params.toString();
  return `/export/ledger.csv${query ? `?${query}` : ""}`;
}

export function madridToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(date)
    .replace(",", "");
}

export function productName(row: LedgerRow) {
  return row.product || row.product_name || row.name || "—";
}

export function actorName(row: LedgerRow | Actor) {
  return row.actor || "—";
}

export const sampleActor: Actor = {
  actor: "rick@noviciado.com",
  actor_type: "human",
};

export const sampleStock: StockProduct[] = [
  {
    id: 1,
    name: "Mahou 33cl",
    received: 240,
    sold: 182,
    in_stock: 58,
    last_day: "2026-09-18",
    last_in: "2026-09-17",
    last_out: "2026-09-18",
  },
  {
    id: 2,
    name: "Vermut rojo",
    received: 36,
    sold: 21,
    in_stock: 15,
    last_day: "2026-09-18",
    last_in: "2026-09-16",
    last_out: "2026-09-18",
  },
  {
    id: 3,
    name: "Agua con gas",
    received: 96,
    sold: 96,
    in_stock: 0,
    last_day: "2026-09-17",
    last_in: "2026-09-14",
    last_out: "2026-09-17",
  },
  {
    id: 4,
    name: "Aceitunas gordal",
    received: 18,
    sold: 7,
    in_stock: 11,
    last_day: "2026-09-15",
    last_in: "2026-09-15",
    last_out: "2026-09-14",
  },
];

export const sampleDeleted: StockProduct[] = [
  {
    id: 5,
    name: "Tónica clásica",
    received: 48,
    sold: 48,
    in_stock: 0,
    last_day: "2026-09-08",
    last_in: "2026-09-06",
    last_out: "2026-09-08",
    deleted_at: "2026-09-18T14:02:00+02:00",
    deleted_by: "carroll@noviciado.com",
  },
];

export const sampleLedger: LedgerRow[] = [
  {
    id: 17,
    product_id: 1,
    product: "Mahou 33cl",
    kind: "out",
    qty: 10,
    day: "2026-09-18",
    note: "Bar service",
    actor: "rick@noviciado.com",
    actor_type: "human",
    recorded_at: "2026-09-18T14:41:00+02:00",
  },
  {
    id: 16,
    product_id: 2,
    product: "Vermut rojo",
    kind: "in",
    qty: 12,
    day: "2026-09-18",
    note: "Supplier drop",
    actor: "leila",
    actor_type: "agent",
    on_behalf_of: "Rick",
    recorded_at: "2026-09-18T12:12:00+02:00",
  },
  {
    id: 15,
    product_id: 5,
    product: "Tónica clásica",
    event: "product_deleted",
    action: "product_deleted",
    note: "Product deleted",
    actor: "carroll@noviciado.com",
    actor_type: "human",
    recorded_at: "2026-09-18T14:02:00+02:00",
    at: "2026-09-18T14:02:00+02:00",
  },
  {
    id: 14,
    product_id: 3,
    product: "Agua con gas",
    kind: "out",
    qty: 12,
    day: "2026-09-17",
    note: "Voided test row",
    actor: "marta@noviciado.com",
    actor_type: "human",
    recorded_at: "2026-09-17T20:20:00+02:00",
    voided_at: "2026-09-18T14:45:00+02:00",
    voided_by: "rick@noviciado.com",
    void_reason: "wrong case count",
  },
  {
    id: 13,
    product_id: 4,
    product: "Aceitunas gordal",
    event: "product_added",
    action: "product_added",
    note: "Product added",
    actor: "marta@noviciado.com",
    actor_type: "human",
    recorded_at: "2026-09-15T10:11:00+02:00",
    at: "2026-09-15T10:11:00+02:00",
  },
];
