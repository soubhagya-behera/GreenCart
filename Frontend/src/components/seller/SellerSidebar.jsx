import { assets } from "../../assets/greencart/greencart_assets/assets";
import { navigate } from "../../lib/router";

const GROUPS = [
  {
    title: "Store",
    items: [{ label: "Overview", path: "/seller", icon: "▦" }],
  },
  {
    title: "Catalog",
    items: [
      { label: "My Products", path: "/seller/products", icon: "📦" },
      { label: "Recipes", path: "/seller/recipes", icon: "🍽️" },
    ],
  },
  {
    title: "Operations",
    items: [
      { label: "My Orders", path: "/seller/orders", icon: "🧾" },
      { label: "Analytics", path: "/seller/analytics", icon: "📈" },
    ],
  },
  {
    title: "Account",
    items: [{ label: "Store Profile", path: "/seller/store", icon: "🏪" }],
  },
];

export default function SellerSidebar({ route, onLogout, open, onClose }) {
  const isActive = (path) =>
    path === "/seller" ? route === "/seller" : route.startsWith(path);

  const linkClass = (active) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
      active
        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
        : "text-gray-400 hover:text-white hover:bg-white/5"
    }`;

  const renderNav = (closeAfter) =>
    GROUPS.map((group) => (
      <div key={group.title} className="mb-6">
        <div className="px-4 mb-2 text-[8px] font-black uppercase tracking-[0.28em] text-gray-600">
          {group.title}
        </div>
        <div className="space-y-1">
          {group.items.map((item) => (
            <a
              key={item.path}
              href={item.path}
              onClick={(e) => {
                e.preventDefault();
                navigate(item.path);
                if (closeAfter) onClose();
              }}
              className={linkClass(isActive(item.path))}
            >
              <span className="text-sm w-5 text-center">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    ));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-gray-950 text-white z-50">
        <div className="flex items-center gap-3 px-6 h-16 border-b border-white/10">
          <img src={assets.logo} alt="GreenCart" className="h-7 brightness-0 invert" />
          <div className="leading-none">
            <span className="block text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400 italic">
              Seller Portal
            </span>
            <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 mt-1">
              Store Operator
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-6 overflow-y-auto">{renderNav(false)}</nav>

        <div className="px-4 py-5 border-t border-white/10 space-y-3">
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); navigate("/"); }}
            className="block text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors"
          >
            View Store ↗
          </a>
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
            aria-label="Close seller menu"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="px-3 py-5 overflow-y-auto h-[calc(100%-11rem)]">
          {renderNav(true)}
        </nav>

        <div className="absolute bottom-0 inset-x-0 px-4 py-4 border-t border-white/10 space-y-2">
          <a
            href="/"
            onClick={(e) => { e.preventDefault(); navigate("/"); onClose(); }}
            className="block text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors px-1"
          >
            View Store ↗
          </a>
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
