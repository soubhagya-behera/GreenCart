import { useState } from "react";
import { api, fileUrl, errorMessage } from "../lib/api";
import { useDialog } from "../components/common/DialogContext";

export default function SellerStore({ user, setUser }) {
  const { alert } = useDialog();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault();
    if (newPassword && !currentPassword) {
      await alert({
        title: "Missing Password",
        message: "Enter your current password to set a new one.",
        type: "error",
      });
      return;
    }

    setSaving(true);
    try {
      const body = { name, phone };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const updated = await api("/profile", {
        method: "PUT",
        body,
        auth: true,
      });
      setUser && setUser(updated);
      setCurrentPassword("");
      setNewPassword("");
      await alert({
        title: "Profile Saved",
        message: "Your store profile has been updated.",
        type: "success",
      });
    } catch (err) {
      await alert({
        title: "Save Failed",
        message: errorMessage(err),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Store identity */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-4 mb-6">
            <img
              src={user?.avatarUrl ? fileUrl(user.avatarUrl) : "/placeholder.png"}
              onError={(e) => { e.currentTarget.src = "/placeholder.png"; }}
              alt=""
              className="w-16 h-16 rounded-2xl bg-gray-50 object-cover border border-gray-100"
            />
            <div className="min-w-0">
              <p className="text-lg font-black text-gray-900 tracking-tight truncate">
                {user?.storeName || user?.name || "My Store"}
              </p>
              <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600">
                Seller account
              </span>
            </div>
          </div>
          <dl className="space-y-3 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-[9px] font-black uppercase tracking-widest text-gray-400 pt-0.5">
                Owner
              </dt>
              <dd className="font-bold text-gray-700 text-right">{user?.name || "-"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[9px] font-black uppercase tracking-widest text-gray-400 pt-0.5">
                Email
              </dt>
              <dd className="font-bold text-gray-700 text-right break-all">{user?.email || "-"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[9px] font-black uppercase tracking-widest text-gray-400 pt-0.5">
                Store
              </dt>
              <dd className="font-bold text-gray-700 text-right">{user?.storeName || "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[9px] font-black uppercase tracking-widest text-gray-400 pt-0.5">
                Verification
              </dt>
              <dd>
                {user?.verified ? (
                  <span className="text-emerald-600 font-black">Verified ✓</span>
                ) : (
                  <span className="text-red-500 font-black">Unverified ✗</span>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-relaxed">
            Store name and email are managed by GreenCart platform administrators.
          </p>
        </div>

        {/* Editable profile */}
        <form
          onSubmit={save}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
        >
          <h3 className="text-lg font-black text-gray-900 tracking-tight italic mb-1">
            Account Details
          </h3>
          <p className="text-xs text-gray-400 mb-6">
            Update how customers and couriers contact you.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Owner Name
              </label>
              <input
                className="mt-1.5 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Phone
              </label>
              <input
                className="mt-1.5 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
            Change Password (optional)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400"
              placeholder="Current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
            <input
              type="password"
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            disabled={saving}
            className="bg-gradient-to-r from-emerald-600 to-green-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-[0.2em] px-8 py-3.5 rounded-xl hover:scale-[1.02] transition-all"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </>
  );
}
