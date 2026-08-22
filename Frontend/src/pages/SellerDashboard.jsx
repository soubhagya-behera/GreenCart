import { useEffect, useState } from "react";
import { api, fileUrl, errorMessage } from "../lib/api";
import { navigate } from "../lib/router";
import { formatINR } from "../lib/orderStatuses";
import SellerKpiCard from "../components/seller/SellerKpiCard";
import {
  Panel,
  StatusPill,
  EmptyState,
  ErrorState,
  TableSkeleton,
  HealthRow,
  MiniBar,
  RefreshButton,
  formatOrderId,
} from "../components/seller/ui";

export default function SellerDashboard() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    analytics: null,
    orders: [],
    products: [],
  });

  const fetchData = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.allSettled([
      api("/seller/analytics", { auth: true }),
      api("/seller/orders", { auth: true }),
      api("/products/mine", { auth: true }),
    ]).then(([a, o, p]) => {
      if (a.status === "rejected") {
        setState((s) => ({
          ...s,
          loading: false,
          error: errorMessage(a.reason),
        }));
        return;
      }
      setState({
        loading: false,
        error: null,
        analytics: a.value || {},
        orders:
          o.status === "fulfilled" && Array.isArray(o.value) ? o.value : [],
        products:
          p.status === "fulfilled" && Array.isArray(p.value) ? p.value : [],
      });
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { analytics, orders, products } = state;

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  const outOfStock = products.filter(
    (p) => Number(p.stock ?? 0) === 0
  ).length;
  const lowStock = products.filter((p) => {
    const s = Number(p.stock ?? 0);
    return s > 0 && s <= 5;
  }).length;
  const topProducts = analytics?.topProducts || [];
  const maxRevenue = Math.max(...topProducts.map((t) => t.revenue || 0), 1);

  const quickActions = [
    { label: "Add Product", path: "/seller/products#add-product", icon: "＋" },
    { label: "Manage Products", path: "/seller/products", icon: "📦" },
    { label: "Manage Orders", path: "/seller/orders", icon: "🧾" },
    { label: "View Analytics", path: "/seller/analytics", icon: "📈" },
    { label: "Store Profile", path: "/seller/store", icon: "🏪" },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Store Overview
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Track your products, orders and store performance.
          </p>
        </div>
        <RefreshButton onClick={fetchData} />
      </div>

      <ErrorState error={state.error} onRetry={fetchData} />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <SellerKpiCard
          label="My Revenue"
          value={formatINR(analytics?.totalRevenue)}
          hint="Paid orders · your items only"
          icon="₹"
          accent="gray"
        />
        <SellerKpiCard
          label="My Orders"
          value={analytics?.totalOrders ?? "–"}
          hint="All time"
          icon="🧾"
          accent="emerald"
        />
        <SellerKpiCard
          label="Pending Orders"
          value={analytics?.pendingOrders ?? "–"}
          hint="Requires attention"
          icon="⏳"
          accent="orange"
        />
        <SellerKpiCard
          label="Active Products"
          value={analytics?.activeProducts ?? "–"}
          hint={`${lowStock} low stock`}
          icon="📦"
          accent="violet"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent orders */}
        <div className="lg:col-span-2">
          <Panel
            title="Recent Orders"
            subtitle="Your line items only"
            actions={
              <button
                onClick={() => navigate("/seller/orders")}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
              >
                Manage all →
              </button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-gray-50/80">
                    {["Order", "Customer", "Items", "Amount", "Payment", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className={`px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap ${
                            h === "Amount" ? "text-right" : ""
                          }`}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                {state.loading && (
                  <TableSkeleton rows={5} cols={6} />
                )}

                {!state.loading && recentOrders.length === 0 && (
                  <tbody>
                    <tr>
                      <td colSpan={6}>
                        <EmptyState
                          icon="🧾"
                          title="No orders yet"
                          message="Orders containing your products will appear here as soon as customers check out."
                        />
                      </td>
                    </tr>
                  </tbody>
                )}

                {!state.loading && recentOrders.length > 0 && (
                  <tbody className="divide-y divide-gray-50">
                    {recentOrders.map((o) => (
                      <tr
                        key={o.id}
                        className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                        onClick={() => navigate("/seller/orders")}
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
                            <p className="text-gray-400 truncate">
                              {o.user?.email || ""}
                            </p>
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
                                  src={
                                    it.image
                                      ? fileUrl(it.image)
                                      : "/placeholder.png"
                                  }
                                  alt=""
                                  className="w-full h-full object-contain p-0.5"
                                />
                              </div>
                            ))}
                            <span className="text-[10px] font-black text-gray-400 whitespace-nowrap">
                              {(o.items || []).map((it) => `${it.name.split(" ")[0]} × ${it.qty}`).slice(0, 1)}
                              {(o.items?.length || 0) > 1 &&
                                ` +${o.items.length - 1}`}
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
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>
          </Panel>
        </div>

        {/* Store health + quick actions */}
        <div className="space-y-6">
          <Panel title="Store Health" subtitle="Live catalogue signals">
            <ul className="px-6 py-5 space-y-4">
              <HealthRow
                label="Active Products"
                value={analytics?.activeProducts ?? products.filter((p) => p.active !== false).length}
              />
              <HealthRow
                label="Low Stock (≤5)"
                value={lowStock}
                tone={lowStock ? "text-orange-500" : "text-gray-400"}
                onClick={() => navigate("/seller/products")}
              />
              <HealthRow
                label="Out of Stock"
                value={outOfStock}
                tone={outOfStock ? "text-red-500" : "text-gray-400"}
                onClick={() => navigate("/seller/products")}
              />
              <HealthRow
                label="Pending Fulfilment"
                value={analytics?.pendingOrders ?? 0}
                tone="text-blue-600"
                onClick={() => navigate("/seller/orders")}
              />
            </ul>
          </Panel>

          <div className="bg-gradient-to-br from-emerald-700 to-green-900 rounded-2xl p-6 text-white shadow-sm">
            <h2 className="text-lg font-black tracking-tight italic mb-1">
              Quick Actions
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-emerald-200/70 mb-4">
              Jump into store operations
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.path)}
                  className="bg-white/10 hover:bg-emerald-400/20 border border-white/10 hover:border-emerald-300/40 rounded-xl py-3 px-2 text-[10px] font-black uppercase tracking-widest text-emerald-50 hover:text-white transition-colors"
                >
                  <span className="block text-base leading-none mb-1.5">{a.icon}</span>
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top products */}
      <Panel
        title="Top Products"
        subtitle="Paid sales · your catalogue"
        actions={
          <button
            onClick={() => navigate("/seller/analytics")}
            className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
          >
            Full analytics →
          </button>
        }
      >
        {!state.loading && topProducts.length === 0 ? (
          <EmptyState
            icon="📈"
            title="No paid sales yet"
            message="Your best-selling products will rank here once orders start rolling in."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[520px]">
              <thead>
                <tr className="bg-gray-50/80">
                  {["Product", "Units Sold", "Revenue"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-400 ${
                        i === 2 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(state.loading ? Array.from({ length: 3 }) : topProducts).map(
                  (t, i) =>
                    state.loading ? (
                      <tr key={i}>
                        {[0, 1, 2].map((c) => (
                          <td key={c} className="px-4 py-4">
                            <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-1/2" />
                          </td>
                        ))}
                      </tr>
                    ) : (
                      <tr key={t.productId} className="hover:bg-emerald-50/40 transition-colors">
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                              <img
                                src={
                                  t.imageUrl
                                    ? fileUrl(t.imageUrl)
                                    : "/placeholder.png"
                                }
                                alt=""
                                className="w-full h-full object-contain p-0.5"
                              />
                            </div>
                            <span className="text-xs font-black text-gray-900 truncate">
                              {t.productName || `Product #${t.productId}`}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 w-48">
                          <div className="flex items-center gap-3">
                            <MiniBar ratio={(t.revenue || 0) / maxRevenue} />
                            <span className="text-xs font-bold text-gray-500 tabular-nums whitespace-nowrap">
                              {t.qtySold ?? 0} sold
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-xs font-black text-gray-900 tabular-nums whitespace-nowrap">
                            {formatINR(t.revenue)}
                          </span>
                        </td>
                      </tr>
                    )
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
