import { useEffect, useState } from "react";
import { api, apiForm, fileUrl } from "../lib/api";

export default function AdminRecipes() {
  const [name, setName] = useState("");
  const [serves, setServes] = useState(1);
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [instructions, setInstructions] = useState("");
  const [ingredients, setIngredients] = useState([{ qtyPerServe: 100, unit: "g", name: "" }]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState([]);
  const [editingId, setEditingId] = useState("");
  const [edit, setEdit] = useState(null);

  async function load() {
    try {
      const r = await api("/recipes");
      setList(r.recipes || []);
    } catch {
      setList([]);
    }
  }

  useEffect(() => { load(); }, []);

  function setIng(i, patch) {
    setIngredients((list) => list.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  }

  function addIng() {
    setIngredients(list => [...list, { qtyPerServe: 100, unit: "g", name: "" }]);
  }

  function removeIng(i) {
    setIngredients(list => list.filter((_, idx) => idx !== i));
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("serves", String(serves));
      fd.append("prepTime", prepTime);
      fd.append("cookTime", cookTime);
      fd.append("instructions", instructions);
      fd.append("ingredients", JSON.stringify(ingredients.map(i => ({
        name: i.name, unit: i.unit, qtyPerServe: Number(i.qtyPerServe || 0)
      }))));
     if (image) fd.append("file", image);
     console.log(fd.get("file"));
      await apiForm("/recipes", fd, { auth: true });
      setName(""); setServes(1); setPrepTime(""); setCookTime(""); setInstructions(""); 
      setIngredients([{ qtyPerServe: 100, unit: "g", name: "" }]); setImage(null); setPreview(null);
      await load();
      alert("Recipe created successfully!");
    } catch (e) {
      alert(e.message || "Failed to create recipe");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight">Recipe Studio</h1>
            <p className="text-gray-500 mt-1">Design and manage your culinary masterpieces</p>
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Create Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                Create New Recipe
              </h2>
              <form onSubmit={submit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 block mb-2 uppercase tracking-wider">Title</label>
                    <input className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 transition-all font-medium" placeholder="Dish Name" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2 uppercase tracking-wider">Serves</label>
                    <input type="number" min="1" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 transition-all" value={serves} onChange={(e) => setServes(Number(e.target.value || 1))} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2 uppercase tracking-wider">Prep (min)</label>
                      <input className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2 uppercase tracking-wider">Cook (min)</label>
                      <input className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Ingredients</label>
                    <button type="button" onClick={addIng} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full transition-colors">+ Add More</button>
                  </div>
                  <div className="space-y-3">
                    {ingredients.map((ing, i) => (
                      <div key={i} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-gray-50/50 p-3 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                        <input className="flex-1 bg-white border-gray-100 rounded-xl px-4 py-2 text-sm" placeholder="Ingredient name" value={ing.name} onChange={(e) => setIng(i, { name: e.target.value })} required />
                        <div className="flex items-center gap-2">
                          <input type="number" min="0" className="w-24 bg-white border-gray-100 rounded-xl px-4 py-2 text-sm text-center" placeholder="Qty" value={ing.qtyPerServe} onChange={(e) => setIng(i, { qtyPerServe: Number(e.target.value || 0) })} />
                          <select className="bg-white border-gray-100 rounded-xl px-3 py-2 text-sm font-medium" value={ing.unit} onChange={(e) => setIng(i, { unit: e.target.value })}>
                            {["g", "kg", "ml", "l", "pcs", "tsp", "tbsp"].map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <button type="button" onClick={() => removeIng(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2 uppercase tracking-wider">Method / Instructions</label>
                  <textarea rows="5" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 transition-all font-medium leading-relaxed" placeholder="Write the preparation steps here..." value={instructions} onChange={(e) => setInstructions(e.target.value)} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2 uppercase tracking-wider">Cover Image</label>
                    <div className="relative group">
                      <input type="file" accept="image/*" onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setImage(f);
                        if (f) setPreview(URL.createObjectURL(f));
                      }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center group-hover:border-emerald-400 transition-all bg-gray-50 overflow-hidden min-h-[160px]">
                        {preview ? (
                          <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <>
                            <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span className="text-sm font-bold text-gray-500">Upload Media</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button disabled={loading} className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-gray-200 disabled:opacity-50">
                      {loading ? "PREPARING..." : "PUBLISH RECIPE"}
                    </button>
                    <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest font-bold">Safe to publish • Publicly visible</p>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* List Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-purple-500 rounded-full"></span>
                Recent Gallery
              </h2>
              <div className="grid gap-4">
                {list.map((r) => (
                  <div key={r.id} className="group relative bg-gray-50 rounded-2xl overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all">
                    <div className="flex items-center p-3 gap-4">
                      <img src={fileUrl(r.imageUrl)} alt="" className="w-16 h-16 object-cover rounded-xl" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 truncate text-sm">{r.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-bold mt-1 uppercase">
                          <span>{r.serves} Serves</span>
                          <span>•</span>
                          <span>{r.ingredients?.length || 0} Items</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gray-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button className="bg-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform" onClick={() => {
                        setEditingId(r.id);
                        setEdit({ ...r, image: null });
                      }}>
                        <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button className="bg-white p-2 rounded-xl shadow-lg hover:scale-110 transition-transform" onClick={async () => {
                        if (!confirm("Are you sure?")) return;
                        try { await api(`/recipes/${r.id}`, { method: "DELETE", auth: true }); await load(); } catch (e) { alert(e.message); }
                      }}>
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
                {list.length === 0 && <p className="text-gray-400 text-sm text-center py-8 font-medium">No recipes in vault</p>}
              </div>
            </div>
          </div>
        </section>

        {/* Edit Modal (Redesigned) */}
        {editingId && edit && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-6 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-full rounded-[40px] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Modify Masterpiece</h2>
                <button onClick={() => setEditingId("")} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-gray-500 uppercase mb-2 block">Name</label>
                    <input className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-gray-800" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-gray-500 uppercase mb-2 block">Serves</label>
                    <input type="number" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold" value={edit.serves} onChange={(e) => setEdit({ ...edit, serves: Number(e.target.value || 1) })} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4" placeholder="Prep Time" value={edit.prepTime} onChange={(e) => setEdit({ ...edit, prepTime: e.target.value })} />
                    <input className="w-full bg-gray-50 border-none rounded-2xl px-4 py-4" placeholder="Cook Time" value={edit.cookTime} onChange={(e) => setEdit({ ...edit, cookTime: e.target.value })} />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-bold text-gray-500 uppercase mb-2 block">Ingredients</label>
                  <div className="space-y-3">
                    {edit.ingredients.map((ing, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm font-medium" value={ing.name} onChange={(e) => {
                          const ni = [...edit.ingredients];
                          ni[i] = { ...ni[i], name: e.target.value };
                          setEdit({ ...edit, ingredients: ni });
                        }} />
                        <input type="number" className="w-20 bg-gray-50 border-none rounded-xl px-4 py-2 text-sm text-center" value={ing.qtyPerServe} onChange={(e) => {
                          const ni = [...edit.ingredients];
                          ni[i] = { ...ni[i], qtyPerServe: Number(e.target.value || 0) };
                          setEdit({ ...edit, ingredients: ni });
                        }} />
                        <button onClick={() => {
                          setEdit({ ...edit, ingredients: edit.ingredients.filter((_, idx) => idx !== i) });
                        }} className="p-2 text-red-400">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                        </button>
                      </div>
                    ))}
                    <button className="text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl" onClick={() => {
                      setEdit({ ...edit, ingredients: [...edit.ingredients, { qtyPerServe: 100, unit: "g", name: "" }] });
                    }}>+ Add New</button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-500 uppercase mb-2 block">Method</label>
                  <textarea rows="4" className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-medium" value={edit.instructions} onChange={(e) => setEdit({ ...edit, instructions: e.target.value })} />
                </div>
              </div>
              <div className="p-8 bg-gray-50 flex items-center justify-end gap-3 rounded-b-[40px]">
                <button onClick={() => setEditingId("")} className="px-6 py-3 font-bold text-gray-500 hover:text-gray-700">Discard</button>
                <button className="bg-emerald-600 text-white font-black px-10 py-3 rounded-2xl shadow-lg hover:bg-emerald-700 transition-colors" onClick={async () => {
                  try {
                    const fd = new FormData();
                    fd.append("name", edit.name);
                    fd.append("serves", String(edit.serves));
                    fd.append("prepTime", edit.prepTime || "");
                    fd.append("cookTime", edit.cookTime || "");
                    fd.append("instructions", edit.instructions || "");
                    fd.append("ingredients", JSON.stringify(edit.ingredients));
                   if (edit.image) fd.append("file", edit.image);
                    await apiForm(`/recipes/${editingId}`, fd, { method: "PUT", auth: true });
                    setEditingId("");
                    await load();
                    alert("Changes saved!");
                  } catch (e) { alert(e.message); }
                }}>SAVE MASTERPIECE</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
