import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../lib/api";
import PageHeader from "../components/admin/PageHeader";
import AdminDataTable from "../components/admin/AdminDataTable";
import StatusBadge from "../components/admin/StatusBadge";
import { formatINR, formatDateTime } from "../lib/orderStatuses";
import { subscribeDelivery } from "../lib/deliverySocket";

function PartnerState({ online, active }) {
  if (!online) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        Offline
      </span>
    );
  }
  if (active > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        Delivering · {active}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Online · Available
    </span>
  );
}

export default function AdminDelivery() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    partners: [],
    orders: [],
  });
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);

  const fetchData = () => {
    Promise.all([
      api("/admin/delivery-partners", { auth: true }),
      api("/admin/orders", { auth: true }),
    ])
      .then(([partners, orders]) => {
        setState({
          loading: false,
          error: null,
          partners: Array.isArray(partners) ? partners : [],
          orders: Array.isArray(orders) ? orders : [],
        });
      })
      .catch((e) =>
        setState((s) => ({ ...s, loading: false, error: errorMessage(e) }))
      );
  };

  const refresh = () => {
    setState((s) => ({ ...s, loading: true }));
    fetchData();
  };

  useEffect(() => {
    fetchData();
    // Reconnect/failure fallback only — the normal path is event-driven.
    const iv = setInterval(fetchData, 60000);
    return () => clearInterval(iv);
  }, []);

  // ---- live delivery ops ------------------------------------------------
  // NEW_REQUEST / ACCEPTED / ORDER_COMPLETED / CANCELLED / PARTNER_STATUS /
  // ORDER_STATUS_CHANGED all trigger an immediate debounced refresh, so the
  // roster and assignment board track backend truth without manual refresh.
  // The interval stays only as a reconnect/failure fallback.
  useEffect(() => {
    let timer = null;
    const off = subscribeDelivery(() => {
      clearTimeout(timer);
      timer = setTimeout(fetchData, 300);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  const rows = useMemo(() => {
    const sorted = [...state.orders].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    return onlyUnassigned ? sorted.filter((o) => !o.assignedDelivery) : sorted;
  }, [state.orders, onlyUnassigned]);

  const assignedCount = state.orders.filter((o) => o.assignedDelivery).length;

  return (
    <>
      <PageHeader
        title="Delivery Assignments"
        subtitle={`${assignedCount} of ${state.orders.length} orders assigned across ${state.partners.length} delivery partner${state.partners.length === 1 ? "" : "s"}.`}
        actions={
          <button
            onClick={refresh}
            className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-600 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
          >
            Refresh
          </button>
        }
      />

      {state.error && (
        <div className="bg-white border border-red-100 rounded-2xl p-6 text-center mb-6">
          <p className="text-xs font-black text-red-500 uppercase tracking-widest">{state.error}</p>
          <button
            onClick={refresh}
            className="mt-3 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Partner roster */}
      <h2 className="text-lg font-black text-gray-900 tracking-tight italic mb-3">
        Delivery Partners
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {state.loading && state.partners.length === 0
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 h-36 skeleton" />
            ))
          : state.partners.length === 0
          ? (
            <div className="sm:col-span-2 xl:col-span-3 bg-white rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-sm font-black text-gray-900">No delivery partners yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Promote a user to the “delivery” role in Users and they will appear here.
              </p>
            </div>
          )
          : state.partners.map((p) => (
              <article
                key={p.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{p.name || "-"}</p>
                    <p className="text-[11px] text-gray-400 truncate">{p.email}</p>
                    {p.phone && (
                      <a href={`tel:${p.phone}`} className="text-[11px] font-bold text-emerald-700">
                        {p.phone}
                      </a>
                    )}
                  </div>
                  <PartnerState online={p.online} active={p.activeDeliveries} />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Active</p>
                    <p className="text-lg font-black text-blue-600 tabular-nums">{p.activeDeliveries}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Today</p>
                    <p className="text-lg font-black text-emerald-600 tabular-nums">{p.completedToday}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Total Done</p>
                    <p className="text-lg font-black text-gray-900 tabular-nums">{p.completedDeliveries}</p>
                  </div>
                </div>
              </article>
            ))}
      </div>

      {/* Assignment board */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-black text-gray-900 tracking-tight italic">
          Assignment Board
        </h2>
        <label className="flex items-center gap-2 cursor-pointer select-none self-start">
          <input
            type="checkbox"
            checked={onlyUnassigned}
            onChange={(e) => setOnlyUnassigned(e.target.checked)}
            className="accent-emerald-600 w-4 h-4"
          />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
            Only unassigned
          </span>
        </label>
      </div>

      <AdminDataTable
        loading={state.loading}
        error={state.error}
        onRetry={fetchData}
        rows={rows}
        emptyTitle="No orders match"
        emptyMessage={
          onlyUnassigned
            ? "Every order has a delivery partner assigned."
            : "Orders placed by customers will show up here."
        }
        columns={[
          {
            key: "id",
            label: "Order",
            render: (o) => (
              <span className="text-xs font-black text-gray-900 whitespace-nowrap">
                #{String(o.id).padStart(8, "0")}
              </span>
            ),
          },
          {
            key: "customer",
            label: "Customer",
            render: (o) => (
              <div className="text-xs">
                <p className="font-black text-gray-800">{o.customer?.name || "-"}</p>
                <p className="text-gray-400 max-w-[160px] truncate">{o.address || ""}</p>
              </div>
            ),
          },
          {
            key: "total",
            label: "Amount",
            render: (o) => (
              <span className="text-xs font-black text-gray-900 tabular-nums">
                {formatINR(o.total)}
              </span>
            ),
          },
          {
            key: "payment",
            label: "Payment",
            render: (o) => (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${o.paymentMethod === "COD" ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700"}`}>
                  {o.paymentMethod || "-"}
                </span>
                <StatusBadge value={o.paymentStatus} />
              </div>
            ),
          },
          {
            key: "orderStatus",
            label: "Status",
            render: (o) => <StatusBadge value={o.orderStatus} />,
          },
          {
            key: "partner",
            label: "Delivery Partner",
            render: (o) =>
              o.assignedDelivery ? (
                <div className="text-xs">
                  <p className="font-black text-gray-800 truncate max-w-[130px]">
                    {o.assignedDelivery.name}
                  </p>
                  {o.assignedAt && (
                    <p className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 mt-0.5">
                      Assigned {formatDateTime(o.assignedAt)}
                    </p>
                  )}
                </div>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 italic">
                  Unassigned
                </span>
              ),
          },
          {
            key: "deliveredAt",
            label: "Delivered",
            render: (o) =>
              o.deliveredAt ? (
                <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">
                  {formatDateTime(o.deliveredAt)}
                </span>
              ) : (
                <span className="text-xs text-gray-300">—</span>
              ),
          },
        ]}
      />
    </>
  );
}
