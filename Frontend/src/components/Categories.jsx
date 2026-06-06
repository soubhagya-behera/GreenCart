import { useEffect, useState } from "react";
import { getCategories } from "../lib/api";
import { categoryImages } from "../assets/categoryImages";

export default function Categories() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();

      const formatted = data.map((cat) => ({
        text: cat,
        path: cat.toLowerCase(),
      }));

      setCategories(formatted);
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  return (
    <section className="bg-gray-50 py-8 md:py-10 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl w-full px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-2">
          <div>
            <span className="text-emerald-600 font-extrabold tracking-[0.2em] text-[9px] uppercase bg-emerald-50 px-3 py-1.5 rounded-full italic">
              Explore by Kind
            </span>

            <h2 className="text-2xl md:text-3xl font-black text-gray-900 mt-3 tracking-tighter">
              Essential Categories
            </h2>
          </div>

          <p className="text-gray-400 font-bold text-[9px] uppercase tracking-widest md:max-w-xs md:text-right">
            Handpicked selections from local farms to your kitchen.
          </p>
        </div>

        <div className="flex overflow-x-auto pb-6 gap-4">
          {categories.map((c) => (
            <a
              key={c.text}
              href={`/category/${encodeURIComponent(c.path)}`}
              className="group relative flex flex-col items-center min-w-[140px] bg-gray-50 rounded-[2rem] p-6 hover:bg-emerald-600 transition-all"
            >
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4 overflow-hidden">
                <img
                  src={categoryImages[c.text]}
                  alt={c.text}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="text-center">
                <div className="text-[10px] uppercase tracking-widest text-gray-400 group-hover:text-white">
                  Sector
                </div>

                <div className="font-bold text-gray-800 group-hover:text-white">
                  {c.text}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
