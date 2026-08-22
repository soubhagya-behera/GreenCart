export default function AdminKpiCard({ label, value, hint, accent = "emerald", icon }) {
  const accents = {
    emerald: "from-emerald-500 to-green-600",
    gray: "from-gray-800 to-black",
    blue: "from-blue-500 to-indigo-600",
    orange: "from-orange-500 to-red-500",
    purple: "from-purple-500 to-pink-600",
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
      <div
        className={`w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br ${accents[accent] || accents.emerald} text-white flex items-center justify-center text-lg`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
          {label}
        </p>
        <p className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-1 truncate">
          {value}
        </p>
        {hint && (
          <p className="text-[10px] font-bold text-gray-400 mt-1 leading-snug">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
