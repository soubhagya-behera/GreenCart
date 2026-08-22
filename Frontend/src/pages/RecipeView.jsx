import { useEffect, useState } from "react";
import { api, fileUrl, getToken } from "../lib/api";

export default function RecipeView({ id, onRefreshCart, showToast }) {
  const [r, setR] = useState(null);
  const [serves, setServes] = useState(1);
  const [selected, setSelected] = useState({});
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  function normName(x) {
    const s = String(x || "").toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
    return s.endsWith("s") && s.length > 3 ? s.slice(0, -1) : s;
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([api(`/recipes/${id}`), api("/products")])
      .then(([res, p]) => {
        setR(res.recipe);
        setProducts(p.products || []);
        
        const map = new Map((p.products || []).map(pr => [normName(pr.name), pr]));
        const sel = {};
        (res.recipe.ingredients || []).forEach(i => {
          const pid = i.productId || map.get(normName(i.name))?.id;
          if (pid) sel[pid] = true;
        });
        setSelected(sel);
        setServes(res.recipe.serves || 1);
      })
      .catch(() => { setR(null); setProducts([]); })
      .finally(() => setLoading(false));
  }, [id]);

  const toggleIngredient = (pid) => setSelected(prev => ({ ...prev, [pid]: !prev[pid] }));

  async function addSelected() {
    if (!getToken()) { window.location.hash = "#/auth"; return; }
    const toAdd = Object.entries(selected).filter(([_, checked]) => checked);
    if (toAdd.length === 0) { showToast("Please select at least one ingredient"); return; }

    try {
      for (const [pid, _] of toAdd) {
        await api("/cart/add", { method: "POST", body: { productId: pid, quantity: 1 }, auth: true });
      }
      onRefreshCart?.();
      showToast("Ingredients added to your cart!");
    } catch (e) { showToast(e.message || "Failed to add products"); }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-pulse space-y-4 w-full max-w-2xl px-4"><div className="h-64 bg-gray-100 rounded-[3rem]"></div></div></div>;
  if (!r) return <div className="p-20 text-center font-bold text-gray-400">Recipe not found</div>;

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="bg-white min-h-screen">
      <div className="relative h-[42vh] min-h-[280px] sm:h-[52vh] overflow-hidden">
        <img src={fileUrl(r.imageUrl)} alt={r.name} className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-white via-white/80 to-transparent"></div>

        {/* Title block anchored to the bottom of the photo */}
        <div className="absolute inset-x-0 bottom-6 sm:bottom-10 px-4 text-center">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            {r.name}
          </h1>
          <div className="flex flex-wrap justify-center gap-2.5">
            <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 text-xs font-bold text-gray-700 shadow-sm border border-gray-100">
              🍽 Serves {serves}
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 text-xs font-bold text-gray-700 shadow-sm border border-gray-100">
              🥬 {r.ingredients.length} ingredients
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 py-10 md:py-14">
        <div className="lg:col-span-7 space-y-10">
          <section>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Ingredients
              </h2>
              <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold tabular-nums">
                {selectedCount} selected
              </span>
            </div>

            <div className="grid gap-2.5">
              {r.ingredients.map((ing, idx) => {
                const pid = ing.productId || products.find(pr => normName(pr.name).includes(normName(ing.name)))?.id;
                const prod = products.find(pr => pr.id === pid);
                const available = !!prod && (prod.stock ?? 0) > 0;
                const isSelected = !!selected[pid];

                return (
                  <div key={idx} onClick={() => available && toggleIngredient(pid)} className={`flex items-center justify-between p-3.5 rounded-xl border transition-colors cursor-pointer ${!available ? 'opacity-40 grayscale cursor-not-allowed' : isSelected ? 'border-emerald-500 bg-emerald-50' : 'border-gray-100 hover:border-emerald-300 bg-white'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-emerald-600 text-white' : 'bg-white border-2 border-gray-200'}`}>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" clipRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>
                      </div>
                      <h4 className="font-bold text-sm text-gray-900 truncate">{ing.name}</h4>
                    </div>
                    {!available && (
                      <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 shrink-0 ml-3">
                        Unavailable
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="sticky bottom-4 z-40 mt-8">
              <button
                onClick={addSelected}
                disabled={selectedCount === 0}
                aria-live="polite"
                className={`w-full py-4 rounded-2xl font-extrabold text-sm tracking-wide shadow-lg transition-colors ${selectedCount === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800'}`}
              >
                {selectedCount === 0
                  ? "Select ingredients to add"
                  : `Add ${selectedCount} ingredient${selectedCount === 1 ? "" : "s"} to cart`}
              </button>
            </div>
          </section>
        </div>

        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 space-y-8">
            <section className="bg-gray-50 border border-gray-100 rounded-2xl p-6 md:p-8">
              <h2 className="text-lg font-extrabold text-gray-900 tracking-tight mb-6">
                Instructions
              </h2>
              <ol className="space-y-5">
                {(r.instructions || "").split('\n').filter(Boolean).map((step, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-600 leading-relaxed pt-1">{step}</p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}