import { useEffect, useState } from "react";
import { api, fileUrl } from "../lib/api";

export default function Recipes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/recipes")
      .then(res => setItems(res.recipes || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <section className="bg-[#fcfdfd] min-h-screen py-8 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-emerald-600 font-black tracking-widest text-xs uppercase bg-emerald-50 px-3 py-1 rounded-full">Culinary Collection</span>
            <h1 className="text-5xl font-black text-gray-900 mt-4 tracking-tight">Gourmet Recipes</h1>
            <p className="text-gray-500 mt-2 text-lg font-medium">Chef-curated ingredients delivered to your doorstep</p>
          </div>
          <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-2">
            <span className="text-sm font-bold text-gray-400 px-4">{items.length} Masterpieces</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {items.map((r) => (
            <a 
             key={r.id}
href={`#/recipe/${r.id}`}
              className="group bg-white rounded-[1.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 flex flex-col"
            >
              <div className="relative h-48 overflow-hidden">
                <img 
                  src={fileUrl(r.imageUrl)} 
                  alt={r.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-xl font-black text-gray-900 mb-1.5 truncate group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{r.name}</h3>
                <p className="text-gray-500 text-[10px] line-clamp-2 mb-4 font-medium leading-relaxed italic">
                  {r.instructions || "Unlock the potential of these fresh ingredients..."}
                </p>
                
                <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">{r.serves} Serves</span>
                  <div className="flex items-center gap-2 text-emerald-600 font-black text-[9px] uppercase tracking-widest">
                    <span>Explore</span>
                    <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {items.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            <h2 className="text-xl font-bold text-gray-400">Our chef is currently drafting new recipes...</h2>
            <p className="text-gray-300 text-sm mt-1 uppercase tracking-tighter font-black">Coming Soon</p>
          </div>
        )}
      </div>
    </section>
  );
}
