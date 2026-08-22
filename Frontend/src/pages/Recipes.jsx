import { useEffect, useState } from "react";
import { api, fileUrl } from "../lib/api";

export default function Recipes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/recipes")
      .then((res) => setItems(res.recipes || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <span className="label-pill">Culinary Collection</span>
            <h1 className="mt-3 text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
              Recipes
            </h1>
            <p className="mt-2 text-sm font-medium text-gray-500 max-w-md">
              Cook with ingredients you can order directly from GreenCart.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-full px-4 py-2 self-start shadow-sm">
            <span className="text-[11px] font-bold text-gray-500 tabular-nums">
              {items.length} recipe{items.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Recipes Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <a
              key={r.id}
              href={`#/recipe/${r.id}`}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-emerald-100"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={fileUrl(r.imageUrl)}
                  alt={r.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/10" />

                {r.serves ? (
                  <div className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-widest text-gray-700 shadow-sm backdrop-blur-sm">
                    Serves {r.serves}
                  </div>
                ) : null}
              </div>

              <div className="flex flex-1 flex-col p-4.5 p-5">
                <h3 className="mb-1.5 truncate text-base font-bold tracking-tight text-gray-900 transition-colors group-hover:text-emerald-700">
                  {r.name}
                </h3>
                <p className="mb-4 line-clamp-2 leading-relaxed text-gray-400 text-xs">
                  {r.instructions || "Tap to see the full recipe and ingredients."}
                </p>

                <div className="mt-auto flex items-center justify-between border-t border-gray-50 pt-3.5">
                  <span className="text-[11px] font-bold text-emerald-700 group-hover:text-emerald-800 transition-colors inline-flex items-center gap-1.5">
                    View recipe
                    <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </span>
                  {r.prepTime || r.cookTime ? (
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest tabular-nums">
                      {[r.prepTime, r.cookTime].filter(Boolean).join(" + ")}
                    </span>
                  ) : null}
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
              <svg className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-base font-bold text-gray-700">No recipes yet</h2>
            <p className="mt-1 text-sm text-gray-400">Check back soon — new recipes are on the way.</p>
          </div>
        )}
      </div>
    </section>
  );
}