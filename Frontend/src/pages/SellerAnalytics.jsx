import { useEffect, useState } from "react";
import { api, fileUrl, errorMessage } from "../lib/api";
import { formatINR } from "../lib/orderStatuses";
import SellerKpiCard from "../components/seller/SellerKpiCard";

export default function SellerAnalytics() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    analytics: null,
  });

  const fetchData = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    api("/seller/analytics", { auth: true })
      .then((data) => setState({ loading: false, error: null, analytics: data || {} }))
      .catch((e) => setState({ loading: false, error: errorMessage(e), analytics: null }));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const a = state.analytics;
  const completionRate =
    a?.totalOrders > 0
      ? Math.round(((a.completedOrders ?? 0) / a.totalOrders) * 100)
      : 0;

  if (state.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-3xl border border-gray-100 p-6 h-36 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="bg-white border border-red-100 rounded-2xl p-8 text-center">
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
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-emerald-600 font-black uppercase tracking-widest text-xs">
            My Store Performance
          </p>
          <h2 className="text-4xl font-black text-gray-900 tracking-tighter mt-1">
            Analytics
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Computed only from orders containing your products.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="bg-white border border-gray-200 hover:border-emerald-400 text-gray-600 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <SellerKpiCard
          label="Revenue"
          value={formatINR(a?.totalRevenue)}
          hint="Paid · your items only"
          icon="₹"
          tone="gray"
        />
        <SellerKpiCard
          label="Orders"
          value={a?.totalOrders ?? 0}
          hint="Containing your products"
          icon="🧾"
          tone="emerald"
        />
        <SellerKpiCard
          label="Pending"
          value={a?.pendingOrders ?? 0}
          hint={`${a?.completedOrders ?? 0} delivered`}
          icon="⏳"
          tone="orange"
        />
        <SellerKpiCard
          label="Active Products"
          value={a?.activeProducts ?? 0}
          hint={`${completionRate}% fulfilment rate`}
          icon="📦"
          tone="indigo"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="text-lg font-black text-gray-900 tracking-tight italic">
            Top Products by Revenue
          </h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Paid orders · your listings only
          </p>
        </div>

        <ul className="divide-y divide-gray-50">
          {(a?.topProducts || []).map((p, i) => {
            const max = Math.max(
              ...(a.topProducts || []).map((x) => x.revenue || 0),
              1
            );
            return (
              <li key={p.productId} className="flex items-center gap-4 px-6 py-4">
                <span className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-black flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                  <img
                    src={p.imageUrl ? fileUrl(p.imageUrl) : "/placeholder.png"}
                    alt=""
                    className="w-full h-full object-contain p-0.5"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-800 truncate">
                    {p.productName || `Product #${p.productId}`}
                  </p>
                  <div className="mt-1.5 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-500"
                      style={{ width: `${Math.max(6, ((p.revenue || 0) / max) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black text-gray-900">
                    {formatINR(p.revenue)}
                  </p>
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">
                    {p.qtySold} sold
                  </p>
                </div>
              </li>
            );
          })}
          {(a?.topProducts || []).length === 0 && (
            <li className="py-14 text-center text-[10px] font-black text-gray-300 uppercase tracking-[0.25em] italic">
              No paid sales yet — top products appear after your first sale
            </li>
          )}
        </ul>
      </div>
    </>
  );
}
