import { useEffect, useState } from "react";
import { api } from "../lib/api";
import ProductCard from "./ProductCard";
import { subscribeInventory } from "../lib/inventorySocket";

export default function ProductGrid({ onAdd, searchQuery = "" }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/products")
      .then((res) => {
        const arr = Array.isArray(res)
          ? res
          : (res.products || []);

        setList(arr);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    return subscribeInventory(({ productId, stock }) => {
      setList((arr) =>
        arr.map((x) =>
          x.id === productId ? { ...x, stock } : x
        )
      );
    });
  }, []);

  const q = searchQuery.trim().toLowerCase();
  const searching = q.length > 0;
  const products = searching
    ? list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q)
      )
    : list.slice(0, 12);

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex items-end justify-between mb-7 gap-4">
          <div>
            <span className="label-pill">Fresh Picks</span>
            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mt-3 tracking-tight">
              Bestsellers
            </h2>
          </div>
          <a
            href="#/all-products"
            className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1.5 shrink-0"
          >
            View all
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-5">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden bg-white">
                <div className="aspect-square skeleton rounded-none" />
                <div className="p-3.5 space-y-2">
                  <div className="h-2.5 skeleton rounded-full w-1/2" />
                  <div className="h-3 skeleton rounded-full w-3/4" />
                  <div className="h-8 skeleton rounded-lg mt-3" />
                </div>
              </div>
            ))}

          {!loading &&
            products.map((p) => (
              <ProductCard key={p.id} p={p} onAdd={onAdd} />
            ))}
        </div>

        {!loading && searching && products.length === 0 && (
          <p className="py-16 text-center text-sm font-semibold text-gray-400">
            No bestsellers match “{searchQuery}”.
          </p>
        )}
      </div>
    </section>
  );
}
