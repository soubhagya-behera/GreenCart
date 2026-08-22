import { useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { navigate } from "../lib/router";
import { formatINR } from "../lib/orderStatuses";
import PageHeader from "../components/admin/PageHeader";
import AdminKpiCard from "../components/admin/AdminKpiCard";
import AdminDataTable from "../components/admin/AdminDataTable";
import StatusBadge from "../components/admin/StatusBadge";

export default function AdminDashboard() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    analytics: null,
    users: [],
    products: [],
    orders: [],
  });

  const fetchData = () => {
    Promise.allSettled([
      api("/admin/analytics", { auth: true }),
      api("/admin/users", { auth: true }),
      api("/admin/products", { auth: true }),
      api("/admin/orders", { auth: true }),
    ]).then(([a, u, p, o]) => {
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
        users: Array.isArray(u.value) ? u.value : [],
        products: Array.isArray(p.value) ? p.value : [],
        orders: Array.isArray(o.value) ? o.value : [],
      });
    });
  };

  const refresh = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const { analytics, users, products, orders } = state;
  const sellers = users.filter((u) => u.role === "seller");
  const activeProducts = products.filter((p) => p.active !== false);
  const lowStock = activeProducts.filter(
    (p) => Number(p.stock ?? 0) <= 5
  );
  const unverified = users.filter((u) => !u.verified);
  const openOrders = orders.filter(
    (o) => !["Delivered", "Cancelled"].includes(o.orderStatus)
  );
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6);

  const health = [
    {
      label: "Active Listings",
      value: `${activeProducts.length} / ${products.length}`,
      tone: "text-emerald-600",
    },
    {
      label: "Low Stock Alerts",
      value: lowStock.length,
      tone: lowStock.length ? "text-orange-500" : "text-gray-400",
    },
    {
      label: "Awaiting Fulfilment",
      value: openOrders.length,
      tone: "text-blue-600",
    },
    {
      label: "Unverified Accounts",
      value: unverified.length,
      tone: unverified.length ? "text-red-500" : "text-gray-400",
    },
  ];

  const quickActions = [
    { label: "Manage Users", path: "/admin/users" },
    { label: "Manage Sellers", path: "/admin/sellers" },
    { label: "Review Products", path: "/admin/products" },
    { label: "Review Orders", path: "/admin/orders" },
    { label: "Analytics", path: "/admin/analytics" },
    { label: "Coupons", path: "/admin/coupons" },
  ];

  return (
    <>
      <PageHeader
        title="Platform Overview"
        subtitle="Live marketplace figures across users, sellers, products and orders."
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
        <div className="bg-white border border-red-100 rounded-2xl p-8 text-center mb-6">
          <p className="text-sm font-black text-red-500 uppercase tracking-widest">
            {state.error}
          </p>
          <button
            onClick={refresh}
            className="mt-4 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <AdminKpiCard
          label="Total Revenue"
          value={formatINR(analytics?.totalRevenue)}
          hint="Paid orders only · INR"
          icon="₹"
          accent="gray"
        />
        <AdminKpiCard
          label="Total Orders"
          value={analytics?.totalOrders ?? orders.length}
          hint="All time"
          icon="🧾"
          accent="blue"
        />
        <AdminKpiCard
          label="Total Users"
          value={analytics?.totalUsers ?? users.length}
          hint={`${sellers.length} sellers · ${users.length - sellers.length} others`}
          icon="👥"
          accent="emerald"
        />
        <AdminKpiCard
          label="Total Products"
          value={analytics?.totalProducts ?? products.length}
          hint={`${activeProducts.length} active`}
          icon="📦"
          accent="orange"
        />
        <AdminKpiCard
          label="Total Sellers"
          value={sellers.length}
          hint="Marketplace vendors"
          icon="🏪"
          accent="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900 tracking-tight italic">
              Recent Orders
            </h2>
            <button
              onClick={() => navigate("/admin/orders")}
              className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
            >
              View all →
            </button>
          </div>
          <AdminDataTable
            loading={state.loading}
            rows={recentOrders}
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
            ]}
            emptyTitle="No orders yet"
            emptyMessage="Orders placed by customers will show up here."
          />
        </div>

        {/* Health + quick actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-black text-gray-900 tracking-tight italic mb-4">
              Marketplace Health
            </h2>
            <ul className="space-y-3.5">
              {health.map((h) => (
                <li key={h.label} className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">{h.label}</span>
                  <span className={`text-lg font-black ${h.tone}`}>{h.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-950 rounded-2xl p-6 text-white shadow-sm">
            <h2 className="text-lg font-black tracking-tight italic mb-1">
              Quick Actions
            </h2>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-4">
              Jump into administration tasks
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              {quickActions.map((a) => (
                <button
                  key={a.path}
                  onClick={() => navigate(a.path)}
                  className="bg-white/5 hover:bg-emerald-500/20 border border-white/10 hover:border-emerald-500/40 rounded-xl py-3 px-2 text-[10px] font-black uppercase tracking-widest text-gray-200 hover:text-emerald-300 transition-colors"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
