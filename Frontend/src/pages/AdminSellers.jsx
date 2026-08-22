import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../lib/api";
import { navigate } from "../lib/router";
import PageHeader from "../components/admin/PageHeader";
import AdminDataTable from "../components/admin/AdminDataTable";
import { formatINR } from "../lib/orderStatuses";

export default function AdminSellers() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    sellers: [],
    products: [],
    orders: [],
  });

  const fetchData = () => {
    Promise.allSettled([
      api("/admin/users?role=seller", { auth: true }),
      api("/admin/products", { auth: true }),
      api("/admin/orders", { auth: true }),
    ]).then(([s, p, o]) => {
      if (s.status === "rejected") {
        setState({
          loading: false,
          error: errorMessage(s.reason),
          sellers: [],
          products: [],
          orders: [],
        });
        return;
      }
      setState({
        loading: false,
        error: null,
        sellers: Array.isArray(s.value) ? s.value : [],
        products: Array.isArray(p.value) ? p.value : [],
        orders: o.status === "fulfilled" && Array.isArray(o.value) ? o.value : [],
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

  const rows = useMemo(
    () =>
      state.sellers.map((seller) => {
        const own = state.products.filter((p) => p.seller?.id === seller.id);

        let orderCount = 0;
        let revenue = 0;
        for (const order of state.orders) {
          const items =
            (order.items || []).filter(
              (it) => String(it.sellerId ?? "") === String(seller.id)
            ) || [];
          if (items.length === 0) continue;
          orderCount++;
          if (order.paymentStatus === "Paid") {
            for (const it of items) {
              revenue += (it.price ?? 0) * (it.qty ?? 0);
            }
          }
        }

        return {
          ...seller,
          productCount: own.length,
          activeCount: own.filter((p) => p.active !== false).length,
          orderCount,
          revenue: Math.round(revenue * 100) / 100,
        };
      }),
    [state.sellers, state.products, state.orders]
  );

  return (
    <>
      <PageHeader
        title="Sellers"
        subtitle={`${state.sellers.length} vendor accounts with storefront listings.`}
        actions={
          <button
            onClick={refresh}
            className="bg-white border border-gray-200 hover:border-emerald-300 text-gray-600 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
          >
            Refresh
          </button>
        }
      />

      <AdminDataTable
        loading={state.loading}
        error={state.error}
        onRetry={refresh}
        rows={rows}
        emptyTitle="No sellers yet"
        emptyMessage="Accounts registered as sellers will appear here."
        columns={[
          {
            key: "name",
            label: "Seller",
            render: (s) => (
              <div className="text-xs">
                <p className="font-black text-gray-900">{s.name || "-"}</p>
                <p className="text-gray-400">{s.email}</p>
              </div>
            ),
          },
          {
            key: "storeName",
            label: "Store",
            render: (s) =>
              s.storeName ? (
                <span className="text-xs font-bold text-emerald-700">{s.storeName}</span>
              ) : (
                <span className="text-xs text-gray-300 italic">No store name</span>
              ),
          },
          {
            key: "verified",
            label: "Status",
            render: (s) =>
              s.verified ? (
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                  Active
                </span>
              ) : (
                <span className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                  Unverified
                </span>
              ),
          },
          {
            key: "productCount",
            label: "Products",
            align: "right",
            render: (s) => (
              <div>
                <span className="text-sm font-black text-gray-900">{s.productCount}</span>
                <span className="block text-[9px] font-black uppercase tracking-widest text-gray-300">
                  {s.activeCount} active
                </span>
              </div>
            ),
          },
          {
            key: "orderCount",
            label: "Orders",
            align: "right",
            render: (s) => (
              <span className="text-sm font-black text-gray-900">{s.orderCount}</span>
            ),
          },
          {
            key: "revenue",
            label: "Revenue",
            align: "right",
            render: (s) => (
              <span className="text-xs font-black text-emerald-700">
                {formatINR(s.revenue)}
              </span>
            ),
          },
          {
            key: "actions",
            label: "",
            align: "right",
            render: (s) => (
              <button
                onClick={() => navigate(`/admin/products?seller=${s.id}`)}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 whitespace-nowrap"
              >
                View products →
              </button>
            ),
          },
        ]}
      />
    </>
  );
}
