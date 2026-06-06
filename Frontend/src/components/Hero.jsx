import { useEffect, useState } from "react";
import { assets } from "../assets/greencart/greencart_assets/assets";

// Since assets.main_banner_bg was used before, we'll create a local reference for our new images
const slides = [
  {
    image: "/grocery_banner_1.png",
    title: "Freshness You Can Trust,\nSavings You Will Love!",
    subtitle: "Premium organic vegetables harvested daily just for you."
  },
  {
    image: "/grocery_banner_2.png",
    title: "Vibrant Fruits for a\nHealthier Lifestyle!",
    subtitle: "Discover the season's sweetest picks at unbeatable prices."
  },
  {
    image: "/grocery_banner_3.png",
    title: "Pure Dairy & Artisan\nBreads Handpicked!",
    subtitle: "Farm-to-table quality that brings families together."
  },
  {
    image: "/grocery_banner_4.png",
    title: "Gourmet Essentials &\nNatural Pantry Staples!",
    subtitle: "Clean labels, organic ingredients, and pure wholesome goodness."
  }
];

export default function Hero() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-2 md:py-3">
        <div className="relative h-[240px] sm:h-[300px] md:h-[380px] w-full overflow-hidden rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-emerald-50 group">
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${
                idx === current ? "opacity-100 translate-x-0 z-10" : "opacity-0 translate-x-8 pointer-events-none z-0 invisible"
              }`}
            >
              <img
                src={slide.image}
                alt=""
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  e.currentTarget.src = assets.main_banner_bg;
                }}
              />
              <div className="absolute inset-x-0 inset-y-0 bg-gradient-to-r from-white via-white/50 to-transparent md:to-transparent"></div>

              <div className="absolute inset-0 flex items-center px-6 md:px-16">
                <div className="max-w-[240px] sm:max-w-[320px] md:max-w-[420px] animate-fade-in flex flex-col items-start text-left">
                  <span className="inline-block text-emerald-600 font-extrabold tracking-widest text-[10px] md:text-[11px] uppercase bg-emerald-50/90 backdrop-blur-sm px-2.5 py-1 rounded-full mb-3 italic">
                    Premier Quality Store
                  </span>
                  <h1 className="text-xl md:text-3xl lg:text-4xl font-black text-gray-900 leading-[1.1] md:leading-[1.15] tracking-tighter whitespace-pre-line mb-4">
                    {slide.title}
                  </h1>
                  <p className="text-[10px] md:text-xs text-gray-500 font-medium max-w-[240px] md:max-w-[300px] hidden sm:block leading-relaxed mb-6">
                    {slide.subtitle}
                  </p>
                  <div className="flex items-center gap-3">
                    <a href="#/all-products" className="bg-gray-900 text-white font-black px-6 py-3 md:px-8 md:py-4 rounded-xl text-[10px] md:text-xs hover:bg-emerald-600 hover:scale-[1.05] transition-all shadow-lg shadow-gray-200">
                      SHOP NOW
                    </a>
                    <a href="#footer" className="bg-white text-gray-400 font-bold px-6 py-3 md:px-8 md:py-4 rounded-xl text-[10px] md:text-xs border border-gray-100 hover:border-emerald-200 hover:text-emerald-600 transition-all">
                      DETAILS
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Indicators */}
          <div className="absolute bottom-10 right-10 flex gap-3">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                className={`h-1.5 transition-all duration-500 rounded-full ${idx === current ? "w-8 bg-emerald-500" : "w-2 bg-gray-200"
                  }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
