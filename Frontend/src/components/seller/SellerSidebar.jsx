import { assets } from "../../assets/greencart/greencart_assets/assets";
import { navigate } from "../../lib/router";

const GROUPS = [
  {
    title: "My Store",
    items: [{ label: "Overview", path: "/seller", icon: "▦" }],
  },
  {
    title: "Catalog",
    items: [
      { label: "My Products", path: "/seller/products", icon: "📦" },
      { label: "Manage Recipes", path: "/seller/recipes", icon: "🍽️" },
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
        ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
        : "text-gray-500 hover:text-emerald-700 hover:bg-emerald-50"
    }`;

  const renderNav = (closeAfter) =>
    GROUPS.map((group) => (
      <div key={group.title} className="mb-5">
        <div className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.25em] text-gray-300">
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
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-60 flex-col bg-white border-r border-gray-100 z-50">
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-50">
          <img src={assets.logo} alt="GreenCart" className="h-7" />
          <span className="text-[8px] font-black uppercase tracking-[0.28em] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-1 leading-none">
            Seller Portal
          </span>
        </div>

        <nav className="flex-1 px-3 py-6 overflow-y-auto">{renderNav(false)}</nav>

        <div className="px-4 py-5 border-t border-gray-50">
          <button
            onClick={onLogout}
            className="w-full bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-xl py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 w-72 max-w-[85%] bg-white text-gray-900 z-[200] transform transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-50">
          <img src={assets.logo} alt="GreenCart" className="h-6" />
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-500 transition-colors"
            aria-label="Close seller menu"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <nav className="px-3 py-5 overflow-y-auto h-[calc(100%-10rem)]">
          {renderNav(true)}
        </nav>

        <div className="absolute bottom-0 inset-x-0 px-4 py-4 border-t border-gray-50">
          <button
            onClick={onLogout}
            className="w-full bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-500 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[190] lg:hidden"
          onClick={onClose}
        />
      )}
    </>
  );
}
