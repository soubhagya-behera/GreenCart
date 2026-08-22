import { fileUrl } from "../lib/api";
import { assets } from "../assets/greencart/greencart_assets/assets";
import { formatINR, formatDate, formatDateTime } from "../lib/orderStatuses";
import { useMyDeliveryOrders } from "../components/delivery/useDeliveryData";
import {
  StatusPill,
  EmptyState,
  SkeletonCards,
  ErrorBox,
} from "../components/delivery/ui";

function HistoryRow({ o }) {
  return (
    <>
      {/* Desktop table row */}
      <tr className="hidden md:table-row hover:bg-gray-50/70 transition-colors">
        <td className="px-4 py-3 text-xs font-black text-gray-900 whitespace-nowrap">
          #{String(o.id).padStart(8, "0")}
        </td>
        <td className="px-4 py-3 text-xs">
          <p className="font-black text-gray-800">{o.user?.name || "-"}</p>
          <p className="text-gray-400">{o.user?.phone || ""}</p>
        </td>
        <td className="px-4 py-3 text-xs font-black text-gray-900 tabular-nums">
          {formatINR(o.total)}
        </td>
        <td className="px-4 py-3">
          <span className={`text-[10px] font-black uppercase tracking-widest ${o.paymentMethod === "COD" ? "text-amber-600" : "text-violet-600"}`}>
            {o.paymentMethod || "-"}
          </span>
        </td>
        <td className="px-4 py-3"><StatusPill status={o.orderStatus} /></td>
        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(o.assignedAt)}</td>
        <td className="px-4 py-3 text-xs text-emerald-700 font-bold whitespace-nowrap">
          {formatDateTime(o.deliveredAt)}
        </td>
      </tr>

      {/* Mobile card */}
      <div className="md:hidden bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-gray-900">#{String(o.id).padStart(8, "0")}</p>
            <p className="text-xs text-gray-400">{formatDateTime(o.assignedAt)}</p>
          </div>
          <StatusPill status={o.orderStatus} />
        </div>
        <div className="flex items-center gap-2.5">
          <img
            src={o.user?.avatarUrl ? fileUrl(o.user.avatarUrl) : assets.profile_icon}
            onError={(e) => { e.currentTarget.src = assets.profile_icon; }}
            alt=""
            className="w-8 h-8 rounded-lg object-cover bg-gray-50"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-gray-800 truncate">{o.user?.name || "-"}</p>
            <p className="text-[10px] text-gray-400">
              {(o.items || []).length} item{(o.items || []).length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-gray-900 tabular-nums">{formatINR(o.total)}</p>
            <p className={`text-[9px] font-black uppercase tracking-widest ${o.paymentMethod === "COD" ? "text-amber-600" : "text-violet-600"}`}>
              {o.paymentMethod} · {o.paymentStatus}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-gray-50 pt-2.5">
          <span className="text-[10px] font-bold text-gray-400">Assigned</span>
          <span className="text-[10px] font-bold text-gray-600">{formatDate(o.assignedAt)}</span>
          <span className="text-[10px] font-bold text-gray-400">Delivered</span>
          <span className="text-[10px] font-bold text-emerald-700">{formatDate(o.deliveredAt)}</span>
        </div>
      </div>
    </>
  );
}

export default function DeliveryHistory() {
  const { orders, loading, error, reload } = useMyDeliveryOrders();

  // Completed work first (newest delivery), then anything else assigned.
  const rows = [...orders].sort(
    (a, b) => new Date(b.deliveredAt || b.createdAt) - new Date(a.deliveredAt || a.createdAt)
  );

  const delivered = rows.filter((o) => o.orderStatus === "Delivered").length;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
            Track Record
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-1">
            Delivery History
          </h1>
          <p className="text-xs font-bold text-gray-400 mt-1">
            {delivered} completed deliver{delivered === 1 ? "y" : "ies"} · {rows.length} total assigned
          </p>
        </div>
      </div>

      <ErrorBox error={error} onRetry={reload} />

      {loading ? (
        <SkeletonCards count={3} height="h-20" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="🕘"
          title="No completed deliveries yet."
          message="Once you complete deliveries they will be archived here with full details."
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  {["Order", "Customer", "Amount", "Payment", "Status", "Assigned", "Delivered"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-gray-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((o) => (
                  <HistoryRow key={o.id} o={o} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {rows.map((o) => (
              <HistoryRow key={o.id} o={o} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
