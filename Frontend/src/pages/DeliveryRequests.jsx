import { useState } from "react";
import { api, errorMessage, fileUrl } from "../lib/api";
import { assets } from "../assets/greencart/greencart_assets/assets";
import { formatINR, formatDateTime } from "../lib/orderStatuses";
import { useDialog } from "../components/common/DialogContext";
import { useDeliveryPortal } from "../components/delivery/DeliveryContext";
import { useDeliveryRequests } from "../components/delivery/useDeliveryData";
import {
  PaymentTag,
  EmptyState,
  SkeletonCards,
  ErrorBox,
} from "../components/delivery/ui";

function RequestCard({ r, online, busyId, onAccept, onReject }) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    r.address || ""
  )}`;

  return (
    <article className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Card head */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-gray-50 bg-gray-50/60">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600 mb-0.5">
            New Delivery Request
          </p>
          <h3 className="text-lg font-black text-gray-900 tracking-tight leading-none">
            #{String(r.id).padStart(8, "0")}
          </h3>
          <p className="text-[10px] font-bold text-gray-400 mt-1">
            Placed {formatDateTime(r.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-gray-900 tabular-nums">{formatINR(r.total)}</p>
          <PaymentTag method={r.paymentMethod} status={r.paymentStatus} />
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Customer */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
            Customer
          </p>
          <p className="text-sm font-black text-gray-800">{r.customer?.name || "-"}</p>
          <a
            href={`tel:${r.customer?.phone || ""}`}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            {r.customer?.phone || "-"}
          </a>
        </div>

        {/* Items */}
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
            Items ({(r.items || []).length})
          </p>
          <ul className="space-y-1.5">
            {(r.items || []).map((it, i) => (
              <li key={i} className="flex items-center gap-2 min-w-0">
                <span className="w-7 h-7 shrink-0 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center">
                  <img
                    src={it.productImage ? fileUrl(it.productImage) : assets.logo}
                    onError={(e) => { e.currentTarget.src = assets.logo; }}
                    alt=""
                    className="w-full h-full object-contain p-0.5"
                  />
                </span>
                <span className="text-xs font-bold text-gray-700 truncate">
                  {it.productName || "Item"} × {it.qty}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Address */}
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
            Delivery Address
          </p>
          <p className="text-xs font-semibold text-gray-600 leading-relaxed">{r.address || "-"}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
          >
            Open Maps
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </a>
        </div>
      </div>

      <div className="px-5 pb-5">
        <div className="grid grid-cols-5 gap-3">
          {/* REJECT — hides this request for this partner only */}
          <button
            disabled={!online || busyId !== null}
            onClick={() => onReject(r)}
            className={`col-span-2 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] border transition-colors ${
              online
                ? "bg-white border-gray-200 text-gray-500 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                : "bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            {busyId === r.id ? "…" : "Reject"}
          </button>

          {/* ACCEPT ORDER — atomic backend claim (409 if someone else won) */}
          <button
            disabled={!online || busyId !== null}
            onClick={() => onAccept(r)}
            title={online ? undefined : "Go online to accept requests"}
            className={`col-span-3 py-4 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${
              online
                ? "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white shadow-lg shadow-emerald-600/15"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            {busyId === r.id
              ? "Working…"
              : !online
              ? "Go Online to Accept"
              : `Accept Order · ${formatINR(r.total)}`}
          </button>
        </div>
        {!online && (
          <p className="text-center text-[10px] font-bold text-gray-400 mt-2">
            Toggle availability in the header to start receiving requests.
          </p>
        )}
      </div>
    </article>
  );
}

export default function DeliveryRequests() {
  const { online } = useDeliveryPortal();
  const { requests, loading, error, reload } = useDeliveryRequests();
  const { alert } = useDialog();
  const [busyId, setBusyId] = useState(null);

  async function handleAccept(r) {
    if (busyId) return;
    setBusyId(r.id);
    try {
      await api(`/delivery/orders/${r.id}/accept`, { method: "PUT", auth: true });
      await alert({
        title: "Order Accepted",
        message: `Order #${String(r.id).padStart(8, "0")} assigned to you — view it under Active Deliveries.`,
        type: "success",
      });
    } catch (e) {
      if (e.status === 409) {
        await alert({
          title: "Already Assigned",
          message: "Another delivery partner accepted this order first.",
          type: "error",
        });
      } else {
        await alert({
          title: "Accept Failed",
          message: errorMessage(e),
          type: "error",
        });
      }
    } finally {
      setBusyId(null);
      reload(); // re-sync with backend truth either way
    }
  }

  async function handleReject(r) {
    if (busyId) return;
    setBusyId(r.id);
    try {
      // Backend records the rejection for THIS partner only — other
      // partners still see and can accept the same order. No assignment,
      // no delivery timer.
      await api(`/delivery/orders/${r.id}/reject`, { method: "PUT", auth: true });
    } catch (e) {
      if (e.status === 409) {
        await alert({
          title: "No Longer Available",
          message: "Another delivery partner already accepted this order.",
          type: "warning",
        });
      } else {
        await alert({
          title: "Reject Failed",
          message: errorMessage(e),
          type: "error",
        });
      }
    } finally {
      setBusyId(null);
      reload(); // re-sync with backend truth either way
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
          Live Queue
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-1">
          Available Requests
        </h1>
        <p className="text-xs font-bold text-gray-400 mt-1">
          Orders appear here automatically as customers check out. Rejecting one only hides it from you — other partners can still accept it.
          {!online && " You are offline — go online to respond."}
        </p>
      </div>

      <ErrorBox error={error} onRetry={reload} />

      {loading ? (
        <SkeletonCards count={3} height="h-44" />
      ) : requests.length === 0 ? (
        <EmptyState
          icon="🛵"
          title="No delivery requests right now."
          message="You'll see new orders here the moment customers place them — no refresh needed."
        />
      ) : (
        <div className="space-y-5">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              r={r}
              online={online}
              busyId={busyId}
              onAccept={handleAccept}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
