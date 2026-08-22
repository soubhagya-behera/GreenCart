export default function SellerKpiCard({ label, value, hint, icon, tone = "emerald" }) {
  const tones = {
    emerald: "from-emerald-500 to-green-600",
    gray: "from-gray-900 to-gray-800",
    orange: "from-orange-500 to-red-500",
    indigo: "from-indigo-500 to-purple-600",
  };

  return (
    <div
      className={`bg-gradient-to-r ${tones[tone] || tones.emerald} rounded-3xl p-6 text-white shadow-xl`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm uppercase tracking-widest font-bold opacity-90">
          {label}
        </p>
        {icon && <span className="text-xl">{icon}</span>}
      </div>
      <h2 className="text-4xl md:text-5xl font-black mt-3 tabular-nums">{value}</h2>
      {hint && (
        <p className="text-[10px] uppercase tracking-widest font-bold mt-2 opacity-70">
          {hint}
        </p>
      )}
    </div>
  );
}
