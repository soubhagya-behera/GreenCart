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
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-7 gap-2">
          <div>
            <span className="label-pill">Browse</span>

            <h2 className="text-xl md:text-2xl font-extrabold text-gray-900 mt-3 tracking-tight">
              Shop by Category
            </h2>
          </div>

          <p className="text-gray-400 font-semibold text-xs md:max-w-xs md:text-right">
            Fresh picks from local farms to your kitchen.
          </p>
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((c) => (
            <a
              key={c.text}
              href={`/category/${encodeURIComponent(c.path)}`}
              className="group flex flex-col items-center bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all duration-300"
            >
              <div className="w-full aspect-square rounded-full bg-gray-50 flex items-center justify-center mb-3 overflow-hidden group-hover:bg-emerald-50/60 transition-colors duration-300">
                <img
                  src={categoryImages[c.text]}
                  alt={c.text}
                  loading="lazy"
                  className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="text-center text-[13px] font-bold text-gray-800 group-hover:text-emerald-700 transition-colors duration-300 truncate w-full">
                {c.text}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}