import { assets } from "../../assets/greencart/greencart_assets/assets";
import { navigate } from "../../lib/router";

const NAV = [
  { label: "Dashboard", path: "/admin", icon: "▦" },
  { label: "Users", path: "/admin/users", icon: "👥" },
  { label: "Sellers", path: "/admin/sellers", icon: "🏪" },
  { label: "Products", path: "/admin/products", icon: "📦" },
  { label: "Orders", path: "/admin/orders", icon: "🧾" },
  { label: "Analytics", path: "/admin/analytics", icon: "📈" },
  { label: "Coupons", path: "/admin/coupons", icon: "🎟️" },
  { label: "Recipes", path: "/admin/recipes", icon: "🍽️" },
];

export default function AdminSidebar({ route, onLogout, open, onClose }) {
  const isActive = (path) =>
    path === "/admin" ? route === "/admin" : route.startsWith(path);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-gray-950 text-white z-50">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-white/10">
          <img src={assets.logo} alt="GreenCart" className="h-7 brightness-0 invert" />
          <div className="leading-none">
            <span className="block text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 italic">
              Admin Console
            </span>
            <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mt-1">
              Platform Owner
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => { e.preventDefault(); navigate(item.path); }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                isActive(item.path)
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="text-sm w-5 text-center">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="px-4 py-5 border-t border-white/10">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-600 leading-relaxed mb-3">
            Administration surface — customer & seller tools live in their own portals.
          </p>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/20 hover:text-red-300 text-gray-300 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-72 max-w-[85%] bg-gray-950 text-white z-[200] transform transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
          <img src={assets.logo} alt="GreenCart" className="h-6 brightness-0 invert" />
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-300 transition-colors"
            aria-label="Close admin menu"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="px-3 py-5 space-y-1 overflow-y-auto h-[calc(100%-8rem)]">
          {NAV.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => { e.preventDefault(); navigate(item.path); onClose(); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                isActive(item.path)
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span className="text-sm w-5 text-center">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="absolute bottom-0 inset-x-0 px-4 py-4 border-t border-white/10">
          <button
            onClick={onLogout}
            className="w-full bg-white/5 hover:bg-red-500/20 hover:text-red-300 text-gray-300 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[190] lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}
