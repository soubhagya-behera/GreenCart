import { useEffect, useState } from "react";
import { api, fileUrl, errorMessage } from "../lib/api";
import { navigate } from "../lib/router";
import { formatINR, formatDateTime } from "../lib/orderStatuses";
import SellerKpiCard from "../components/seller/SellerKpiCard";

export default function SellerDashboard() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    analytics: null,
    orders: [],
  });

  const fetchData = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.allSettled([
      api("/seller/analytics", { auth: true }),
      api("/seller/orders", { auth: true }),
    ]).then(([a, o]) => {
      if (a.status === "rejected") {
        setState({ loading: false, error: errorMessage(a.reason), analytics: null, orders: [] });
        return;
      }
      setState({
        loading: false,
        error: null,
        analytics: a.value || {},
        orders: o.status === "fulfilled" && Array.isArray(o.value) ? o.value : [],
      });
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { analytics, orders } = state;
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const quickActions = [
    { label: "Add Product", path: "/seller/products" },
    { label: "Manage Products", path: "/seller/products" },
    { label: "Manage Orders", path: "/seller/orders" },
    { label: "View Analytics", path: "/seller/analytics" },
  ];

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-emerald-600 font-black uppercase tracking-widest text-xs">
            My Store
          </p>
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter mt-1">
            Welcome back 👋
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Your store at a glance — only your products and your orders.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="bg-white border border-gray-200 hover:border-emerald-400 text-gray-600 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
        >
          Refresh
        </button>
      </div>

      {state.error && (
        <div className="bg-white border border-red-100 rounded-2xl p-8 text-center mb-6">
          <p className="text-sm font-black text-red-500 uppercase tracking-widest">
            {state.error}
          </p>
          <button
            onClick={fetchData}
            className="mt-4 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <SellerKpiCard
          label="Revenue"
          value={formatINR(analytics?.totalRevenue)}
          hint="Paid · your items only"
          icon="₹"
          tone="gray"
        />
        <SellerKpiCard
          label="Orders"
          value={analytics?.totalOrders ?? "–"}
          hint="Containing your products"
          icon="🧾"
          tone="emerald"
        />
        <SellerKpiCard
          label="Pending Orders"
          value={analytics?.pendingOrders ?? "–"}
          hint={`${analytics?.completedOrders ?? 0} delivered`}
          icon="⏳"
          tone="orange"
        />
        <SellerKpiCard
          label="Active Products"
          value={analytics?.activeProducts ?? "–"}
          hint="Visible in the storefront"
          icon="📦"
          tone="indigo"
        />
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h3 className="text-lg font-black text-gray-900 tracking-tight italic">
            Recent Orders
          </h3>
          <button
            onClick={() => navigate("/seller/orders")}
            className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
          >
            Manage all →
          </button>
        </div>

        <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 bg-gray-50/60 text-[9px] font-black uppercase tracking-widest text-gray-400">
          <div className="col-span-2">Order ID</div>
          <div className="col-span-3">Customer</div>
          <div className="col-span-2">Items</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-1">Status</div>
          <div className="col-span-2 text-right">Date</div>
        </div>

        <div className="divide-y divide-gray-50">
          {state.loading &&
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-6 py-4">
                <div className="h-3.5 bg-gray-100 rounded-full animate-pulse w-2/3" />
              </div>
            ))}

          {!state.loading &&
            recentOrders.map((o) => (
              <div
                key={o.id}
                className="grid grid-cols-2 md:grid-cols-12 gap-3 px-6 py-4 items-center hover:bg-emerald-50/30 transition-colors"
              >
                <div className="text-xs font-black text-gray-900 md:col-span-2">
                  #{String(o.id).padStart(8, "0")}
                </div>
                <div className="text-xs md:col-span-3 min-w-0">
                  <p className="font-bold text-gray-700 truncate">
                    {o.user?.name || "-"}
                  </p>
                  <p className="text-gray-400 truncate">{o.user?.email || ""}</p>
                </div>
                <div className="flex -space-x-1.5 md:col-span-2">
                  {(o.items || []).slice(0, 3).map((it, idx) => (
                    <div
                      key={idx}
                      className="w-7 h-7 rounded-full border-2 border-white bg-gray-50 overflow-hidden shadow-sm"
                      title={`${it.name} × ${it.qty}`}
                    >
                      <img
                        src={it.image ? fileUrl(it.image) : "/placeholder.png"}
                        className="w-full h-full object-cover"
                        alt=""
                      />
                    </div>
                  ))}
                  <span className="text-[10px] font-black text-gray-400 self-center ml-2">
                    {(o.items || []).length}
                  </span>
                </div>
                <div className="text-xs font-black text-gray-900 md:col-span-2">
                  {formatINR(o.total)}
                </div>
                <div className="md:col-span-1">
                  <span
                    className={`inline-block px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${
                      o.orderStatus === "Delivered"
                        ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                        : o.orderStatus === "Cancelled"
                        ? "bg-red-50 text-red-500 border-red-100"
                        : "bg-blue-50 text-blue-600 border-blue-100"
                    }`}
                  >
                    {o.orderStatus || "-"}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-gray-400 whitespace-nowrap md:text-right md:col-span-2">
                  {formatDateTime(o.createdAt)}
                </div>
              </div>
            ))}

          {!state.loading && recentOrders.length === 0 && (
            <div className="py-14 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.25em] italic">
              No orders yet — they appear here once customers buy your products
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-lg font-black text-gray-900 tracking-tight italic mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((a) => (
            <button
              key={a.label}
              onClick={() => navigate(a.path)}
              className="border border-gray-100 hover:border-emerald-300 hover:bg-emerald-50/40 rounded-xl py-3 px-2 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-emerald-700 transition-colors"
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
