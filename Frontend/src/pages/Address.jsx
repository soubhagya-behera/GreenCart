import { useEffect, useState } from "react";
import { navigate } from "../lib/router";
import { assets } from "../assets/greencart/greencart_assets/assets";
import { api, getToken } from "../lib/api";

export default function Address() {
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "",
    street: "", city: "", state: "",
    zipcode: "", country: "", phone: "",
  });
  const [saving, setSaving] = useState(false);

  // Load address from backend on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      // Not logged in — try localStorage fallback
      try {
        const saved = JSON.parse(localStorage.getItem("shippingAddress") || "null");
        if (saved) setForm(f => ({ ...f, ...saved }));
      } catch {}
      return;
    }
    // Logged in — load from backend
    api("/auth/address", { auth: true })
      .then(res => {
        // Also keep in localStorage so Cart.jsx can read it
        localStorage.setItem("shippingAddress", JSON.stringify(res));
        setForm(f => ({ ...f, ...res }));
      })
      .catch(() => {
        // If backend fails, fallback to localStorage
        try {
          const saved = JSON.parse(localStorage.getItem("shippingAddress") || "null");
          if (saved) setForm(f => ({ ...f, ...saved }));
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

  function upd(k, v) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <div className="min-h-screen bg-[#fcfdfd] py-6 md:py-12 px-6">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-10 items-center bg-white rounded-[2rem] p-6 md:p-10 shadow-2xl border border-gray-100 animate-fade-in">
        <div className="space-y-6">
          <div>
            <span className="text-emerald-600 font-black tracking-[0.2em] text-[8px] uppercase bg-emerald-50 px-2.5 py-1 rounded-full italic">Logistics Hub</span>
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 mt-3 tracking-tighter italic leading-tight">
              Identify Your <br /><span className="text-emerald-500">Destination</span>
            </h1>
            <p className="text-gray-400 font-medium text-[10px] mt-1.5">Provide your delivery coordinates for a seamless arrival.</p>
          </div>

          <form onSubmit={save} className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field py-2 text-xs" placeholder="Given Name" value={form.firstName} onChange={e => upd("firstName", e.target.value)} required />
              <input className="input-field py-2 text-xs" placeholder="Family Name" value={form.lastName} onChange={e => upd("lastName", e.target.value)} required />
            </div>
            <input className="input-field py-2 text-xs" placeholder="Digital Address (Email)" type="email" value={form.email} onChange={e => upd("email", e.target.value)} required />
            <input className="input-field py-2 text-xs" placeholder="Primary Way (Street)" value={form.street} onChange={e => upd("street", e.target.value)} required />
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field py-2 text-xs" placeholder="City Hub" value={form.city} onChange={e => upd("city", e.target.value)} required />
              <input className="input-field py-2 text-xs" placeholder="State/Territory" value={form.state} onChange={e => upd("state", e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className="input-field py-2 text-xs" placeholder="Identity Code (Zip)" value={form.zipcode} onChange={e => upd("zipcode", e.target.value)} required />
              <input className="input-field py-2 text-xs" placeholder="Nation" value={form.country} onChange={e => upd("country", e.target.value)} required />
            </div>
            <input className="input-field py-2 text-xs" placeholder="Signal Connection (Phone)" value={form.phone} onChange={e => upd("phone", e.target.value)} required />

            <button
              disabled={saving}
              className="w-full bg-gray-900 text-white font-black py-4 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-gray-100 text-[10px] uppercase tracking-widest italic mt-4 disabled:opacity-60"
            >
              {saving ? "Saving..." : "SECURE ADDRESS CORES"}
            </button>
          </form>
        </div>

        <div className="hidden lg:block relative group p-12">
          <div className="absolute inset-x-20 top-0 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
          <img src={assets.add_address_iamge} alt="" className="w-full h-auto drop-shadow-2xl transition-transform duration-700 group-hover:scale-105" />
          <div className="absolute inset-x-20 bottom-0 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}