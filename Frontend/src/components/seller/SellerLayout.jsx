import { useState } from "react";
import { assets } from "../../assets/greencart/greencart_assets/assets";
import SellerSidebar from "./SellerSidebar";

const TITLES = {
  "/seller": { title: "Store Overview", kicker: "My Store" },
  "/seller/products": { title: "My Products", kicker: "Catalog" },
  "/seller/orders": { title: "My Orders", kicker: "Operations" },
  "/seller/analytics": { title: "Analytics", kicker: "Insights" },
  "/seller/recipes": { title: "Manage Recipes", kicker: "Content" },
  "/seller/store": { title: "Store Profile", kicker: "Account" },
};

export default function SellerLayout({ user, route, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const meta = TITLES[route] || TITLES["/seller"];

  return (
    <div className="min-h-screen bg-[#f7f9f8]">
      <SellerSidebar
        route={route}
        onLogout={onLogout}
        open={open}
        onClose={() => setOpen(false)}
      />

      <div className="lg:pl-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100">
          <div className="flex items-center gap-3 px-4 md:px-8 h-16">
            <button
              className="lg:hidden p-2 rounded-xl bg-emerald-50 text-emerald-700"
              onClick={() => setOpen(true)}
              aria-label="Open seller menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>

            <div className="lg:hidden">
              <img src={assets.logo} alt="GreenCart" className="h-6" />
            </div>

            <div className="hidden lg:block">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-gray-300 leading-none">
                GreenCart · Seller Portal · {meta.kicker}
              </p>
              <h1 className="text-lg font-black text-gray-900 tracking-tight italic mt-0.5">
                {meta.title}
              </h1>
            </div>

            <div className="ml-auto flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 rounded-xl px-3 py-1.5">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center uppercase">
                {(user?.name || "S").charAt(0)}
              </span>
              <span className="hidden sm:block text-xs font-black text-gray-800 leading-none">
                {user?.storeName || user?.name || "My Store"}
                <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-600 mt-0.5">
                  store owner
                </span>
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">{children}</main>

        <footer className="px-8 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-300 italic">
          GreenCart Seller Portal
        </footer>
      </div>
    </div>
  );
}
