import { useEffect, useState } from "react";
import { api } from "../lib/api";
import ProductCard from "../components/ProductCard";
import { subscribeInventory } from "../lib/inventorySocket";

export default function Category({ name = "Vegetables", onAdd, searchQuery = "" }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    api("/products")
      .then((res) => {
        const arr = Array.isArray(res) ? res : (res.products || []);
        setItems(arr);
      })
      .catch(() => {
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [name]);

  useEffect(() => {
    return subscribeInventory(({ productId, stock }) => {
      setItems((arr) =>
        arr.map((x) =>
          x.id === productId ? { ...x, stock } : x
        )
      );
    });
  }, []);

  const q = searchQuery.trim().toLowerCase();

  const list = items
  .filter(
    (p) =>
      p.category?.toLowerCase() ===
      name?.toLowerCase()
  )
    .filter((p) =>
      q
        ? (p.name || "").toLowerCase().includes(q)
        : true
    );

  const prettyName =
    name === "Grains"
      ? "Cereals & Pulses"
      : name;

  if (loading) {
    return (
      <section className="bg-white py-6 md:py-10">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="h-9 w-56 skeleton rounded-xl mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
                <div className="aspect-square skeleton rounded-none" />
                <div className="p-3.5 space-y-2">
                  <div className="h-2.5 skeleton rounded-full w-1/2" />
                  <div className="h-3 skeleton rounded-full w-3/4" />
                  <div className="h-8 skeleton rounded-lg mt-3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-6 md:py-10">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-7 gap-3 animate-fade-in">
          <div>
            <span className="label-pill">Category</span>

            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-3 tracking-tight">
              {prettyName}
            </h1>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100 self-start">
            <span className="text-[11px] font-bold text-gray-500 tabular-nums">
              {list.length} product{list.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
          {list.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              onAdd={onAdd}
            />
          ))}
        </div>

        {list.length === 0 && (
          <div className="text-center py-24 animate-fade-in">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl text-gray-300 mb-4">
              🧺
            </div>
            <p className="text-sm font-bold text-gray-700 mb-1">Nothing here yet</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              No products in this category right now. Check back soon.
            </p>
            <a href="#/" className="btn-primary mt-6">
              Back to Home
            </a>
          </div>
        )}
      </div>
    </section>
  );
}