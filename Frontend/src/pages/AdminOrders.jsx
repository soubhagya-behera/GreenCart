import { useEffect, useMemo, useState } from "react";
import { api, errorMessage, fileUrl } from "../lib/api";
import PageHeader from "../components/admin/PageHeader";
import AdminDataTable from "../components/admin/AdminDataTable";
import StatusBadge from "../components/admin/StatusBadge";
import { useDialog } from "../components/common/DialogContext";
import {
  ORDER_STATUS_OPTIONS,
  formatINR,
  formatDateTime,
} from "../lib/orderStatuses";
import { subscribeDelivery } from "../lib/deliverySocket";
import { patchOrderWithEvent } from "../lib/orderSocket";

export default function AdminOrders() {
  const { alert, confirm } = useDialog();
  const [state, setState] = useState({ loading: true, error: null, orders: [] });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    api("/admin/orders", { auth: true })
      .then((data) =>
        setState({
          loading: false,
          error: null,
          orders: Array.isArray(data) ? data : [],
        })
      )
      .catch((e) =>
        setState({ loading: false, error: errorMessage(e), orders: [] })
      );
  };

  const refresh = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ---- live order updates ----------------------------------------------
  // Every lifecycle transition is broadcast on /topic/delivery. Known
  // orders are patched in place instantly; anything else (a brand-new
  // checkout, full DTO refresh) triggers one debounced silent refetch.
  useEffect(() => {
    let timer = null;
    const off = subscribeDelivery((event) => {
      if (typeof event.orderId !== "number") return; // PARTNER_STATUS etc.
      setState((s) => ({
        ...s,
        orders: s.orders.some((o) => o.id === event.orderId)
          ? s.orders.map((o) => patchOrderWithEvent(o, event))
          : s.orders,
      }));
      setSelected((sel) =>
        sel && sel.id === event.orderId
          ? patchOrderWithEvent(sel, event)
          : sel
      );
      clearTimeout(timer);
      timer = setTimeout(fetchData, 900);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, []);

  const paymentOptions = useMemo(
    () => [...new Set(state.orders.map((o) => o.paymentStatus).filter(Boolean))],
    [state.orders]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.orders
      .filter((o) => {
        if (statusFilter !== "all" && o.orderStatus !== statusFilter) return false;
        if (payFilter !== "all" && o.paymentStatus !== payFilter) return false;
        if (!q) return true;
        const idMatch = String(o.id).includes(q.replace(/^#+/, ""));
        const custMatch = [o.customer?.name, o.customer?.email]
          .some((v) => (v || "").toLowerCase().includes(q));
        return idMatch || custMatch;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [state.orders, search, statusFilter, payFilter]);

  function openDetail(order) {
    setSelected(order);
    setNextStatus(
      ORDER_STATUS_OPTIONS.includes(order.orderStatus) ? order.orderStatus : ""
    );
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
      message: `Order #${String(selected.id).padStart(8, "0")}: "${selected.orderStatus}" → "${nextStatus}"?`,
      confirmText: "Update Status",
      cancelText: "Cancel",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const updated = await api(`/admin/orders/${selected.id}/status`, {
        method: "PUT",
        body: { status: nextStatus },
        auth: true,
      });
      setState((s) => ({
        ...s,
        orders: s.orders.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
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

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle={`${state.orders.length} marketplace orders — full platform visibility.`}
        actions={
          <button
            onClick={refresh}
            className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-600 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
          >
            Refresh
          </button>
        }
      />

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <input
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
          placeholder="Search by order ID or customer…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-emerald-400"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Any order status</option>
          {ORDER_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "OutForDelivery" ? "Out for Delivery" : s}
            </option>
          ))}
        </select>
        <select
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-emerald-400"
          value={payFilter}
          onChange={(e) => setPayFilter(e.target.value)}
        >
          <option value="all">Any payment</option>
          {paymentOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <AdminDataTable
        loading={state.loading}
        error={state.error}
        onRetry={refresh}
        rows={rows}
        onRowClick={openDetail}
        emptyTitle="No orders match"
        emptyMessage="Adjust the search or filters."
        columns={[
          {
            key: "id",
            label: "Order",
            render: (o) => (
              <span className="text-xs font-black text-gray-900">
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
                <p className="text-gray-400">{o.customer?.email || ""}</p>
              </div>
            ),
          },
          {
            key: "sellers",
            label: "Seller(s)",
            render: (o) => {
              const sellers = [
                ...new Set(
                  (o.items || [])
                    .map((it) => it.sellerName)
                    .filter(Boolean)
                ),
              ];
              if (sellers.length === 0) {
                return <span className="text-xs text-gray-300">—</span>;
              }
              return (
                <div className="text-xs max-w-[150px]">
                  <p className="font-bold text-gray-700 truncate">
                    {sellers[0]}
                  </p>
                  {sellers.length > 1 && (
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mt-0.5">
                      +{sellers.length - 1} more
                    </p>
                  )}
                </div>
              );
            },
          },
          {
            key: "items",
            label: "Items",
            render: (o) => (
              <div className="flex items-center gap-1.5">
                {(o.items || []).slice(0, 2).map((it, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden"
                    title={it.productName}
                  >
                    <img
                      src={it.productImage ? fileUrl(it.productImage) : "/placeholder.png"}
                      alt=""
                      className="w-full h-full object-contain p-0.5"
                    />
                  </div>
                ))}
                {(o.items?.length || 0) > 2 && (
                  <span className="text-[10px] font-black text-gray-400">
                    +{o.items.length - 2}
                  </span>
                )}
                {(o.items?.length || 0) === 0 && (
                  <span className="text-xs text-gray-300">—</span>
                )}
              </div>
            ),
          },
          {
            key: "total",
            label: "Amount",
            render: (o) => (
              <span className="text-xs font-black text-gray-900">
                {formatINR(o.total)}
              </span>
            ),
          },
          {
            key: "paymentStatus",
            label: "Payment",
            render: (o) => <StatusBadge value={o.paymentStatus} />,
          },
          {
            key: "orderStatus",
            label: "Status",
            render: (o) => <StatusBadge value={o.orderStatus} />,
          },
          {
            key: "assignedDelivery",
            label: "Delivery Partner",
            render: (o) =>
              o.assignedDelivery ? (
                <div className="text-xs max-w-[130px]">
                  <p className="font-black text-gray-800 truncate">
                    {o.assignedDelivery.name}
                  </p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-indigo-500 mt-0.5">
                    {["Picked Up", "OutForDelivery"].includes(o.orderStatus)
                      ? "Out with partner"
                      : o.orderStatus === "Delivered"
                      ? "Completed"
                      : "Assigned"}
                  </p>
                </div>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 italic">
                  Unassigned
                </span>
              ),
          },
          {
            key: "createdAt",
            label: "Placed",
            render: (o) => (
              <span className="text-xs text-gray-400 whitespace-nowrap">
                {formatDateTime(o.createdAt)}
              </span>
            ),
          },
        ]}
      />

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
              <h2 className="text-lg font-black text-gray-900 tracking-tight italic">
                Order #{String(selected.id).padStart(8, "0")}
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
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Payment</p>
                  <StatusBadge value={selected.paymentStatus} />
                  <p className="text-gray-500 mt-2">{selected.paymentMethod || "-"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Order Status</p>
                  <StatusBadge value={selected.orderStatus} />
                  <p className="text-gray-500 mt-2">
                    Placed {formatDateTime(selected.createdAt)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Customer</p>
                <div className="text-xs space-y-0.5">
                  <p className="font-black text-gray-800">{selected.customer?.name || "-"}</p>
                  <p className="text-gray-500">{selected.customer?.email || "-"}</p>
                  <p className="text-gray-500">{selected.customer?.phone || "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Delivery Address</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {selected.address || "-"}
                </p>
                <div
                  className={`mt-3 rounded-xl border p-3 ${
                    selected.assignedDelivery
                      ? "bg-indigo-50/60 border-indigo-100"
                      : "bg-gray-50 border-gray-100"
                  }`}
                >
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Delivery Assignment
                  </p>
                  {selected.assignedDelivery ? (
                    <>
                      <p className="text-xs font-black text-gray-800">
                        🛵 {selected.assignedDelivery.name}
                      </p>
                      <p className="text-[10px] text-gray-500">{selected.assignedDelivery.email}</p>
                      {selected.assignedAt && (
                        <p className="text-[10px] font-bold text-gray-400 mt-1">
                          Assigned: {formatDateTime(selected.assignedAt)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs font-bold text-gray-400 italic">
                      Unassigned — waiting for a delivery partner to accept.
                    </p>
                  )}
                </div>
                {selected.deliveredAt && (
                  <p className="text-xs text-emerald-600 mt-2 font-bold">
                    Delivered {formatDateTime(selected.deliveredAt)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Items ({(selected.items || []).length})
                </p>
                <ul className="divide-y divide-gray-50 border border-gray-100 rounded-xl overflow-hidden">
                  {(selected.items || []).map((it, i) => (
                    <li key={it.itemId ?? i} className="flex items-center gap-3 px-3 py-2.5">
                      <div className="w-9 h-9 rounded-lg bg-gray-50 overflow-hidden shrink-0">
                        <img
                          src={it.productImage ? fileUrl(it.productImage) : "/placeholder.png"}
                          alt=""
                          className="w-full h-full object-contain p-0.5"
                        />
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-bold text-gray-800 truncate">{it.productName}</p>
                        <p className="text-gray-400">
                          × {it.qty} · Seller: {it.sellerName || "-"}
                        </p>
                      </div>
                      <span className="text-xs font-black text-gray-900 whitespace-nowrap">
                        {formatINR((it.price ?? 0) * (it.qty ?? 0))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex items-center justify-between bg-gray-900 text-white rounded-xl px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Cart Total
                </span>
                <span className="text-lg font-black">{formatINR(selected.total)}</span>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  Admin Status Override
                </p>
                <div className="flex gap-2">
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-emerald-400"
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
            </div>
          </div>
        </div>
      )}
    </>
  );
}
