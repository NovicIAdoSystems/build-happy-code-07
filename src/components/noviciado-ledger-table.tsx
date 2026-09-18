import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { actorName, formatDate, formatDateTime, productName, type LedgerRow } from "@/lib/noviciado-api";
import { cn } from "@/lib/utils";

function eventLabel(row: LedgerRow) {
  const value = row.event || row.action || "";
  if (row.note) return row.note;
  if (value === "product_added") return "Product added";
  if (value === "product_deleted") return "Product deleted";
  if (value === "product_restored") return "Product restored";
  return value.replaceAll("_", " ");
}

function ActorCell({ row }: { row: LedgerRow }) {
  if (row.actor_type === "agent") {
    return (
      <span>
        <span className="text-gold">{actorName(row)}</span>
        {row.on_behalf_of ? <span className="text-muted-foreground"> for {row.on_behalf_of}</span> : null}
      </span>
    );
  }
  return <span>{actorName(row)}</span>;
}

export function LedgerTable({
  rows,
  showProduct = true,
  onVoid,
}: {
  rows: LedgerRow[];
  showProduct?: boolean;
  onVoid?: (row: LedgerRow) => void;
}) {
  if (rows.length === 0) {
    return <div className="px-4 py-8 text-sm text-muted-foreground">No movements yet.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-border text-[11px] uppercase tracking-[0.15em] text-label">
            <th className="px-4 py-3 font-semibold">Date</th>
            {showProduct ? <th className="px-4 py-3 font-semibold">Product</th> : null}
            <th className="px-4 py-3 font-semibold">Received</th>
            <th className="px-4 py-3 font-semibold">Sold</th>
            <th className="px-4 py-3 font-semibold">Note</th>
            <th className="px-4 py-3 font-semibold">Recorded by</th>
            <th className="px-4 py-3 font-semibold">Recorded at</th>
            <th className="px-4 py-3 text-right font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const event = Boolean(row.event || (row.action && row.action.startsWith("product_")));
            const voided = Boolean(row.voided_at);
            return (
              <tr
                key={`${row.id}-${row.recorded_at || row.at || row.day || "row"}`}
                className={cn(
                  "border-b border-border/80 last:border-0",
                  event && "italic text-muted-foreground",
                  voided && "text-muted-foreground line-through decoration-muted-foreground",
                )}
              >
                <td className="px-4 py-3 align-top text-cream">{formatDate(row.day || row.at || row.recorded_at)}</td>
                {showProduct ? (
                  <td className="px-4 py-3 align-top">
                    {row.product_id ? (
                      <Link
                        to="/product/$id"
                        params={{ id: String(row.product_id) }}
                        className="text-foreground underline-offset-4 hover:text-gold hover:underline"
                      >
                        {productName(row)}
                      </Link>
                    ) : (
                      productName(row)
                    )}
                  </td>
                ) : null}
                <td className="px-4 py-3 align-top font-semibold text-received">
                  {!event && row.kind === "in" && row.qty ? `+${row.qty}` : ""}
                </td>
                <td className="px-4 py-3 align-top font-semibold text-sold">
                  {!event && row.kind === "out" && row.qty ? `−${row.qty}` : ""}
                </td>
                <td className={cn("px-4 py-3 align-top", event && row.action === "product_deleted" && "text-sold")}>
                  {event ? eventLabel(row) : row.note || "—"}
                  {voided ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      voided {formatDateTime(row.voided_at)} by {row.voided_by || "—"}
                      {row.void_reason ? ` — ${row.void_reason}` : ""}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top">
                  <ActorCell row={row} />
                </td>
                <td className="px-4 py-3 align-top text-muted-foreground">{formatDateTime(row.recorded_at || row.at)}</td>
                <td className="px-4 py-3 text-right align-top">
                  {!event && !voided && onVoid ? (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onVoid(row)}>
                      void
                    </Button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
