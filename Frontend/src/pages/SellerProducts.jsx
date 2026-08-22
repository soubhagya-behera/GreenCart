import { useEffect, useMemo, useState } from "react";
import { api, apiForm, fileUrl, errorMessage } from "../lib/api";
import { categories } from "../assets/greencart/greencart_assets/assets";
import { useDialog } from "../components/common/DialogContext";
import { subscribeInventory } from "../lib/inventorySocket";
import {
  Panel,
  StatusPill,
  EmptyState,
  ErrorState,
  TableSkeleton,
  RefreshButton,
} from "../components/seller/ui";

const BLANK = () => ({
  name: "",
  category: categories[0]?.path || "Vegetables",
  price: "",
  offerPrice: "",
  stock: "",
  description: "",
  weight: "",
});

export default function SellerProducts() {
  const { alert, confirm, prompt } = useDialog();
  const [state, setState] = useState({
    loading: true,
    error: null,
    products: [],
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState("name");
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(
    () => window.location.hash === "#add-product"
  );
  const [form, setForm] = useState(BLANK);
  const [imageFiles, setImageFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const fetchData = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    api("/products/mine", { auth: true })
      .then((res) =>
        setState({
          loading: false,
          error: null,
          products: Array.isArray(res) ? res : [],
        })
      )
      .catch((e) =>
        setState({ loading: false, error: errorMessage(e), products: [] })
      );
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    return subscribeInventory(({ productId, stock }) => {
      setState((s) => ({
        ...s,
        products: s.products.map((x) =>
          x.id === productId ? { ...x, stock } : x
        ),
      }));
    });
  }, []);

  const categoryOptions = useMemo(
    () =>
      [...new Set(state.products.map((p) => p.category).filter(Boolean))].sort(),
    [state.products]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = state.products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (statusFilter === "active" && p.active === false) return false;
      if (statusFilter === "inactive" && p.active !== false) return false;
      if (!q) return true;
      return [p.name, p.category].some((v) =>
        (v || "").toLowerCase().includes(q)
      );
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
  }, [state.products, search, category, statusFilter, sort]);

  async function addProduct(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("category", form.category);
      fd.append("price", String(form.price));
      if (form.offerPrice) fd.append("offerPrice", String(form.offerPrice));
      if (form.description) fd.append("description", form.description);
      if (form.weight) fd.append("weight", form.weight);
      if (form.stock) fd.append("stock", String(form.stock));
      if (imageFiles.length > 0) fd.append("file", imageFiles[0]);

      await apiForm("/products", fd, { auth: true });
      setForm(BLANK());
      setImageFiles([]);
      setShowForm(false);
      fetchData();
      await alert({
        title: "Product Added",
        message: "Your listing is live in the marketplace.",
        type: "success",
      });
    } catch (e) {
      await alert({
        title: "Add Failed",
        message: e.message || "Failed to add product",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  function manageStock(p) {
    prompt({
      title: "Manage Stock",
      label: `Stock level for "${p.name}"`,
      initialValue: String(p.stock ?? 0),
      confirmText: "Update",
      cancelText: "Cancel",
      loadingText: "Updating...",
      validate: (val) => {
        const n = Number(val);
        if (isNaN(n) || n < 0) {
          return "Please enter a valid stock level (non-negative number).";
        }
        return null;
      },
      onConfirm: async (val) => {
        const r = await api(`/products/${p.id}/stock`, {
          method: "PUT",
          auth: true,
          body: { stock: Number(val) },
        });
        setState((s) => ({
          ...s,
          products: s.products.map((x) =>
            x.id === p.id ? { ...x, stock: r.stock } : x
          ),
        }));
      },
    });
  }

  async function removeProduct(p) {
    await confirm({
      title: "Remove Listing",
      message:
        "Remove this listing? Items already ordered keep their history — the product is deactivated instead of deleted when needed.",
      confirmText: "Remove",
      cancelText: "Cancel",
      danger: true,
      loadingText: "Removing...",
      onConfirm: async () => {
        await api(`/products/${p.id}`, { method: "DELETE", auth: true });
      },
    });
    fetchData();
  }

  const inputCls =
    "bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-emerald-400";

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            My Products
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            {state.products.length} listing{state.products.length === 1 ? "" : "s"} in your catalogue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton onClick={fetchData} />
          <button
            onClick={() => setShowForm((v) => !v)}
            className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors ${
              showForm
                ? "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            }`}
          >
            {showForm ? "Close Form" : "+ Add Product"}
          </button>
        </div>
      </div>

      <ErrorState error={state.error} onRetry={fetchData} />

      {/* Add product */}
      {showForm && (
        <form
          onSubmit={addProduct}
          id="add-product"
          className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-6 mb-6"
        >
          <h2 className="text-base font-black text-gray-900 tracking-tight italic mb-5">
            Create New Listing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Name</label>
              <input
                className={`mt-1.5 w-full ${inputCls}`}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Category</label>
              <select
                className={`mt-1.5 w-full ${inputCls}`}
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {categories.map((c) => (
                  <option key={c.path} value={c.path}>
                    {c.path}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Price (₹)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`mt-1.5 w-full ${inputCls}`}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Offer Price (₹, optional)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                className={`mt-1.5 w-full ${inputCls}`}
                value={form.offerPrice}
                onChange={(e) => setForm({ ...form, offerPrice: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Stock Quantity</label>
              <input
                type="number"
                min="0"
                className={`mt-1.5 w-full ${inputCls}`}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Weight / Measurement
              </label>
              <input
                className={`mt-1.5 w-full ${inputCls}`}
                placeholder="500g, 1kg, Pack of 6"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description</label>
              <textarea
                rows="3"
                className={`mt-1.5 w-full ${inputCls}`}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Image</label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="mt-1.5 w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-xs file:font-bold cursor-pointer"
                onChange={(e) => setImageFiles(Array.from(e.target.files || []))}
              />
              {imageFiles.length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  {imageFiles.slice(0, 4).map((f, i) => (
                    <div
                      key={i}
                      className="w-14 h-14 rounded-xl border border-gray-200 overflow-hidden bg-gray-50"
                    >
                      <img
                        src={URL.createObjectURL(f)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-gray-50">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setForm(BLANK());
                  setImageFiles([]);
                }}
                className="text-[10px] font-black uppercase tracking-widest text-gray-500 border border-gray-200 rounded-xl px-5 py-2.5 hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="bg-gradient-to-r from-emerald-600 to-green-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
              >
                {saving ? "Publishing…" : "Publish Listing"}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <input
          className={`flex-1 ${inputCls}`}
          placeholder="Search by product or category…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={`${inputCls} font-bold`}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {categoryOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className={`${inputCls} font-bold`}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          className={`${inputCls} font-bold`}
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          <option value="name">Sort: Name</option>
          <option value="priceAsc">Price ↑</option>
          <option value="priceDesc">Price ↓</option>
          <option value="stockAsc">Stock ↑</option>
        </select>
      </div>

      {/* Management table */}
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[720px]">
            <thead>
              <tr className="bg-gray-50/80">
                {["Product", "Category", "Price", "Stock", "Status", "Actions"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap ${
                        h === "Price" || h === "Stock" ? "text-right" : ""
                      } ${i === 5 ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            {state.loading && <TableSkeleton rows={6} cols={6} />}

            {!state.loading && rows.length === 0 && (
              <tbody>
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon="📦"
                      title={state.products.length === 0 ? "No listings yet" : "No products match"}
                      message={
                        state.products.length === 0
                          ? "Publish your first product with the “+ Add Product” button."
                          : "Try adjusting the search, category or status filters."
                      }
                    />
                  </td>
                </tr>
              </tbody>
            )}

            {!state.loading &&
              rows.map((p) => {
                const stock = Number(p.stock ?? 0);
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-emerald-50/40 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3 min-w-0 max-w-[240px]">
                        <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                          <img
                            src={p.imageUrl ? fileUrl(p.imageUrl) : "/placeholder.png"}
                            alt=""
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-gray-900 truncate">{p.name}</p>
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-300 mt-0.5">
                            #{p.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-bold text-gray-500">{p.category || "-"}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <span className="text-xs font-black text-gray-900">
                        ₹{(p.offerPrice ?? p.price ?? 0).toLocaleString("en-IN")}
                      </span>
                      {p.offerPrice != null && p.price != null && (
                        <span className="ml-1.5 text-[10px] text-gray-300 line-through">
                          ₹{p.price.toLocaleString("en-IN")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={`text-sm font-black tabular-nums ${
                          stock === 0
                            ? "text-red-500"
                            : stock <= 5
                            ? "text-orange-500"
                            : "text-gray-800"
                        }`}
                      >
                        {stock}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill value={p.active === false ? "Inactive" : "Active"} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        <button
                          onClick={() => manageStock(p)}
                          className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors"
                        >
                          Stock
                        </button>
                        <button
                          onClick={() => setSelected(p)}
                          className="text-[9px] font-black uppercase tracking-widest text-gray-600 bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg hover:border-emerald-300 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => removeProduct(p)}
                          className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </table>
        </div>
      </Panel>

      {/* View drawer */}
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
                Listing Details
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
                  <div className="mt-1.5">
                    <StatusPill value={selected.active === false ? "Inactive" : "Active"} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Price</p>
                  <span className="font-black text-gray-900">
                    ₹{(selected.offerPrice ?? selected.price ?? 0).toLocaleString("en-IN")}
                  </span>
                  {selected.offerPrice != null && selected.price != null && (
                    <span className="ml-1.5 text-gray-300 line-through text-xs">
                      ₹{selected.price.toLocaleString("en-IN")}
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

              {selected.description && (
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Description</p>
                  <p className="text-xs text-gray-600 leading-relaxed">{selected.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Rating</p>
                  <span className="font-black text-gray-800">
                    ★ {Number(selected.averageRating ?? 0).toFixed(1)}
                  </span>
                  <span className="ml-1 text-gray-400 text-xs">
                    ({selected.reviewCount ?? 0})
                  </span>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Storefront</p>
                  <span className="font-bold text-gray-700 text-xs">
                    {selected.active === false ? "Hidden from store" : "Visible in store"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  manageStock(selected);
                  setSelected(null);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-colors"
              >
                Manage Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
