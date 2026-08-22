import { assets } from "../assets/greencart/greencart_assets/assets";
import { useEffect, useState } from "react";
import { api, setToken } from "../lib/api";
import { navigate } from "../lib/router";
import { homeFor } from "../lib/access";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [phone, setPhone] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center py-6 md:py-12 px-4 md:px-6 lg:px-8">
      {/* Decorative blobs — pointer-events-none so they never swallow taps */}
      <div className="pointer-events-none absolute top-10 left-10 w-72 h-72 bg-emerald-300/20 rounded-full blur-3xl"></div>

      <div className="pointer-events-none absolute bottom-10 right-10 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>

      <div className="pointer-events-none absolute top-1/2 left-1/2 w-80 h-80 bg-purple-300/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="relative max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-2xl lg:rounded-3xl overflow-hidden shadow-xl border border-gray-100">
        {/* Visual Side — LARGE girl/product artwork anchors the panel */}
        <div className="hidden lg:block relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-green-700 h-full border-r border-white/10">
          {/* Artwork: large, bottom-anchored — the dominant visual element */}
          <img
            src={assets.bottom_banner_image_sm}
            alt=""
            className="absolute right-0 bottom-0 w-[90%] opacity-95 pointer-events-none select-none"
          />
          {/* Left-edge blend only — keeps contrast for text without dimming the girl */}
          <div className="absolute inset-y-0 left-0 w-[45%] bg-gradient-to-r from-emerald-900 via-emerald-900/60 to-transparent"></div>

          {/* Compact content zone — top-left, never over the girl's face */}
          <div className="relative z-10 p-10 xl:p-12 max-w-xs">
            <div className="inline-flex items-center gap-2 bg-white text-emerald-700 px-4 py-2 rounded-full font-bold text-xs shadow-lg">
              🌱 Organic Marketplace
            </div>

            <span className="block mt-8 text-[10px] font-extrabold uppercase tracking-[0.3em] text-emerald-300">
              Welcome to GreenCart
            </span>
            <h2 className="mt-3 text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight text-white">
              Experience Freshness
              <br /> Like Never Before.
            </h2>
            <p className="mt-3 text-white/80 font-medium text-sm leading-relaxed">
              Fresh groceries, everyday prices and recipes you can shop in one
              tap.
            </p>
            <ul className="mt-5 space-y-2">
              {[
                "Farm-fresh fruits & vegetables",
                "Cash on delivery or online payment",
                "Live order tracking",
              ].map((line) => (
                <li key={line} className="flex items-center gap-2.5 text-[13px] font-medium text-white/90">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Form Side */}
        <div className="p-6 sm:p-10 md:p-14 xl:p-16 flex flex-col justify-center">
          <div className="mb-8">
            <div className="flex p-1 bg-gray-50 rounded-xl w-fit mb-6 border border-gray-100">
              <button
                onClick={() => setMode("login")}
                className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                  mode === "login"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Login
              </button>
              <button
                onClick={() => setMode("register")}
                className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors ${
                  mode === "register"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                Register
              </button>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-2 bg-gradient-to-r from-emerald-600 to-green-500 bg-clip-text text-transparent">
              {mode === "login" ? "Welcome Back 👋" : "Create Your Account 🚀"}
            </h1>
            <p className="text-gray-400 font-medium text-sm">
              {mode === "login"
                ? "Enter your credentials to access your pantry."
                : "Create your account to start curating fresh ingredients."}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4 animate-fade-in">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="input-field"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              disabled={loading}
              className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold py-3.5 rounded-xl transition-colors disabled:opacity-50 text-xs uppercase tracking-[0.15em]"
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

          <div className="mt-8 flex justify-center gap-6">
            <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">🔒 Secure</span>

            <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">⚡ Fast</span>

            <span className="text-xs font-semibold text-gray-300 uppercase tracking-widest">🌱 Fresh</span>
          </div>

          <div className="mt-8 text-center">
            {mode === "login" ? (
              <button
                onClick={() => navigate("/forgot")}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                Forgot password?
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}