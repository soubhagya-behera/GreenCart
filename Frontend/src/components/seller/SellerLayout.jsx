import { useState } from "react";
import { assets } from "../../assets/greencart/greencart_assets/assets";
import { fileUrl } from "../../lib/api";
import SellerSidebar from "./SellerSidebar";

const TITLES = {
  "/seller": { title: "Store Overview", kicker: "My Store" },
  "/seller/products": { title: "My Products", kicker: "Catalog" },
  "/seller/orders": { title: "My Orders", kicker: "Operations" },
  "/seller/analytics": { title: "Analytics", kicker: "Insights" },
  "/seller/recipes": { title: "Recipes", kicker: "Content" },
  "/seller/store": { title: "Store Profile", kicker: "Account" },
};

export default function SellerLayout({ user, route, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const meta = TITLES[route] || TITLES["/seller"];
  const storeActive = Boolean(user?.verified);

  return (
    <div className="min-h-screen bg-gray-50">
      <SellerSidebar
        route={route}
        onLogout={onLogout}
        open={open}
        onClose={() => setOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="flex items-center gap-3 px-4 md:px-8 h-16">
            <button
              className="lg:hidden p-2 rounded-xl bg-gray-100 text-gray-700"
              onClick={() => setOpen(true)}
              aria-label="Open seller menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>

            <img src={assets.logo} alt="GreenCart" className="h-6 lg:hidden" />

            <div className="hidden lg:flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 italic">
              GreenCart
              <span className="text-emerald-500">/</span>
              <span className="text-gray-700">Seller Portal</span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <span
                className={`hidden md:inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest rounded-full px-3 py-1.5 border leading-none ${
                  storeActive
                    ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                    : "bg-amber-50 text-amber-600 border-amber-100"
                }`}
                title={
                  storeActive
                    ? "Your account is verified — your store is live on the marketplace"
                    : "Account verification pending"
                }
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    storeActive ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                {storeActive ? "Store Active" : "Verification Pending"}
              </span>
              <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-100 rounded-xl px-3 py-1.5">
                <img
                  src={user?.avatarUrl ? fileUrl(user.avatarUrl) : assets.profile_icon}
                  onError={(e) => { e.currentTarget.src = assets.profile_icon; }}
                  alt=""
                  className="w-7 h-7 rounded-lg object-cover bg-white"
                />
                <span className="hidden sm:block text-xs font-black text-gray-800 leading-none">
                  {user?.storeName || user?.name || "My Store"}
                  <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-600 mt-0.5">
                    {user?.name || "Store Operator"}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">{children}</main>

        <footer className="px-8 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-300 italic">
          GreenCart · Store Operations
        </footer>
      </div>
    </div>
  );
}
