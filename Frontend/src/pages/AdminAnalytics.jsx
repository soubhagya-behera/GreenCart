import { useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import PageHeader from "../components/admin/PageHeader";
import AdminKpiCard from "../components/admin/AdminKpiCard";
import { formatINR } from "../lib/orderStatuses";

function DistributionBar({ title, segments }) {
  // segments: [{ label, count, className }]
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h3 className="text-sm font-black text-gray-900 tracking-tight italic mb-4">
        {title}
      </h3>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-4">
        {total > 0 &&
          segments.map((s) =>
            s.count > 0 ? (
              <div
                key={s.label}
                className={s.className}
                style={{ width: `${(s.count / total) * 100}%` }}
              />
            ) : null
          )}
      </div>
      <ul className="space-y-2">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-gray-500 font-bold">
              <span className={`w-2.5 h-2.5 rounded-sm ${s.className}`} />
              {s.label}
            </span>
            <span className="font-black text-gray-800">
              {s.count}
              <span className="text-gray-300 font-bold ml-1">
                ({total ? Math.round((s.count / total) * 100) : 0}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminAnalytics() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    analytics: null,
    orders: [],
    users: [],
    products: [],
  });

  const fetchData = () => {
    Promise.allSettled([
      api("/admin/analytics", { auth: true }),
      api("/admin/orders", { auth: true }),
      api("/admin/users", { auth: true }),
      api("/admin/products", { auth: true }),
    ]).then(([a, o, u, p]) => {
      if (a.status === "rejected") {
        setState((s) => ({ ...s, loading: false, error: errorMessage(a.reason) }));
        return;
      }
      setState({
        loading: false,
        error: null,
        analytics: a.value || {},
        orders: Array.isArray(o.value) ? o.value : [],
        users: Array.isArray(u.value) ? u.value : [],
        products: Array.isArray(p.value) ? p.value : [],
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

  const { analytics, orders, users, products } = state;
  const paidOrders = orders.filter((o) => o.paymentStatus === "Paid");
  const pendingPay = orders.filter(
    (o) => o.paymentStatus && o.paymentStatus !== "Paid"
  ).length;
  const delivered = orders.filter((o) => o.orderStatus === "Delivered").length;
  const cancelled = orders.filter((o) => o.orderStatus === "Cancelled").length;
  const inProgress = orders.length - delivered - cancelled;
  const sellers = users.filter((u) => u.role === "seller").length;
  const activeProducts = products.filter((p) => p.active !== false).length;
  const avgOrderValue =
    paidOrders.length > 0 ? (analytics?.totalRevenue ?? 0) / paidOrders.length : 0;

  if (state.loading) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="Platform-wide performance summary." />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-5 h-28 animate-pulse"
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle="Platform-wide performance from real marketplace data."
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <AdminKpiCard
          label="Platform Revenue"
          value={formatINR(analytics?.totalRevenue)}
          hint="Sum of paid order totals · INR"
          icon="₹"
          accent="gray"
        />
        <AdminKpiCard
          label="Total Orders"
          value={analytics?.totalOrders ?? orders.length}
          hint={`${paidOrders.length} paid · ${pendingPay} awaiting payment`}
          icon="🧾"
          accent="blue"
        />
        <AdminKpiCard
          label="Avg Paid Order"
          value={formatINR(avgOrderValue)}
          hint="Revenue ÷ paid orders"
          icon="📊"
          accent="emerald"
        />
        <AdminKpiCard
          label="Users / Sellers"
          value={`${analytics?.totalUsers ?? users.length} / ${sellers}`}
          hint="Registered accounts"
          icon="👥"
          accent="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <DistributionBar
          title="Payment Status Split"
          segments={[
            { label: "Paid", count: paidOrders.length, className: "bg-emerald-500" },
            { label: "Awaiting payment", count: pendingPay, className: "bg-amber-400" },
          ]}
        />
        <DistributionBar
          title="Fulfilment Progress"
          segments={[
            { label: "Delivered", count: delivered, className: "bg-emerald-500" },
            { label: "In progress", count: Math.max(inProgress, 0), className: "bg-blue-500" },
            { label: "Cancelled", count: cancelled, className: "bg-red-400" },
          ]}
        />
        <DistributionBar
          title="Catalog Composition"
          segments={[
            { label: "Active listings", count: activeProducts, className: "bg-emerald-500" },
            {
              label: "Deactivated",
              count: products.length - activeProducts,
              className: "bg-gray-400",
            },
          ]}
        />
        <DistributionBar
          title="Account Mix"
          segments={[
            { label: "Sellers", count: sellers, className: "bg-emerald-500" },
            {
              label: "Customers & other roles",
              count: (analytics?.totalUsers ?? users.length) - sellers,
              className: "bg-indigo-400",
            },
          ]}
        />
      </div>

      <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">
        Historical time-series charts will be added once the backend exposes
        date-range reporting.
      </p>
    </>
  );
}
