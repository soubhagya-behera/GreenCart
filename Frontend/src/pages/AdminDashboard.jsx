export default function AdminDashboard() {
  const sections = [
    {
      title: "Users",
      description: "All registered accounts, roles and verification status.",
      accent: "from-blue-500 to-indigo-600",
      icon: "👥",
    },
    {
      title: "Sellers",
      description: "Marketplace vendors, their stores and listings.",
      accent: "from-emerald-500 to-green-600",
      icon: "🏪",
    },
    {
      title: "Products",
      description: "Every product across the marketplace.",
      accent: "from-orange-500 to-red-500",
      icon: "📦",
    },
    {
      title: "Orders",
      description: "Platform-wide order oversight and interventions.",
      accent: "from-purple-500 to-pink-600",
      icon: "🧾",
    },
    {
      title: "Analytics",
      description: "Revenue, growth and marketplace health metrics.",
      accent: "from-gray-800 to-black",
      icon: "📊",
    },
  ];

  return (
    <section className="bg-gradient-to-br from-gray-50 via-white to-emerald-50/60 min-h-[70vh]">
      <div className="mx-auto max-w-7xl px-4 py-10 space-y-10">
        <div>
          <p className="text-emerald-600 font-black uppercase tracking-[0.3em] text-xs">
            GreenCart Admin
          </p>
          <h1 className="text-5xl md:text-6xl font-black text-gray-900 tracking-tighter mt-3">
            Platform Administration
          </h1>
          <p className="text-gray-500 mt-4 text-lg max-w-2xl">
            Central command for the entire GreenCart marketplace — users,
            sellers, products, orders and analytics.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest italic">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Signed in as administrator
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((s) => (
            <div
              key={s.title}
              className={`relative overflow-hidden rounded-3xl p-8 text-white shadow-xl bg-gradient-to-br ${s.accent} hover:-translate-y-1 hover:shadow-2xl transition-all duration-300`}
            >
              <div className="text-4xl mb-4">{s.icon}</div>
              <h2 className="text-2xl font-black tracking-tight">{s.title}</h2>
              <p className="text-white/80 mt-2 text-sm font-medium">
                {s.description}
              </p>
              <span className="absolute top-5 right-5 bg-white/15 backdrop-blur px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/20">
                Coming soon
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-white/70 p-10 text-center">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
            Full admin tooling arrives in a later phase — this page proves the
            routing shell
          </p>
        </div>
      </div>
    </section>
  );
}
