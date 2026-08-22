import { useState } from "react";
import { assets } from "../../assets/greencart/greencart_assets/assets";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout({ user, route, onLogout, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar
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
              aria-label="Open admin menu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>

            <img src={assets.logo} alt="GreenCart Admin" className="h-6 lg:hidden" />

            <div className="hidden lg:flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 italic">
              GreenCart
              <span className="text-emerald-500">/</span>
              <span className="text-gray-700">Admin Console</span>
            </div>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.25em] text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 leading-none">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Platform Administration
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-emerald-50 to-green-100 border border-emerald-100 rounded-xl px-3 py-1.5">
                <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center uppercase">
                  {(user?.name || "A").charAt(0)}
                </span>
                <span className="hidden sm:block text-xs font-black text-gray-800 leading-none">
                  {user?.name || "Administrator"}
                  <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-600 mt-0.5">admin</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">{children}</main>

        <footer className="px-8 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-300 italic">
          GreenCart Platform Administration
        </footer>
      </div>
    </div>
  );
}
