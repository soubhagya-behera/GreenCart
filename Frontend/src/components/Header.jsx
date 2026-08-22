import { useEffect, useRef, useState } from "react";
import { assets } from "../assets/greencart/greencart_assets/assets";
import { api, fileUrl } from "../lib/api";
import { navigate } from "../lib/router";

export default function Header({ cartCount = 0, searchQuery = "", setSearch, user, onLogout, route = "/" }) {
  const [open, setOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [products, setProducts] = useState([]);
  const wrapRef = useRef(null);

  // Map the current route to a nav item for the active state.
  const activeNav = (() => {
    if (route === "/" || route === "") return "/";
    if (route.startsWith("/all-products")) return "/all-products";
    if (route.startsWith("/category/") || route.startsWith("/product/"))
      return "/all-products";
    if (route.startsWith("/orders")) return "/orders";
    if (route.startsWith("/recipes") || route.startsWith("/recipe/")) return "/recipes";
    if (route.startsWith("/profile")) return "/profile";
    if (route.startsWith("/cart")) return "/cart";
    return null;
  })();

  // Lock background scrolling while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
  const onScroll = () => setIsScrolled(window.scrollY > 20);
  window.addEventListener("scroll", onScroll);

  function onDocClick(e) {
    if (!wrapRef.current) return;

    if (
      !wrapRef.current.contains(e.target) &&
      !e.target.closest('.mobile-drawer') &&
      !e.target.closest('.search-overlay')
    ) {
      setOpen(false);
      setMobileSearch(false);
    }
  }

  document.addEventListener("mousedown", onDocClick);

  // ADD THIS BLOCK
  api("/products")
    .then((res) => {
      const arr = Array.isArray(res)
        ? res
        : (res.products || []);

      setProducts(arr);
    })
    .catch(console.error);

  return () => {
    window.removeEventListener("scroll", onScroll);
    document.removeEventListener("mousedown", onDocClick);
  };
}, []);

  const q = searchQuery.trim().toLowerCase();
  const suggestions = q
  ? products.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    )
  : [];

  return (
    <header className={`sticky top-0 z-[100] w-full transition-all duration-300 ${
  isScrolled
    ? "bg-white/80 backdrop-blur-xl border-b border-emerald-100 shadow-lg py-2"
    : "bg-white/70 backdrop-blur-xl border-b border-gray-100 py-4"
}`}>
      <div className="mx-auto max-w-7xl w-full px-4 md:px-6 flex items-center justify-between" ref={wrapRef}>
        <div className="flex items-center gap-4 lg:gap-10">
          <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="shrink-0">
            <img src={assets.logo} alt="GreenCart" className="h-8 md:h-10 hover:scale-105 transition-all duration-300 drop-shadow-sm" />
          </a>

          <nav className="hidden lg:flex items-center gap-1">
            {[
              { name: "Home", path: "/" },
              { name: "All Products", path: "/all-products" },
              { name: "Orders", path: "/orders" },
              { name: "Recipes", path: "/recipes" },
              ...(user?.role === "delivery"
                ? [{ name: "Delivery Hub", path: "/delivery" }]
                : []),
            ].map((item) => {
              const isActive = activeNav === item.path;
              return (
                <a
                  key={item.name}
                  href={item.path}
                  onClick={(e) => { e.preventDefault(); navigate(item.path); }}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative px-3.5 py-2 rounded-lg text-[11px] font-extrabold uppercase tracking-[0.12em] transition-colors ${
                    isActive
                      ? "text-emerald-700 bg-emerald-50"
                      : "text-gray-500 hover:text-emerald-700 hover:bg-gray-50"
                  }`}
                >
                  {item.name}
                </a>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 md:gap-6">
          {/* Search Bar */}
          <div className="hidden lg:flex items-center gap-2.5 bg-gray-50 rounded-xl px-4 py-2.5
border border-transparent
hover:bg-white hover:border-gray-200
focus-within:bg-white focus-within:border-emerald-300 focus-within:ring-4 focus-within:ring-emerald-100
transition-all w-[300px] relative">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              placeholder="Search fruits, vegetables, dairy..."
              className="w-full outline-none bg-transparent text-[11px] font-bold placeholder-gray-300"
              value={searchQuery}
              onChange={(e) => { setSearch?.(e.target.value); setShowSuggestions(true); }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {q && showSuggestions && (
              <div className="absolute left-0 right-0 top-full mt-4 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 p-4 max-h-80 overflow-auto animate-fade-in">
                {suggestions.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No match found</p>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {suggestions.map((p) => (
                      <button
                        key={p.id}
                        onClick={(e) => {
                          e.preventDefault();
                          setShowSuggestions(false);
                          navigate(`/product/${p.id}`);
                        }}
                        className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-emerald-50 transition-colors group text-left"
                      >
                        <div className="w-10 h-10 bg-gray-50 rounded-xl overflow-hidden p-1">
                          <img
  src={p.imageUrl ? fileUrl(p.imageUrl) : assets.logo}
  alt={p.name}
  className="w-full h-full object-contain mix-blend-multiply"
/>
                        </div>
                        <span className="text-sm font-bold text-gray-700 group-hover:text-emerald-700">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 md:gap-5">
            {/* Mobile Search Toggle */}
            <button
              className="lg:hidden p-2 rounded-xl bg-gray-50 text-gray-900 border border-gray-100"
              onClick={() => setMobileSearch(!mobileSearch)}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>

            {user ? <Dropdown user={user} onLogout={onLogout} /> : (
              <a href="/auth" className="hidden sm:inline-flex text-[11px] font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-sm transition-colors">
                Get Started
              </a>
            )}

            {user?.role !== "admin" && (
              <a
                href="/cart"
                onClick={(e) => { e.preventDefault(); navigate("/cart"); }}
                aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
                className="group relative flex items-center justify-center p-2.5 rounded-xl bg-white border border-gray-100 text-gray-700
hover:border-emerald-300 hover:text-emerald-700 transition-colors"
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-emerald-600 text-white text-[9px] font-extrabold border-2 border-white tabular-nums">{cartCount}</span>
                )}
              </a>
            )}

            <button
              className="lg:hidden p-2 rounded-xl bg-gray-900 text-white"
              onClick={() => setOpen(!open)}
              aria-label="Open menu"
              aria-expanded={open}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {mobileSearch && (
        <div className="search-overlay lg:hidden absolute top-full inset-x-0 bg-white border-t border-gray-100 p-4 shadow-xl animate-fade-in z-[110]">
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-2.5 border border-emerald-100 shadow-inner">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              autoFocus
              placeholder="Searching for fresh goods..."
              className="w-full bg-transparent outline-none text-xs font-bold"
              value={searchQuery}
              onChange={(e) => setSearch?.(e.target.value)}
            />
            <button onClick={() => setMobileSearch(false)}>
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Menu Drawer — full-height app-style panel */}
      <div
        className={`mobile-drawer fixed inset-y-0 right-0 w-72 max-w-[85%] bg-gray-950 text-white shadow-2xl z-[200] transform transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Customer menu"
      >
        <div className="h-full flex flex-col">
          {/* Branding header */}
          <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 shrink-0">
            <img src={assets.logo} alt="GreenCart" className="h-6 brightness-0 invert" />
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 hover:text-red-300 text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Sections */}
          <nav aria-label="Mobile navigation" className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
            <div>
              <div className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">Main</div>
              <div className="space-y-1">
                {[
                  {
                    name: "Home",
                    path: "/",
                    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>,
                  },
                  {
                    name: "All Products",
                    path: "/all-products",
                    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
                  },
                  ...(user && user.role !== "admin"
                    ? [{
                        name: "Orders",
                        path: "/orders",
                        icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
                      }]
                    : []),
                  {
                    name: "Recipes",
                    path: "/recipes",
                    icon: <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
                  },
                ].map((item) => {
                  const isActive = activeNav === item.path;
                  return (
                    <a
                      key={item.path}
                      href={item.path}
                      aria-current={isActive ? "page" : undefined}
                      onClick={(e) => { e.preventDefault(); navigate(item.path); setOpen(false); }}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                          : "text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {item.name}
                    </a>
                  );
                })}
              </div>
            </div>

            {user && user.role !== "admin" && (
              <div>
                <div className="px-4 mb-2 text-[9px] font-black uppercase tracking-[0.3em] text-gray-600">Account</div>
                <div className="space-y-1">
                  <a
                    href="/profile"
                    aria-current={activeNav === "/profile" ? "page" : undefined}
                    onClick={(e) => { e.preventDefault(); navigate("/profile"); setOpen(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      activeNav === "/profile"
                        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="shrink-0"><svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></span>
                    My Account
                  </a>
                  <a
                    href="/cart"
                    aria-current={activeNav === "/cart" ? "page" : undefined}
                    onClick={(e) => { e.preventDefault(); navigate("/cart"); setOpen(false); }}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      activeNav === "/cart"
                        ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <span className="shrink-0"><svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg></span>
                      Cart
                    </span>
                    {cartCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-emerald-500 text-gray-950 text-[10px] font-extrabold tabular-nums">
                        {cartCount}
                      </span>
                    )}
                  </a>
                </div>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-white/10 shrink-0">
            {user ? (
              <button
                onClick={() => { setOpen(false); onLogout && onLogout(); }}
                className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/20 hover:text-red-300 text-gray-300 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
              </button>
            ) : (
              <a
                href="/auth"
                onClick={(e) => { e.preventDefault(); navigate("/auth"); setOpen(false); }}
                className="block w-full text-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-colors"
              >
                Sign In / Get Started
              </a>
            )}
          </div>
        </div>
      </div>
      {open && <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-[190] animate-fade-in lg:hidden" onClick={() => setOpen(false)}></div>}
    </header>
  );
}

function Dropdown({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDocClick(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative isolate" ref={ref}>
      <button
        className="flex items-center gap-3 p-2 rounded-2xl bg-gradient-to-r from-emerald-50 to-green-100 border border-emerald-100 shadow-md hover:shadow-lg transition-all"
        onClick={() => setOpen(!open)}
      >
        <img
          src={user.avatarUrl ? fileUrl(user.avatarUrl) : assets.profile_icon}
          alt=""
          className="w-8 h-8 md:w-10 md:h-10 rounded-xl object-cover bg-white"
          onError={(e) => { e.currentTarget.src = assets.profile_icon; }}
        />
        <div className="hidden sm:block text-left mr-2">
          <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest leading-none">Account</p>
          <p className="text-xs font-bold text-gray-800 tracking-tight mt-0.5">{user.name || "Explorer"}</p>
        </div>
      </button>
      {open && (
        <div className="absolute right-0 mt-4 w-52 rounded-[2rem] bg-white shadow-2xl border border-gray-100 p-2.5 animate-bounce-in z-[300]">
          {user.role === "seller" && (
            <a
              href="/seller"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
              onClick={(e) => { e.preventDefault(); navigate("/seller"); setOpen(false); }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              Seller Portal
            </a>
          )}
          {user.role === "admin" && (
            <a
              href="/admin"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
              onClick={(e) => { e.preventDefault(); navigate("/admin"); setOpen(false); }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              Admin Console
            </a>
          )}
          {user.role === "delivery" && (
            <a
              href="/delivery"
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
              onClick={(e) => { e.preventDefault(); navigate("/delivery"); setOpen(false); }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
              Delivery Hub
            </a>
          )}
          <a
            href="/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
            onClick={(e) => { e.preventDefault(); navigate("/profile"); setOpen(false); }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Account
          </a>
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
