import { useEffect, useMemo, useState } from "react";
import { api, fileUrl, errorMessage } from "../lib/api";
import { useDialog } from "../components/common/DialogContext";
import {
  Panel,
  StatusPill,
  EmptyState,
  ErrorState,
  TableSkeleton,
  RefreshButton,
  formatOrderId,
} from "../components/seller/ui";
import { ORDER_STATUS_OPTIONS, formatINR } from "../lib/orderStatuses";

const FILTERS = [
  { key: "all", label: "All", match: () => true },
  {
    key: "processing",
    label: "Processing",
    match: (s) =>
      [
        "Awaiting Payment",
        "Confirmed",
        "Processing",
        "Packed",
        "Shipped",
        "Picked Up",
      ].includes(s),
  },
  { key: "ofd", label: "Out for Delivery", match: (s) => s === "OutForDelivery" },
  { key: "delivered", label: "Delivered", match: (s) => s === "Delivered" },
  { key: "cancelled", label: "Cancelled", match: (s) => s === "Cancelled" },
];

export default function SellerOrders() {
  const { alert, confirm } = useDialog();
  const [state, setState] = useState({
    loading: true,
    error: null,
    orders: [],
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [assignEmail, setAssignEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    api("/seller/orders", { auth: true })
      .then((res) =>
        setState({
          loading: false,
          error: null,
          orders: Array.isArray(res) ? res : [],
        })
      )
      .catch((e) =>
        setState({ loading: false, error: errorMessage(e), orders: [] })
      );
  };

  useEffect(() => {
    fetchData();
  }, []);

  function openDetail(order) {
    setSelected(order);
    setNextStatus(
      ORDER_STATUS_OPTIONS.includes(order.orderStatus) ? order.orderStatus : ""
    );
    setAssignEmail("");
  }

  async function updateStatus() {
    if (!selected || !nextStatus) return;
    if (nextStatus === selected.orderStatus) {
      await alert({
        title: "No Change",
        message: "Pick a different status before updating.",
        type: "info",
      });
      return;
    }

    const ok = await confirm({
      title: "Update Order Status",
      message: `Order ${formatOrderId(selected.id)}: "${selected.orderStatus}" → "${nextStatus}"?`,
      confirmText: "Update Status",
      cancelText: "Cancel",
    });
    if (!ok) return;

    setSaving(true);
    try {
      await api(`/seller/orders/${selected.id}/status`, {
        method: "PUT",
        body: { status: nextStatus },
        auth: true,
      });
      // Only patch the status field locally — the endpoint replies with a raw
      // Order entity whose line items are NOT scoped to this seller.
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) =>
          o.id === selected.id ? { ...o, orderStatus: nextStatus } : o
        ),
      }));
      setSelected(null);
      await alert({
        title: "Status Updated",
        message: `Order is now "${updated.orderStatus}".`,
        type: "success",
      });
    } catch (e) {
      await alert({ title: "Update Failed", message: errorMessage(e), type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function assignDelivery(e) {
    e.preventDefault();
    if (!selected || !assignEmail.trim()) return;
    setSaving(true);
    try {
      await api(`/seller/orders/${selected.id}/assign`, {
        method: "PUT",
        body: { deliveryEmail: assignEmail.trim() },
        auth: true,
      });
      await alert({
        title: "Delivery Assigned",
        message: "Order moved to Out for Delivery.",
        type: "success",
      });
      setSelected(null);
      fetchData();
    } catch (err) {
      await alert({
        title: "Assignment Failed",
        message: err.message || "Failed to assign: check email/role.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const matchFn =
      FILTERS.find((f) => f.key === filter)?.match || (() => true);
    return state.orders
      .filter((o) => matchFn(o.orderStatus || ""))
      .filter((o) => {
        if (!q) return true;
        const idMatch = String(o.id).includes(q.replace(/^#/, ""));
        const custMatch = [o.user?.name, o.user?.email].some((v) =>
          (v || "").toLowerCase().includes(q)
        );
        return idMatch || custMatch;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [state.orders, search, filter]);

  const counts = useMemo(() => {
    const map = {};
    for (const f of FILTERS) {
      map[f.key] = state.orders.filter((o) => f.match(o.orderStatus || "")).length;
    }
    return map;
  }, [state.orders]);

  const inputCls =
    "bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-400";

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            My Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Orders containing your products — fulfil them on time.
          </p>
        </div>
        <RefreshButton onClick={fetchData} />
      </div>

      <ErrorState error={state.error} onRetry={fetchData} />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3.5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${
              filter === f.key
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-500 hover:border-emerald-300"
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 tabular-nums ${
                filter === f.key ? "text-emerald-400" : "text-gray-300"
              }`}
            >
              {counts[f.key]}
            </span>
          </button>
        ))}
        <input
          className={`flex-1 min-w-[200px] md:max-w-xs md:ml-auto ${inputCls}`}
          placeholder="Search by order ID or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Orders table */}
      <Panel subtitle={`${rows.length} order${rows.length === 1 ? "" : "s"} shown`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-gray-50/80">
                {[
                  "Order ID",
                  "Customer",
                  "Items",
                  "Seller Subtotal",
                  "Payment",
                  "Status",
                  "Date",
                  "Action",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap ${
                      h === "Seller Subtotal" || i === 7 ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            {state.loading && <TableSkeleton rows={6} cols={8} />}

            {!state.loading && rows.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon="🧾"
                      title={
                        state.orders.length === 0 ? "No orders yet" : "No orders match"
                      }
                      message={
                        state.orders.length === 0
                          ? "Orders containing your products will appear here."
                          : "Try another filter or clear the search."
                      }
                    />
                  </td>
                </tr>
              </tbody>
            )}

            {!state.loading &&
              rows.map((o) => (
                <tr
                  key={o.id}
                  className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                  onClick={() => openDetail(o)}
                >
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-black text-gray-900 whitespace-nowrap">
                      {formatOrderId(o.id)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-xs min-w-0 max-w-[160px]">
                      <p className="font-black text-gray-800 truncate">
                        {o.user?.name || "-"}
                      </p>
                      <p className="text-gray-400 truncate">{o.user?.email || ""}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {(o.items || []).slice(0, 2).map((it, i) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0"
                          title={`${it.name} × ${it.qty}`}
                        >
                          <img
                            src={it.image ? fileUrl(it.image) : "/placeholder.png"}
                            alt=""
                            className="w-full h-full object-contain p-0.5"
                          />
                        </div>
                      ))}
                      <span className="text-[10px] font-black text-gray-400 whitespace-nowrap">
                        {(o.items || []).slice(0, 1).map((it) => `${it.name.split(" ")[0]} × ${it.qty}`)}
                        {(o.items?.length || 0) > 1 && ` +${o.items.length - 1}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-xs font-black text-gray-900 whitespace-nowrap">
                      {formatINR(o.total)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill value={o.paymentStatus} />
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusPill value={o.orderStatus} />
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap">
                      {new Date(o.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDetail(o);
                      }}
                      className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
          </table>
        </div>
      </Panel>

      {/* Detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-[210] flex justify-end"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full sm:max-w-lg h-full shadow-2xl overflow-y-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-base font-black text-gray-900 tracking-tight italic">
                Order {formatOrderId(selected.id)}
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-500 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Order Status</p>
                  <StatusPill value={selected.orderStatus} />
                  <p className="text-[10px] text-gray-400 mt-2">
                    Placed{" "}
                    {new Date(selected.createdAt).toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Payment</p>
                  <StatusPill value={selected.paymentStatus} />
                  <p className="text-[10px] text-gray-400 mt-2">
                    {selected.paymentMethod || "-"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Customer</p>
                <div className="text-xs space-y-0.5 bg-white border border-gray-100 rounded-xl p-3">
                  <p className="font-black text-gray-800">{selected.user?.name || "-"}</p>
                  <p className="text-gray-500">{selected.user?.email || "-"}</p>
                  <p className="text-gray-500 leading-relaxed pt-1 border-t border-gray-50 mt-1">
                    📍 {selected.address || "-"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  My Items ({(selected.items || []).length})
                </p>
                <ul className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                  {(selected.items || []).map((it, i) => (
                    <li key={i} className="flex items-center gap-3 px-3 py-2.5 bg-white">
                      <div className="w-9 h-9 rounded-lg bg-gray-50 overflow-hidden shrink-0">
                        <img
                          src={it.image ? fileUrl(it.image) : "/placeholder.png"}
                          alt=""
                          className="w-full h-full object-contain p-0.5"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-bold text-gray-800 truncate">{it.name}</p>
                        <p className="text-gray-400">
                          {it.qty} × {formatINR(it.price)}
                        </p>
                      </div>
                      <span className="text-xs font-black text-gray-900 whitespace-nowrap">
                        {formatINR((it.price ?? 0) * (it.qty ?? 0))}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between bg-gray-900 text-white rounded-xl px-4 py-3 mt-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    My Subtotal
                  </span>
                  <span className="text-lg font-black">{formatINR(selected.total)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Courier</p>
                  {selected.assignedDelivery ? (
                    <>
                      <p className="font-black text-indigo-600 uppercase tracking-wide text-[11px]">
                        {selected.assignedDelivery.name}
                      </p>
                      <p className="text-gray-500">{selected.assignedDelivery.email}</p>
                    </>
                  ) : (
                    <span className="font-bold text-amber-500 uppercase tracking-widest text-[10px]">
                      Unassigned
                    </span>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Delivery Proof</p>
                  {selected.proofImageUrl ? (
                    <img
                      src={fileUrl(selected.proofImageUrl)}
                      alt="Proof"
                      className="w-14 h-14 object-cover rounded-lg border border-white cursor-pointer hover:scale-105 transition-transform shadow-sm"
                      onClick={() => window.open(fileUrl(selected.proofImageUrl), "_blank")}
                    />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </div>
              </div>

              {selected.deliveryNote && (
                <div className="bg-blue-50/40 border border-blue-100 rounded-xl p-3 text-xs text-blue-800">
                  <span className="font-black uppercase tracking-widest text-[9px] block mb-1">
                    Latest note
                  </span>
                  {selected.deliveryNote}
                </div>
              )}

              {/* Fulfilment controls */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                  Fulfilment Controls
                </p>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Update Status
                  </label>
                  <div className="flex gap-2 mt-1.5">
                    <select
                      value={nextStatus}
                      onChange={(e) => setNextStatus(e.target.value)}
                      className={`flex-1 ${inputCls} font-bold`}
                    >
                      <option value="">Select status…</option>
                      {ORDER_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s === "OutForDelivery" ? "Out for Delivery" : s}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={saving || !nextStatus}
                      onClick={updateStatus}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest px-5 rounded-xl transition-colors"
                    >
                      {saving ? "…" : "Update"}
                    </button>
                  </div>
                </div>

                <form onSubmit={assignDelivery}>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Assign Delivery Partner
                  </label>
                  <div className="flex gap-2 mt-1.5">
                    <input
                      className={`flex-1 ${inputCls}`}
                      placeholder="Delivery partner email"
                      value={assignEmail}
                      onChange={(e) => setAssignEmail(e.target.value)}
                      required
                    />
                    <button
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[10px] font-black uppercase tracking-widest px-5 rounded-xl transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
