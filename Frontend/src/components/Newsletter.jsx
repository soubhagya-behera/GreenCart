import { useState } from "react";
import { api } from "../lib/api";

export default function Newsletter({ showToast }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function subscribe() {
    if (!email) return;
    setLoading(true);
    try {
      await api("/newsletter/subscribe", { method: "POST", body: { email } });
      if (showToast) showToast("Subscribed successfully!");
      setEmail("");
    } catch (e) {
      if (showToast) showToast(e.message || "Subscription failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-white border-t border-gray-100">
      <div className="mx-auto max-w-7xl px-4 md:px-6 py-12 text-center">
        <h3 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight">Never miss a deal</h3>
        <p className="text-gray-500 text-sm mt-1.5">
          Subscribe for the latest offers, new arrivals and seasonal picks.
        </p>
        <div className="mt-5 mx-auto max-w-md flex rounded-xl overflow-hidden border border-gray-200 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-100 transition-all bg-white">
          <input
            placeholder="Enter your email address"
            type="email"
            aria-label="Email address"
            className="flex-1 px-4 py-3 outline-none text-sm min-w-0"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            onClick={subscribe}
            disabled={loading}
            className="px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-colors"
          >
            {loading ? "…" : "Subscribe"}
          </button>
        </div>
      </div>
    </section>
  );
}

