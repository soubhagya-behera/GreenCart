import { useEffect, useState } from "react";
import { navigate } from "../lib/router";
import { api, getToken } from "../lib/api";

export default function Address() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    zipcode: "",
    country: "",
    phone: "",
  });
  const [saving, setSaving] = useState(false);

  // Load address from backend on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      // Not logged in — try localStorage fallback
      try {
        const saved = JSON.parse(
          localStorage.getItem("shippingAddress") || "null"
        );
        if (saved) setForm((f) => ({ ...f, ...saved }));
      } catch {}
      return;
    }
    // Logged in — load from backend
    api("/auth/address", { auth: true })
      .then((res) => {
        // Also keep in localStorage so Cart.jsx can read it
        localStorage.setItem("shippingAddress", JSON.stringify(res));
        setForm((f) => ({ ...f, ...res }));
      })
      .catch(() => {
        // If backend fails, fallback to localStorage
        try {
          const saved = JSON.parse(
            localStorage.getItem("shippingAddress") || "null"
          );
          if (saved) setForm((f) => ({ ...f, ...saved }));
        } catch {}
      });
  }, []);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    // Always save to localStorage (Cart.jsx reads from here)
    localStorage.setItem("shippingAddress", JSON.stringify(form));

    const token = getToken();
    if (token) {
      // Also save to backend if logged in
      try {
        await api("/auth/address", { method: "PUT", body: form, auth: true });
      } catch {
        // localStorage already saved, so still navigate
      }
    }
    setSaving(false);
    navigate("/cart");
  }

  function upd(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-12 px-4 md:px-6">
      <div className="max-w-lg mx-auto mb-8">
        <div className="flex items-center justify-center gap-3">
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
              ✓
            </div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Cart</span>
          </div>

          <div className="w-12 sm:w-16 h-0.5 bg-emerald-500 -mt-5"></div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold ring-4 ring-emerald-100">
              2
            </div>
            <span className="text-[10px] font-bold text-gray-900 uppercase tracking-widest">Address</span>
          </div>

          <div className="w-12 sm:w-16 h-0.5 bg-gray-200 -mt-5"></div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center text-xs font-bold">
              3
            </div>
            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Payment</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl bg-white rounded-2xl p-6 md:p-10 shadow-sm border border-gray-100 animate-fade-in">
        <div className="mb-7">
          <span className="label-pill">Checkout</span>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-3 tracking-tight">
            Delivery Address
          </h1>
          <p className="text-gray-400 text-sm mt-1.5">
            Enter your address to receive fresh groceries quickly.
          </p>
        </div>

        <form onSubmit={save} className="grid gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">First Name</label>
              <input
                id="firstName"
                className="input-field"
                placeholder="e.g. Rahul"
                value={form.firstName}
                onChange={(e) => upd("firstName", e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Last Name</label>
              <input
                id="lastName"
                className="input-field"
                placeholder="e.g. Kumar"
                value={form.lastName}
                onChange={(e) => upd("lastName", e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <input
              id="email"
              className="input-field"
              placeholder="you@example.com"
              type="email"
              value={form.email}
              onChange={(e) => upd("email", e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="street" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Street Address</label>
            <input
              id="street"
              className="input-field"
              placeholder="House no, street, area"
              value={form.street}
              onChange={(e) => upd("street", e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="city" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">City</label>
              <input
                id="city"
                className="input-field"
                placeholder="City"
                value={form.city}
                onChange={(e) => upd("city", e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="state" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">State</label>
              <input
                id="state"
                className="input-field"
                placeholder="State"
                value={form.state}
                onChange={(e) => upd("state", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="zipcode" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">ZIP Code</label>
              <input
                id="zipcode"
                className="input-field"
                placeholder="PIN code"
                value={form.zipcode}
                onChange={(e) => upd("zipcode", e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="country" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Country</label>
              <input
                id="country"
                className="input-field"
                placeholder="Country"
                value={form.country}
                onChange={(e) => upd("country", e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Phone Number</label>
            <input
              id="phone"
              className="input-field"
              placeholder="Contact number for delivery updates"
              value={form.phone}
              onChange={(e) => upd("phone", e.target.value)}
              required
            />
          </div>

          <button
            disabled={saving}
            className="btn-primary w-full !py-3.5 !text-sm mt-3 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Address & Continue →"}
          </button>
        </form>

        <p className="mt-5 text-center text-[11px] font-semibold text-gray-300 uppercase tracking-widest">
          🔒 Saved securely to your GreenCart account
        </p>
      </div>
    </div>
  );
}