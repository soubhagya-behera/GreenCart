import { assets, features } from "../assets/greencart/greencart_assets/assets";

export default function FeatureBanner() {
  return (
    <section className="bg-white">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-8">
        <div className="relative overflow-hidden rounded-2xl bg-emerald-50/70 border border-emerald-100">
          <img src={assets.bottom_banner_image} alt="" className="hidden md:block absolute left-4 bottom-0 h-[85%] object-contain pointer-events-none select-none" />
          <div className="md:ml-[280px] px-6 py-7">
            <h3 className="text-lg md:text-xl font-extrabold text-emerald-800 mb-4 tracking-tight">
              Why shop with GreenCart?
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-3 bg-white rounded-xl p-3.5 border border-emerald-100/60">
                  <img src={f.icon} alt="" className="w-7 h-7 shrink-0" />
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{f.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{f.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

