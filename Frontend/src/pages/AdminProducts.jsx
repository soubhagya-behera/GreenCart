import { useEffect, useMemo, useState } from "react";
import { api, fileUrl, errorMessage } from "../lib/api";
import PageHeader from "../components/admin/PageHeader";
import AdminDataTable from "../components/admin/AdminDataTable";
import StatusBadge from "../components/admin/StatusBadge";
import { formatINR } from "../lib/orderStatuses";

export default function AdminProducts() {
  const [state, setState] = useState({ loading: true, error: null, products: [] });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState(null);
  const [sellerId, setSellerId] = useState(
    () => new URLSearchParams(window.location.search).get("seller")
  );

  const fetchData = () => {
    api("/admin/products", { auth: true })
      .then((data) =>
        setState({
          loading: false,
          error: null,
          products: Array.isArray(data) ? data : [],
        })
      )
      .catch((e) =>
        setState({ loading: false, error: errorMessage(e), products: [] })
      );
  };

  const refresh = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categories = useMemo(
    () => [...new Set(state.products.map((p) => p.category).filter(Boolean))].sort(),
    [state.products]
  );

  const filteredSeller = useMemo(() => {
    if (!sellerId) return null;
    return (
      state.products.find((p) => String(p.seller?.id ?? "") === String(sellerId))
        ?.seller || { id: sellerId, name: `#${sellerId}` }
    );
  }, [state.products, sellerId]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = state.products.filter((p) => {
      if (sellerId && String(p.seller?.id ?? "") !== String(sellerId)) return false;
      if (category !== "all" && p.category !== category) return false;
      if (statusFilter === "active" && p.active === false) return false;
      if (statusFilter === "inactive" && p.active !== false) return false;
      if (!q) return true;
      return [p.name, p.category, p.seller?.name, p.seller?.storeName]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
    switch (sort) {
      case "priceAsc":
        list = [...list].sort((a, b) => (a.offerPrice ?? a.price ?? 0) - (b.offerPrice ?? b.price ?? 0));
        break;
      case "priceDesc":
        list = [...list].sort((a, b) => (b.offerPrice ?? b.price ?? 0) - (a.offerPrice ?? a.price ?? 0));
        break;
      case "stockAsc":
        list = [...list].sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
        break;
      default:
        list = [...list].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return list;
  }, [state.products, search, category, statusFilter, sort, sellerId]);

  return (
    <>
      <PageHeader
        title="Products"
        subtitle={`${state.products.length} listings across the marketplace.`}
      />

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <input
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
          placeholder="Search by product, category or seller…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-emerald-400"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-emerald-400"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:border-emerald-400"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name">Sort: Name</option>
          <option value="priceAsc">Price ↑</option>
          <option value="priceDesc">Price ↓</option>
          <option value="stockAsc">Stock ↑</option>
        </select>
      </div>

      {filteredSeller && (
        <div className="mb-4 inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full pl-4 pr-2 py-1.5 text-[10px] font-black uppercase tracking-widest">
          Seller filter: {filteredSeller.storeName || filteredSeller.name || filteredSeller.id}
          <button
            onClick={() => setSellerId(null)}
            className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700"
            aria-label="Clear seller filter"
          >
            ×
          </button>
        </div>
      )}

      <AdminDataTable
        loading={state.loading}
        error={state.error}
        onRetry={refresh}
        rows={rows}
        emptyTitle="No products match"
        emptyMessage="Try adjusting the search, category or status filters."
        columns={[
          {
            key: "imageUrl",
            label: "",
            render: (p) => (
              <div className="w-11 h-11 rounded-xl bg-gray-50 overflow-hidden flex items-center justify-center">
                <img
                  src={p.imageUrl ? fileUrl(p.imageUrl) : "/placeholder.png"}
                  alt=""
                  className="w-full h-full object-contain p-1"
                />
              </div>
            ),
          },
          {
            key: "name",
            label: "Product",
            render: (p) => (
              <div className="text-xs max-w-[220px]">
                <p className="font-black text-gray-900 truncate">{p.name}</p>
                <p className="text-gray-400">{p.category || "-"}</p>
              </div>
            ),
          },
          {
            key: "price",
            label: "Price",
            render: (p) => (
              <div className="text-xs">
                <span className="font-black text-gray-900">
                  {formatINR(p.offerPrice ?? p.price)}
                </span>
                {p.offerPrice != null && p.price != null && (
                  <span className="ml-1.5 text-gray-300 line-through">
                    {formatINR(p.price)}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: "stock",
            label: "Stock",
            render: (p) => {
              const stock = Number(p.stock ?? 0);
              return (
                <span
                  className={`text-sm font-black ${
                    stock === 0
                      ? "text-red-500"
                      : stock <= 5
                      ? "text-orange-500"
                      : "text-gray-800"
                  }`}
                >
                  {stock}
                </span>
              );
            },
          },
          {
            key: "seller",
            label: "Seller",
            render: (p) => (
              <div className="text-xs">
                <p className="font-bold text-gray-700">
                  {p.seller?.storeName || p.seller?.name || "-"}
                </p>
                <p className="text-gray-400">{p.seller?.email || ""}</p>
              </div>
            ),
          },
          {
            key: "active",
            label: "Status",
            render: (p) => (
              <StatusBadge value={p.active === false ? "Inactive" : "Active"} />
            ),
          },
          {
            key: "actions",
            label: "Actions",
            align: "right",
            render: (p) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(p);
                }}
                className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 whitespace-nowrap"
              >
                View →
              </button>
            ),
          },
        ]}
      />

      {/* Moderation detail drawer */}
      {selected && (
        <div
          className="fixed inset-0 z-[210] flex justify-end"
          onClick={() => setSelected(null)}
        >
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
          <div
            className="relative bg-white w-full sm:max-w-md h-full shadow-2xl overflow-y-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-base font-black text-gray-900 tracking-tight italic">
                Listing Inspection
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-red-50 hover:text-red-500 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex items-center gap-4">
                <img
                  src={selected.imageUrl ? fileUrl(selected.imageUrl) : "/placeholder.png"}
                  alt=""
                  className="w-20 h-20 object-contain bg-white rounded-xl border border-gray-100 p-1"
                />
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900">{selected.name}</p>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">
                    #{selected.id} · {selected.category || "-"}
                  </p>
                  <StatusBadge
                    value={selected.active === false ? "Inactive" : "Active"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Price</p>
                  <span className="font-black text-gray-900">
                    {formatINR(selected.offerPrice ?? selected.price)}
                  </span>
                  {selected.offerPrice != null && selected.price != null && (
                    <span className="ml-1.5 text-gray-300 line-through">
                      {formatINR(selected.price)}
                    </span>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Stock</p>
                  <span
                    className={`font-black ${
                      Number(selected.stock ?? 0) === 0
                        ? "text-red-500"
                        : Number(selected.stock ?? 0) <= 5
                        ? "text-orange-500"
                        : "text-gray-800"
                    }`}
                  >
                    {selected.stock ?? 0}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Supplier</p>
                <div className="text-xs space-y-0.5 bg-white border border-gray-100 rounded-xl p-3">
                  <p className="font-black text-gray-800">
                    {selected.seller?.storeName || selected.seller?.name || "-"}
                  </p>
                  <p className="text-gray-500">{selected.seller?.email || "-"}</p>
                  <button
                    onClick={() => {
                      setSellerId(String(selected.seller?.id ?? ""));
                      setSelected(null);
                    }}
                    className="mt-2 text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700"
                  >
                    Filter table by this seller →
                  </button>
                </div>
              </div>

              {selected.description && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Description</p>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {selected.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Rating</p>
                  <span className="font-black text-gray-800">
                    ★ {Number(selected.averageRating ?? 0).toFixed(1)}
                  </span>
                  <span className="ml-1 text-gray-400">
                    ({selected.reviewCount ?? 0})
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Weight</p>
                  <span className="font-bold text-gray-700">{selected.weight || "—"}</span>
                </div>
              </div>

              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-relaxed italic">
                Listing moderation actions (approve / deactivate) will activate once the backend exposes a moderation endpoint.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
