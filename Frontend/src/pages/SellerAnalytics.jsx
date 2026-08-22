import { useEffect, useState } from "react";
import { api, fileUrl, errorMessage } from "../lib/api";
import { formatINR } from "../lib/orderStatuses";
import SellerKpiCard from "../components/seller/SellerKpiCard";
import {
  Panel,
  EmptyState,
  ErrorState,
  MiniBar,
  RefreshButton,
} from "../components/seller/ui";

export default function SellerAnalytics() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    analytics: null,
  });

  const fetchData = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    api("/seller/analytics", { auth: true })
      .then((data) =>
        setState({ loading: false, error: null, analytics: data || {} })
      )
      .catch((e) =>
        setState({ loading: false, error: errorMessage(e), analytics: null })
      );
  };

  useEffect(() => {
    fetchData();
  }, []);

  const a = state.analytics;
  const totalOrders = a?.totalOrders ?? 0;
  const completed = a?.completedOrders ?? 0;
  const pending = a?.pendingOrders ?? 0;
  const completionRate =
    totalOrders > 0 ? Math.round((completed / totalOrders) * 100) : 0;
  const topProducts = a?.topProducts || [];
  const maxRevenue = Math.max(...topProducts.map((t) => t.revenue || 0), 1);

  if (state.loading) {
    return (
      <>
        <div className="h-10 w-56 bg-gray-100 rounded-xl animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-5 h-28 animate-pulse"
            />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-6 h-64 animate-pulse" />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Store performance — computed only from orders containing your products.
          </p>
        </div>
        <RefreshButton onClick={fetchData} />
      </div>

      <ErrorState error={state.error} onRetry={fetchData} />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <SellerKpiCard
          label="Revenue"
          value={formatINR(a?.totalRevenue)}
          hint="Paid · your items only"
          icon="₹"
          accent="gray"
        />
        <SellerKpiCard
          label="Order Count"
          value={totalOrders}
          hint="All time"
          icon="🧾"
          accent="emerald"
        />
        <SellerKpiCard
          label="Pending Orders"
          value={pending}
          hint={`${completed} delivered`}
          icon="⏳"
          accent="orange"
        />
        <SellerKpiCard
          label="Active Products"
          value={a?.activeProducts ?? 0}
          hint={`${completionRate}% fulfilment rate`}
          icon="📦"
          accent="violet"
        />
      </div>

      {/* Fulfilment progress */}
      <Panel
        title="Fulfilment Progress"
        subtitle="Your order lifecycle · all time"
        className="mb-6"
      >
        <div className="px-6 py-5">
          <div className="flex h-3 rounded-full overflow-hidden bg-gray-100 mb-4">
            {totalOrders > 0 && completed > 0 && (
              <div
                className="bg-emerald-500"
                style={{ width: `${(completed / totalOrders) * 100}%` }}
              />
            )}
            {totalOrders > 0 && pending > 0 && (
              <div
                className="bg-blue-500"
                style={{ width: `${(pending / totalOrders) * 100}%` }}
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-500 font-bold">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                Delivered
              </span>
              <span className="font-black text-gray-800 tabular-nums">
                {completed}
                <span className="text-gray-300 font-bold ml-1">
                  ({totalOrders ? Math.round((completed / totalOrders) * 100) : 0}%)
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-gray-500 font-bold">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                In fulfilment
              </span>
              <span className="font-black text-gray-800 tabular-nums">
                {pending}
                <span className="text-gray-300 font-bold ml-1">
                  ({totalOrders ? Math.round((pending / totalOrders) * 100) : 0}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Top products */}
      <Panel
        title="Top Products"
        subtitle="Ranked by revenue from paid orders"
      >
        {topProducts.length === 0 ? (
          <EmptyState
            icon="📈"
            title="No paid sales yet"
            message="Once customers purchase your products, your best sellers will be ranked here."
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
                {topProducts.map((t) => (
                  <tr key={t.productId} className="hover:bg-emerald-50/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0">
                          <img
                            src={
                              t.imageUrl ? fileUrl(t.imageUrl) : "/placeholder.png"
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="mt-5 text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">
        All figures are store-level metrics from your own catalogue and orders.
      </p>
    </>
  );
}
