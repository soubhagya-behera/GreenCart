import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { assets } from "../../assets/greencart/greencart_assets/assets";
import { api, fileUrl, errorMessage } from "../../lib/api";
import { navigate } from "../../lib/router";
import { subscribeDelivery } from "../../lib/deliverySocket";
import { formatINR } from "../../lib/orderStatuses";
import DeliveryPortalContext from "./DeliveryContext";

const NAV = [
  { label: "Overview", path: "/delivery", icon: "▦" },
  { label: "Requests", path: "/delivery/requests", icon: "🔔" },
  { label: "Active", path: "/delivery/active", icon: "🛵" },
  { label: "History", path: "/delivery/history", icon: "🕘" },
  { label: "Profile", path: "/delivery/profile", icon: "👤" },
];

const PAYMENT_LABELS = { COD: "Cash on Delivery", UPI: "UPI" };

export default function DeliveryLayout({ user, route, onLogout, children }) {
  const [online, setOnline] = useState(Boolean(user?.online));
  const [toggling, setToggling] = useState(false);
  const [requestCount, setRequestCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const menuRef = useRef(null);
  const toastSeq = useRef(0);

  const isActive = (path) =>
    path === "/delivery" ? route === "/delivery" : route.startsWith(path);

  // ---- availability ----------------------------------------------------

  useEffect(() => {
    api("/delivery/me", { auth: true })
      .then((me) => {
        if (me && typeof me.online === "boolean") setOnline(me.online);
      })
      .catch(() => { /* header still usable; pages surface real errors */ });
  }, []);

  const toggleAvailability = useCallback(async () => {
    if (toggling) return;
    const next = !online;
    setToggling(true);
    try {
      await api("/delivery/availability", {
        method: "PUT",
        auth: true,
        body: { online: next },
      });
      setOnline(next);
    } catch (e) {
      window.alert(errorMessage(e, "Could not update availability"));
    } finally {
      setToggling(false);
    }
  }, [online, toggling]);

  // ---- live events + badge ---------------------------------------------

  const refreshBadge = useCallback(() => {
    api("/delivery/requests", { auth: true })
      .then((list) => setRequestCount(Array.isArray(list) ? list.length : 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshBadge();
    const iv = setInterval(refreshBadge, 20000);
    return () => clearInterval(iv);
  }, [refreshBadge]);

  useEffect(() => {
    const off = subscribeDelivery((event) => {
      setRefreshKey((k) => k + 1);
      if (event.type === "NEW_REQUEST") {
        refreshBadge();
        const id = ++toastSeq.current;
        setToasts((t) => [
          ...t.slice(-2),
          {
            id,
            orderId: event.orderId,
            total: event.total,
            paymentMethod: event.paymentMethod,
          },
        ]);
        setTimeout(
          () => setToasts((t) => t.filter((x) => x.id !== id)),
          8000
        );
      }
    });
    return off;
  }, [refreshBadge]);

  // Close the profile menu on outside click.
  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Lock body scroll while the mobile drawer is open; always restore.
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const go = (path) => {
    setDrawerOpen(false);
    setMenuOpen(false);
    navigate(path);
  };

  const AvailabilityPill = (
    <button
      onClick={toggleAvailability}
      disabled={toggling}
      aria-pressed={online}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[10px] font-black uppercase tracking-widest leading-none transition-colors disabled:opacity-60 ${
        online
          ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          : "bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200"
      }`}
      title={online ? "You are receiving delivery requests" : "Go online to receive delivery requests"}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          online ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
        }`}
      />
      {toggling ? "…" : online ? "Online" : "Offline"}
    </button>
  );

  return (
    <DeliveryPortalContext.Provider
      value={{ user, online, toggleAvailability, requestCount, refreshKey }}
    >
      <div className="min-h-screen bg-[#f7f9f8] flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
          <div className="flex items-center gap-3 px-4 md:px-8 h-16">
            <button
              className="lg:hidden p-2 rounded-xl bg-gray-50 text-gray-700 border border-gray-100"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              aria-expanded={drawerOpen}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>

            <img src={assets.logo} alt="GreenCart" className="h-6 shrink-0" />

            <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-gray-400 italic">
              <span className="text-emerald-500">/</span>
              <span className="text-gray-700">Delivery Hub</span>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {AvailabilityPill}

              {/* Requests bell */}
              <button
                onClick={() => go("/delivery/requests")}
                aria-label={`Delivery requests${requestCount ? `, ${requestCount} available` : ""}`}
                className="relative p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors"
              >
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {requestCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-emerald-600 text-white text-[9px] font-black tabular-nums border-2 border-white">
                    {requestCount > 9 ? "9+" : requestCount}
                  </span>
                )}
              </button>

              {/* Profile menu */}
              <div className="relative isolate" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white pl-1.5 pr-2 py-1.5 hover:border-emerald-300 transition-colors"
                >
                  <img
                    src={user?.avatarUrl ? fileUrl(user.avatarUrl) : assets.profile_icon}
                    onError={(e) => { e.currentTarget.src = assets.profile_icon; }}
                    alt=""
                    className="w-7 h-7 rounded-lg object-cover bg-gray-50"
                  />
                  <span className="hidden sm:block text-left leading-none mr-1">
                    <span className="block text-xs font-black text-gray-800 max-w-[110px] truncate">
                      {user?.name || "Partner"}
                    </span>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-emerald-600 mt-0.5">
                      Delivery Partner
                    </span>
                  </span>
                  <svg className="hidden sm:block w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-3 w-52 rounded-2xl bg-white shadow-2xl border border-gray-100 p-2 animate-fade-in z-50">
                    <button
                      onClick={() => go("/delivery/profile")}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      My Profile
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); onLogout && onLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Desktop tab nav */}
          <nav className="hidden lg:flex items-center gap-1 px-8 border-t border-gray-100 overflow-x-auto">
            {NAV.map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => { e.preventDefault(); navigate(item.path); }}
                aria-current={isActive(item.path) ? "page" : undefined}
                className={`relative flex items-center gap-2 px-4 py-3 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${
                  isActive(item.path)
                    ? "text-emerald-700"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                {item.label}
                {item.path === "/delivery/requests" && requestCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[9px] font-black tabular-nums">
                    {requestCount > 9 ? "9+" : requestCount}
                  </span>
                )}
                {isActive(item.path) && (
                  <span className="absolute inset-x-3 bottom-0 h-0.5 bg-emerald-600 rounded-full"></span>
                )}
              </a>
            ))}
          </nav>
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 md:py-8">{children}</main>

        <footer className="px-4 md:px-8 py-4 text-center text-[10px] font-black uppercase tracking-widest text-gray-300 italic">
          GreenCart · Delivery Operations
        </footer>

        {/* New-request toasts */}
        <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[500] space-y-3 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto bg-white border border-gray-200 border-l-4 border-l-emerald-600 rounded-2xl shadow-2xl p-4 animate-bounce-in max-w-sm ml-auto"
            >
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600 mb-1">
                New delivery request
              </p>
              <p className="text-sm font-black text-gray-900">
                Order #{String(t.orderId ?? "").padStart(8, "0")}
                <span className="text-gray-400 font-bold"> · </span>
                {formatINR(t.total)}
                <span className="text-gray-400 font-bold"> · </span>
                {PAYMENT_LABELS[t.paymentMethod] || t.paymentMethod || "—"}
              </p>
              <button
                onClick={() => {
                  setToasts((list) => list.filter((x) => x.id !== t.id));
                  navigate("/delivery/requests");
                }}
                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-colors"
              >
                View Request
              </button>
            </div>
          ))}
        </div>

        {/* Mobile drawer — portaled so backdrop-blur on the header can never
            trap or clip it */}
        {createPortal(
          <>
            <div
              onClick={() => setDrawerOpen(false)}
              className={`lg:hidden fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${
                drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Delivery menu"
              className={`lg:hidden fixed inset-y-0 right-0 z-[9999] flex w-[86%] max-w-[340px] flex-col rounded-l-[1.75rem] bg-white shadow-[-24px_0_60px_-24px_rgba(15,23,42,0.35)] transition-[transform,visibility] duration-300 ease-out will-change-transform ${
                drawerOpen ? "translate-x-0 visible" : "translate-x-full invisible"
              }`}
              style={{ height: "100dvh", maxHeight: "100dvh" }}
            >
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 pl-5 pr-3">
                <img src={assets.logo} alt="GreenCart" className="h-6" />
                <button
                  onClick={() => setDrawerOpen(false)}
                  aria-label="Close menu"
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors active:scale-95"
                >
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 space-y-1">
                {NAV.map((item) => (
                  <a
                    key={item.path}
                    href={item.path}
                    onClick={(e) => { e.preventDefault(); go(item.path); }}
                    aria-current={isActive(item.path) ? "page" : undefined}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-colors ${
                      isActive(item.path)
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                        : "text-gray-600 hover:bg-gray-50 hover:text-emerald-700"
                    }`}
                  >
                    <span className="w-5 text-center">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.path === "/delivery/requests" && requestCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-black tabular-nums">
                        {requestCount > 9 ? "9+" : requestCount}
                      </span>
                    )}
                  </a>
                ))}
              </nav>

              <div className="shrink-0 border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
                {AvailabilityPill}
                <button
                  onClick={() => { setDrawerOpen(false); onLogout && onLogout(); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 py-3 text-[11px] font-black uppercase tracking-widest text-red-500 transition-colors hover:bg-red-100"
                >
                  Sign Out
                </button>
              </div>
            </aside>
          </>,
          document.body
        )}
      </div>
    </DeliveryPortalContext.Provider>
  );
}
