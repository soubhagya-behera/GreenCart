import { assets } from "../assets/greencart/greencart_assets/assets";
import { useEffect, useState } from "react";
import { api, setToken } from "../lib/api";
import { navigate } from "../lib/router";
import { homeFor } from "../lib/access";

export default function Auth({ initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Keep local mode in sync when the route changes (/login <-> /register).
  useEffect(() => {
    setMode(initialMode);
    setErr("");
  }, [initialMode]);

  function switchMode(next) {
    if (next === mode) return;
    navigate(next === "register" ? "/register" : "/login");
  }

  async function submit(e) {
    e.preventDefault();

    setErr("");

    setLoading(true);

    try {
      // REGISTER FLOW
      if (mode === "register") {
        await api("/auth/register", {
          method: "POST",
          body: {
            email,
            password,
            name,
            role,
            phone,
            storeName: role === "seller" ? storeName : "",
          },
        });

        // SAVE EMAIL FOR OTP PAGE
        localStorage.setItem("verifyEmail", email);

        // GO TO OTP PAGE
        navigate("/verify-otp");

        return;
      }

      // LOGIN FLOW
      const res = await api("/auth/login", {
        method: "POST",
        body: { email, password },
      });

      setToken(res.token);

      const me = await api("/auth/me", { auth: true });

      navigate(homeFor(me.role));
    } catch (e) {
      setErr(e.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-50/80 via-white to-emerald-100/60">
      {/* Soft background glows */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-[22rem] h-[22rem] bg-emerald-200/40 rounded-full blur-3xl"></div>
      <div className="pointer-events-none absolute top-1/3 -right-28 w-[26rem] h-[26rem] bg-green-200/40 rounded-full blur-3xl"></div>
      <div className="pointer-events-none absolute -bottom-32 left-1/4 w-96 h-96 bg-teal-100/60 rounded-full blur-3xl"></div>

      <div className="relative max-w-md lg:max-w-6xl mx-auto px-4 py-6 md:py-10 lg:py-14">
        {/* ===== Mobile branding (minimal) ===== */}
        <div className="lg:hidden text-center pt-2 pb-5 animate-fade-in">
          <span className="inline-flex items-center gap-1.5 bg-white border border-emerald-100 text-emerald-700 px-3.5 py-1.5 rounded-full font-extrabold text-[10px] uppercase tracking-widest shadow-sm">
            <span aria-hidden="true">🌱</span> Organic Marketplace
          </span>
          <h2 className="mt-4 text-[1.65rem] leading-snug font-extrabold tracking-tight text-gray-900">
            Fresh groceries.
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
              Simply delivered.
            </span>
          </h2>
          <p className="mt-2 text-xs font-medium text-gray-400 max-w-[260px] mx-auto">
            Everything fresh, from local farms to your kitchen.
          </p>
        </div>

        {/* ===== Mobile hero artwork — girl only, face always clear ===== */}
        <div className="lg:hidden relative h-64 sm:h-72 rounded-[1.75rem] overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-800 shadow-xl shadow-emerald-900/20 mb-6 animate-fade-in">
          <div className="pointer-events-none absolute -top-14 -right-10 w-52 h-52 bg-emerald-400/15 rounded-full blur-3xl"></div>
          <img
            src={assets.bottom_banner_image_sm}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[78%] sm:w-[68%] max-w-none select-none pointer-events-none"
          />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent pointer-events-none"></div>
        </div>

        {/* ===== Auth card / two-panel grid ===== */}
        <div className="grid lg:grid-cols-2 bg-white rounded-[1.75rem] lg:rounded-[2rem] overflow-hidden border border-gray-100 shadow-2xl shadow-emerald-900/10 animate-fade-in">
          {/* LEFT — premium visual panel (desktop only) */}
          <aside className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-800 min-h-[780px]">
            {/* Decorative glows kept away from the artwork */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl"></div>
            <div className="pointer-events-none absolute top-1/2 -left-24 w-80 h-80 bg-green-400/10 rounded-full blur-3xl"></div>

            {/* LARGE girl/product artwork — dominates lower/center area */}
            <img
              src={assets.bottom_banner_image_sm}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute bottom-[-2%] left-1/2 -translate-x-1/2 w-[94%] max-w-none select-none pointer-events-none"
            />

            {/* Minimal copy zone — upper-left, never over the girl's face */}
            <div className="relative z-10 p-10 xl:p-14 max-w-xs xl:max-w-sm">
              <span className="inline-flex items-center gap-1.5 bg-white text-emerald-700 px-4 py-2 rounded-full font-bold text-xs shadow-lg">
                <span aria-hidden="true">🌱</span> Organic Marketplace
              </span>

              <p className="mt-8 xl:mt-10 text-[10px] font-extrabold uppercase tracking-[0.32em] text-emerald-300">
                Welcome to GreenCart
              </p>
              <h2 className="mt-3 text-3xl xl:text-[2.6rem] font-extrabold leading-[1.15] tracking-tight text-white">
                Fresh groceries.
                <br />
                Simply delivered.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70 font-medium">
                Everything fresh, from local farms to your kitchen.
              </p>
            </div>
          </aside>

          {/* RIGHT — auth form */}
          <section className="flex flex-col justify-center p-6 sm:p-10 lg:p-12 xl:p-16">
            {/* Brand mark on mobile (inside card) */}
            <img
              src={assets.logo}
              alt="GreenCart"
              className="lg:hidden h-8 mx-auto mb-7"
            />

            {/* Login / Register tabs */}
            <div
              className="flex w-full lg:w-fit p-1 bg-gray-50 rounded-2xl border border-gray-100 gap-1 mb-8"
              role="tablist"
              aria-label="Authentication mode"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                onClick={() => switchMode("login")}
                className={`flex-1 lg:flex-none px-8 py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.14em] transition-all ${
                  mode === "login"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                onClick={() => switchMode("register")}
                className={`flex-1 lg:flex-none px-8 py-3 rounded-xl text-[11px] font-extrabold uppercase tracking-[0.14em] transition-all ${
                  mode === "register"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                    : "text-gray-400 hover:text-gray-700"
                }`}
              >
                Register
              </button>
            </div>

            <h1 className="text-[1.75rem] sm:text-4xl font-extrabold tracking-tight leading-tight text-gray-900">
              {mode === "login" ? (
                <>
                  Welcome back.
                </>
              ) : (
                <>
                  Create your account.
                </>
              )}
            </h1>
            <p className="mt-2 text-gray-400 font-medium text-sm">
              {mode === "login"
                ? "Sign in to access your pantry."
                : "Join GreenCart and start shopping fresh."}
            </p>

            <form onSubmit={submit} className="mt-8 space-y-4 animate-fade-in">
              {mode === "register" && (
                <div className="space-y-4 animate-fade-in">
                  <input
                    className="input-field"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />

                  <div className="grid grid-cols-3 gap-2 p-2 bg-gray-50 rounded-xl border border-gray-100">
                    {[
                      { value: "user", icon: "👤", label: "Customer" },
                      { value: "seller", icon: "🏪", label: "Seller" },
                      { value: "delivery", icon: "🚚", label: "Delivery" },
                    ].map((r) => (
                      <label
                        key={r.value}
                        className={`flex flex-col items-center p-3 rounded-lg cursor-pointer transition-colors ${
                          role === r.value
                            ? "bg-white shadow-sm ring-1 ring-emerald-300"
                            : "hover:bg-white/70"
                        }`}
                      >
                        <input
                          type="radio"
                          value={r.value}
                          checked={role === r.value}
                          onChange={(e) => setRole(e.target.value)}
                          className="hidden"
                        />
                        <div className="text-xl mb-1.5">{r.icon}</div>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-widest ${
                            role === r.value ? "text-emerald-600" : "text-gray-400"
                          }`}
                        >
                          {r.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  <input
                    className="input-field"
                    placeholder="Phone number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  {role === "seller" && (
                    <input
                      className="input-field animate-fade-in"
                      placeholder="Store name"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      required
                    />
                  )}
                </div>
              )}

              <input
                className="input-field"
                type="email"
                placeholder="Email address"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                className="input-field"
                type="password"
                placeholder="Password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <button
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold py-3.5 rounded-xl transition-all shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/35 disabled:opacity-50 text-[11px] uppercase tracking-[0.18em]"
              >
                {loading
                  ? "Please wait…"
                  : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
              </button>
            </form>

            {err && (
              <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3 animate-fade-in">
                <svg
                  className="w-5 h-5 text-red-500 shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="text-xs font-semibold text-red-600 break-words">
                  {err}
                </p>
              </div>
            )}

            {mode === "login" && (
              <div className="mt-5 text-center">
                <button
                  onClick={() => navigate("/forgot")}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Small trust indicators */}
            <div className="mt-9 pt-6 border-t border-gray-100 flex items-center justify-center gap-5">
              {["Secure", "Fast", "Fresh"].map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-gray-300"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-300"></span>
                  {t}
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
