import { useState } from "react";
import { api, errorMessage, fileUrl } from "../lib/api";
import { assets } from "../assets/greencart/greencart_assets/assets";
import { formatINR, formatDateTime } from "../lib/orderStatuses";
import { useDialog } from "../components/common/DialogContext";
import { useMyDeliveryOrders } from "../components/delivery/useDeliveryData";
import {
  StatusPill,
  PaymentTag,
  EmptyState,
  SkeletonCards,
  ErrorBox,
} from "../components/delivery/ui";

const IN_FLIGHT = ["Picked Up", "OutForDelivery"];

function ActiveCard({ o, onDelivered }) {
  const { alert, confirm } = useDialog();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    o.address || ""
  )}`;

  async function markDelivered() {
    const ok = await confirm({
      title: "Mark Delivered",
      message: `Confirm order #${String(o.id).padStart(8, "0")} was handed over?${
        o.paymentMethod === "COD" ? " Cash payment will be recorded as collected." : ""
      }`,
      confirmText: "Yes, Delivered",
      cancelText: "Not Yet",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await api(`/delivery/orders/${o.id}/delivered`, { method: "PUT", auth: true });
      onDelivered?.();
    } catch (e) {
      await alert({ title: "Update Failed", message: errorMessage(e), type: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-50 bg-emerald-50/40">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600 mb-0.5">
            Active Delivery
          </p>
          <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">
            #{String(o.id).padStart(8, "0")}
          </h3>
        </div>
        <StatusPill status={o.orderStatus} />
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Customer</p>
          <p className="text-sm font-black text-gray-800">{o.user?.name || "-"}</p>
          <a href={`tel:${o.user?.phone || ""}`} className="block text-xs font-bold text-emerald-700">
            {o.user?.phone || "-"}
          </a>
        </div>

        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Delivery Address</p>
          <p className="text-xs font-semibold text-gray-600 leading-relaxed">{o.address || "-"}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-1 text-[10px] font-black uppercase tracking-widest text-emerald-600"
          >
            Open Maps
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </a>
        </div>

        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Order Value</p>
          <p className="text-xl font-black text-gray-900 tabular-nums">{formatINR(o.total)}</p>
          <PaymentTag method={o.paymentMethod} status={o.paymentStatus} />
        </div>
      </div>

      {/* Items + actions */}
      <div className="px-5 pb-5 space-y-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-500 py-2.5 rounded-xl transition-colors"
        >
          {expanded ? "Hide Order Details" : "View Order"}
        </button>

        {expanded && (
          <ul className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden animate-fade-in">
            {(o.items || []).map((it, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white">
                <span className="w-9 h-9 shrink-0 rounded-lg bg-gray-50 overflow-hidden flex items-center justify-center">
                  <img
                    src={it.product?.imageUrl ? fileUrl(it.product.imageUrl) : assets.logo}
                    onError={(e) => { e.currentTarget.src = assets.logo; }}
                    alt=""
                    className="w-full h-full object-contain p-0.5"
                  />
                </span>
                <span className="flex-1 min-w-0 text-xs font-bold text-gray-700 truncate">
                  {it.product?.name || "Item"} × {it.qty}
                </span>
                <span className="text-xs font-black text-gray-900 tabular-nums">
                  {formatINR((it.price ?? 0) * (it.qty ?? 0))}
                </span>
              </li>
            ))}
            <li className="px-3 py-2 bg-gray-50/60 text-[10px] font-bold text-gray-400">
              Accepted {o.assignedAt ? formatDateTime(o.assignedAt) : "—"} · auto-completes in this
              demo shortly after acceptance
            </li>
          </ul>
        )}

        <button
          disabled={busy}
          onClick={markDelivered}
          className="w-full py-4 rounded-xl bg-gray-900 hover:bg-emerald-600 disabled:opacity-60 text-white text-[11px] font-black uppercase tracking-[0.2em] transition-colors"
        >
          {busy ? "Updating…" : "Mark Delivered"}
        </button>
      </div>
    </article>
  );
}

export default function DeliveryActive() {
  const { orders, loading, error, reload } = useMyDeliveryOrders();
  const active = orders.filter((o) => IN_FLIGHT.includes(o.orderStatus));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
          On The Road
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-1">
          Active Deliveries
        </h1>
        <p className="text-xs font-bold text-gray-400 mt-1">
          Orders you accepted. In this demo they complete automatically about a minute after
          acceptance — or mark them delivered yourself.
        </p>
      </div>

      <ErrorBox error={error} onRetry={reload} />

      {loading ? (
        <SkeletonCards count={2} height="h-40" />
      ) : active.length === 0 ? (
        <EmptyState
          icon="🗺️"
          title="No active delivery."
          message="Accept an available request and it will show up here with live status."
        />
      ) : (
        <div className="space-y-5">
          {active.map((o) => (
            <ActiveCard key={o.id} o={o} onDelivered={reload} />
          ))}
        </div>
      )}
    </div>
  );
}
