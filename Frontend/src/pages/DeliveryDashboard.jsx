import { useState } from "react";
import { api, errorMessage } from "../lib/api";
import { navigate } from "../lib/router";
import { formatINR, formatDateTime } from "../lib/orderStatuses";
import { useDialog } from "../components/common/DialogContext";
import {
  useDeliveryPortal,
} from "../components/delivery/DeliveryContext";
import {
  useDeliveryOverview,
  useDeliveryRequests,
  useMyDeliveryOrders,
  orderId,
} from "../components/delivery/useDeliveryData";
import {
  StatusPill,
  PaymentTag,
  EmptyState,
  SkeletonCards,
  ErrorBox,
} from "../components/delivery/ui";

const IN_FLIGHT = ["Picked Up", "OutForDelivery"];

function KpiCard({ label, value, hint, tone = "text-gray-900" }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
        {label}
      </p>
      <p className={`text-2xl font-black tabular-nums mt-2 ${tone}`}>{value}</p>
      {hint && (
        <p className="text-[10px] font-bold text-gray-400 mt-1 leading-none">{hint}</p>
      )}
    </div>
  );
}

export default function DeliveryDashboard() {
  const { user, online } = useDeliveryPortal();
  const { overview, loading: overviewLoading } = useDeliveryOverview();
  const { requests, loading: reqLoading, error, reload } = useDeliveryRequests();
  const { orders } = useMyDeliveryOrders();
  const { alert } = useDialog();
  const [acceptingId, setAcceptingId] = useState(null);

  const active = orders.filter((o) => IN_FLIGHT.includes(o.orderStatus));

  async function accept(r) {
    if (acceptingId) return;
    setAcceptingId(r.id);
    try {
      await api(`/delivery/orders/${r.id}/accept`, { method: "PUT", auth: true });
      await alert({
        title: "Order Accepted",
        message: `Order ${orderId(r)} is yours — head to Active Deliveries.`,
        type: "success",
      });
      reload();
    } catch (e) {
      await alert({
        title: e.status === 409 ? "Already Assigned" : "Accept Failed",
        message:
          e.status === 409
            ? "Another delivery partner accepted this order first."
            : errorMessage(e),
        type: "error",
      });
      reload();
    } finally {
      setAcceptingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
            Delivery Hub
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-1">
            {online ? "You're online" : "You're offline"}
            <span className="text-gray-300"> · </span>
            <span className="text-gray-400">{user?.name || "Partner"}</span>
          </h1>
          {!online && (
            <p className="text-xs font-bold text-gray-400 mt-1">
              Go online from the header to receive new delivery requests.
            </p>
          )}
        </div>
        <button
          onClick={() => navigate("/delivery/requests")}
          className="self-start bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest px-5 py-3 rounded-xl transition-colors"
        >
          View Requests ({requests.length})
        </button>
      </div>

      {/* KPI cards — real figures only */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <KpiCard
          label="Available Orders"
          value={overviewLoading ? "…" : overview?.availableRequests ?? requests.length}
          hint="Waiting for a partner"
          tone="text-emerald-600"
        />
        <KpiCard
          label="Active Delivery"
          value={overviewLoading ? "…" : overview?.activeDeliveries ?? active.length}
          hint="Assigned to you"
          tone="text-blue-600"
        />
        <KpiCard
          label="Completed Today"
          value={overviewLoading ? "…" : overview?.completedToday ?? 0}
          hint="Since midnight"
        />
        <KpiCard
          label="Delivered Value Today"
          value={overviewLoading ? "…" : formatINR(overview?.deliveredValueToday ?? 0)}
          hint="Order value you delivered today"
        />
      </div>

      {/* Latest available requests preview */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 tracking-tight italic">
            New Delivery Requests
          </h2>
          {requests.length > 0 && (
            <button
              onClick={() => navigate("/delivery/requests")}
              className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
            >
              View all →
            </button>
          )}
        </div>

        <ErrorBox error={error} onRetry={reload} />

        {reqLoading ? (
          <SkeletonCards count={2} />
        ) : requests.length === 0 ? (
          <EmptyState
            icon="🛵"
            title="No delivery requests right now."
            message="When a customer places an order it will appear here instantly — no refresh needed."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {requests.slice(0, 4).map((r) => (
              <article
                key={r.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600 mb-0.5">
                      New Delivery Request
                    </p>
                    <p className="text-base font-black text-gray-900">{orderId(r)}</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                      {formatDateTime(r.createdAt)}
                    </p>
                  </div>
                  <PaymentTag method={r.paymentMethod} status={r.paymentStatus} />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Customer</p>
                    <p className="font-black text-gray-800 truncate">{r.customer?.name || "-"}</p>
                    <a href={`tel:${r.customer?.phone || ""}`} className="font-bold text-emerald-700">
                      {r.customer?.phone || "-"}
                    </a>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Order Value</p>
                    <p className="font-black text-gray-900 tabular-nums">{formatINR(r.total)}</p>
                    <p className="text-[10px] text-gray-400">
                      {(r.items || []).length} item{(r.items || []).length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                  📍 {r.address || "-"}
                </p>

                <button
                  disabled={!online || acceptingId !== null}
                  onClick={() => accept(r)}
                  title={online ? undefined : "Go online to accept requests"}
                  className="w-full bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 hover:bg-emerald-700 text-white text-[11px] font-black uppercase tracking-[0.15em] py-3.5 rounded-xl transition-colors"
                >
                  {acceptingId === r.id ? "Accepting…" : !online ? "Go Online to Accept" : "Accept Order"}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Active deliveries summary */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-gray-900 tracking-tight italic">
            Your Active Deliveries
          </h2>
          {active.length > 0 && (
            <button
              onClick={() => navigate("/delivery/active")}
              className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
            >
              Manage →
            </button>
          )}
        </div>

        {active.length === 0 ? (
          <EmptyState
            icon="🗺️"
            title="No active delivery."
            message="Accept a request and it becomes your active delivery with a live status here."
          />
        ) : (
          <div className="space-y-3">
            {active.map((o) => (
              <button
                key={o.id}
                onClick={() => navigate("/delivery/active")}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-emerald-200 transition-colors"
              >
                <span className="w-10 h-10 shrink-0 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-lg">
                  🛵
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-gray-900">{orderId(o)}</span>
                  <span className="block text-xs text-gray-400 truncate">
                    {o.user?.name || "-"} · {o.address}
                  </span>
                </span>
                <span className="hidden sm:block"><StatusPill status={o.orderStatus} /></span>
                <span className="text-sm font-black text-gray-900 tabular-nums whitespace-nowrap">
                  {formatINR(o.total)}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
