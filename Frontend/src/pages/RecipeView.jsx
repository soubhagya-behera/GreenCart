import { useEffect, useState } from "react";
import { api, fileUrl, getToken } from "../lib/api";

export default function RecipeView({ id, onRefreshCart, showToast }) {
  const [r, setR] = useState(null);
  const [serves, setServes] = useState(1);
  const [selected, setSelected] = useState({}); // { productId: boolean }
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
          const pid = i.productId || map.get(normName(i.name))?.id || (p.products || []).find(pr => {
            const pn = normName(pr.name), iname = normName(i.name);
            return pn.includes(iname) || iname.includes(pn);
          })?.id;
          
          if (pid) {
            sel[pid] = true; // All available ingredients selected by default
          }
        });
        setSelected(sel);
        setServes(res.recipe.serves || 1);
      })
      .catch(() => { setR(null); setProducts([]); })
      .finally(() => setLoading(false));
  }, [id]);

  const toggleIngredient = (pid) => {
    setSelected(prev => ({ ...prev, [pid]: !prev[pid] }));
  };

  async function addSelected() {
    if (!getToken()) { window.location.hash = "#/auth"; return; }
    const toAdd = Object.entries(selected).filter(([_, checked]) => checked);
    if (toAdd.length === 0) {
      if (showToast) showToast("Please select at least one ingredient");
      return;
    }

    try {
      for (const [pid, _] of toAdd) {
        const ingredient = r.ingredients.find(ing => {
            // Find ingredient that matches this product ID or name
            const prod = products.find(p => p.id === pid);
            if (!prod) return false;
            const iname = normName(ing.name);
            const pname = normName(prod.name);
            return iname === pname || pname.includes(iname) || iname.includes(pname);
        });
        
        if (ingredient) {
          const totalQty = 1; // Always add 1 quantity as per user requirement
        await api("/cart/add", { method: "POST", body: { productId: pid, quantity: totalQty }, auth: true });
        }
      }
      if (onRefreshCart) onRefreshCart();
      if (showToast) showToast("Ingredients added to your cart!");
    } catch (e) {
      if (showToast) showToast(e.message || "Failed to add products");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-4">
          <div className="h-64 bg-gray-100 rounded-[3rem]"></div>
          <div className="h-8 bg-gray-100 rounded-full w-3/4"></div>
          <div className="h-4 bg-gray-100 rounded-full w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!r) return <div className="p-20 text-center font-bold text-gray-400">Recipe not found</div>;

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Header */}
      <div className="relative h-[60vh] overflow-hidden">
        <img src={fileUrl(r.imageUrl)} alt={r.name} className="w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-white via-white/80 to-transparent"></div>
        
        <div className="absolute bottom-6 md:bottom-12 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 md:px-6 text-center">
          <div className="flex justify-center gap-2 md:gap-4 mb-4 md:mb-6">
            <span className="bg-emerald-600 text-white px-3 md:px-5 py-1 md:py-1.5 rounded-full text-[9px] md:text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-200">Featured Recipe</span>
            {(r.prepTime || r.cookTime) && (
                <span className="bg-white px-3 md:px-5 py-1 md:py-1.5 rounded-full text-[9px] md:text-xs font-black text-gray-900 shadow-xl uppercase tracking-widest border border-gray-100 italic">Chef's Choice</span>
            )}
          </div>
          <h1 className="text-3xl md:text-5xl lg:text-7xl font-black text-gray-900 tracking-tighter mb-4 leading-tight">{r.name}</h1>
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-gray-400 font-bold uppercase text-[8px] md:text-[10px] tracking-[0.2em]">
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{parseInt(r.prepTime || 0) + parseInt(r.cookTime || 0)} Mins Total</span>
            </div>
            <div className="flex items-center gap-2 text-emerald-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <span className="text-emerald-500">Authentic Dish</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 py-8 md:py-12">
        {/* Left Column: Ingredients */}
        <div className="lg:col-span-7 space-y-12">
          <section>
            <div className="flex items-end justify-between mb-8 border-b-4 border-gray-900 pb-4">
              <h2 className="text-4xl font-black text-gray-900 tracking-tight italic">The Ingredients</h2>
              <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-black uppercase text-gray-400 px-2">Adjust Serves</span>
                <div className="flex items-center gap-3">
                    <button onClick={() => setServes(s => Math.max(1, s - 1))} className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-gray-800 hover:bg-emerald-500 hover:text-white transition-all">-</button>
                    <span className="w-6 text-center font-black text-xl text-gray-900">{serves}</span>
                    <button onClick={() => setServes(s => s + 1)} className="w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-gray-800 hover:bg-emerald-500 hover:text-white transition-all">+</button>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {r.ingredients.map((ing, idx) => {
                const pid = ing.productId || products.find(pr => {
                  const pn = normName(pr.name), iname = normName(ing.name);
                  return pn === iname || pn.includes(iname) || iname.includes(pn);
                })?.id;
                
                const prod = products.find(pr => pr.id === pid);
                const available = !!prod && (prod.stock ?? 0) > 0;
                const isSelected = !!selected[pid];
                const totalDisplayQty = Math.round(ing.qtyPerServe * serves);

                return (
                  <div 
                    key={idx} 
                    onClick={() => available && toggleIngredient(pid)}
                    className={`group relative flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all cursor-pointer ${
                      !available ? 'opacity-40 grayscale pointer-events-none' : 
                      isSelected ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-50 hover:border-emerald-200 bg-gray-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-6">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${
                          isSelected ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white text-transparent border-2 border-gray-100'
                      }`}>
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      </div>
                      <div>
                        <h4 className="font-black text-xl text-gray-900">{ing.name}</h4>
                        <div className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mt-1">
                          {available ? `${ing.qtyPerServe} ${ing.unit} per serve` : 'Currently unavailable in store'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                        <div className="text-2xl font-black text-gray-900 tabular-nums">
                            {totalDisplayQty} <span className="text-xs uppercase text-gray-400">{ing.unit}</span>
                        </div>
                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Needed</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button 
              onClick={addSelected} 
              disabled={selectedCount === 0}
              className={`w-full mt-10 py-6 rounded-[2.5rem] font-black text-xl flex items-center justify-center gap-4 transition-all shadow-2xl ${
                selectedCount === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                  : 'bg-gray-900 text-white hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 shadow-emerald-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              ADD {selectedCount} GOURMET INGREDIENTS
            </button>
          </section>
        </div>

        {/* Right Column: Steps */}
        <div className="lg:col-span-5">
            <div className="sticky top-20 space-y-12">
                <section className="bg-gray-900 rounded-[3rem] p-10 text-white shadow-2xl">
                    <h2 className="text-3xl font-black mb-8 italic flex items-center gap-4">
                        <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                        Chef's Method
                    </h2>
                    <div className="space-y-8">
                        {r.instructions ? (
                            r.instructions.split('\n').filter(step => step.trim()).map((step, i) => (
                                <div key={i} className="flex gap-6 group">
                                    <span className="text-4xl font-black text-emerald-500/30 group-hover:text-emerald-500 transition-colors">0{i+1}</span>
                                    <p className="text-gray-300 font-medium leading-relaxed group-hover:text-white transition-colors">{step}</p>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white/5 rounded-3xl p-6 text-center border border-white/10 border-dashed">
                                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Secret Family Recipe</p>
                                <p className="text-gray-400 text-xs mt-2">The instructions for this delicacy are kept private. Collect your ingredients and improvise!</p>
                            </div>
                        )}
                    </div>
                </section>

                <section className="px-10">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-4">Nutritional Focus</h3>
                    <div className="flex flex-wrap gap-2">
                        {['Low Carb', 'High Protein', 'Gluten Free', 'Fresh Only'].map(tag => (
                            <span key={tag} className="px-4 py-2 bg-gray-50 rounded-full text-[10px] font-black text-gray-600 border border-gray-100 italic">#{tag}</span>
                        ))}
                    </div>
                </section>
            </div>
        </div>
      </div>
    </div>
  );
}
