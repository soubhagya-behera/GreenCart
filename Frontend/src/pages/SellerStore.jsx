import { useState } from "react";
import { api, fileUrl, errorMessage } from "../lib/api";
import { assets } from "../assets/greencart/greencart_assets/assets";
import { useDialog } from "../components/common/DialogContext";
import { Panel, StatusPill } from "../components/seller/ui";

export default function SellerStore({ user, setUser }) {
  const { alert } = useDialog();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [annTitle, setAnnTitle] = useState("");
  const [annMessage, setAnnMessage] = useState("");
  const [sending, setSending] = useState(false);

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
      const updated = await api("/auth/profile", {
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

  async function sendAnnouncement(e) {
    e.preventDefault();
    setSending(true);
    try {
      await api("/newsletter/announce", {
        method: "POST",
        body: { title: annTitle, message: annMessage },
        auth: true,
      });
      await alert({
        title: "Announcement Sent",
        message: "Announcement sent to subscribers!",
        type: "success",
      });
      setAnnTitle("");
      setAnnMessage("");
    } catch (err) {
      await alert({
        title: "Send Failed",
        message: err.message || "Failed to send",
        type: "error",
      });
    } finally {
      setSending(false);
    }
  }

  const inputCls =
    "mt-1.5 w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400";
  const labelCls =
    "text-[10px] font-black uppercase tracking-widest text-gray-400";

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            Store Profile
          </h1>
          <p className="text-sm text-gray-500 mt-1.5">
            Your store identity and account settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Store identity */}
        <Panel title="Store Identity">
          <div className="px-6 py-5">
            <div className="flex items-center gap-4 mb-6">
              <img
                src={user?.avatarUrl ? fileUrl(user.avatarUrl) : assets.profile_icon}
                onError={(e) => { e.currentTarget.src = assets.profile_icon; }}
                alt=""
                className="w-16 h-16 rounded-2xl bg-gray-50 object-cover border border-gray-100"
              />
              <div className="min-w-0">
                <p className="text-lg font-black text-gray-900 tracking-tight truncate">
                  {user?.storeName || user?.name || "My Store"}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-0.5">
                  Store Operator
                </p>
              </div>
            </div>

            <dl className="space-y-4 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className={labelCls}>Store Name</dt>
                <dd className="font-bold text-gray-700 text-right truncate">
                  {user?.storeName || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className={labelCls}>Seller Name</dt>
                <dd className="font-bold text-gray-700 text-right truncate">
                  {user?.name || "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className={labelCls}>Email</dt>
                <dd className="font-bold text-gray-700 text-right break-all max-w-[180px]">
                  {user?.email || "-"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className={labelCls}>Phone</dt>
                <dd className="font-bold text-gray-700 text-right">
                  {user?.phone || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className={labelCls}>Store Status</dt>
                <dd>
                  <StatusPill value={user?.verified ? "Active" : "Pending"} />
                </dd>
              </div>
            </dl>

            <p className="mt-6 text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-relaxed">
              Store name and email are managed by GreenCart platform administrators.
            </p>
          </div>
        </Panel>

        {/* Editable account details */}
        <form
          onSubmit={save}
          className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm"
        >
          <header className="px-6 py-4 border-b border-gray-50">
            <h2 className="text-base md:text-lg font-black text-gray-900 tracking-tight italic">
              Account Details
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Update how customers and couriers contact you
            </p>
          </header>

          <div className="px-6 py-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Seller Name</label>
                <input
                  className={inputCls}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  className={inputCls}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-50">
              <label className={labelCls}>
                Change Password (optional)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1.5">
                <input
                  type="password"
                  className={`!mt-0 ${inputCls}`}
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <input
                  type="password"
                  className={`!mt-0 ${inputCls}`}
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                disabled={saving}
                className="bg-gradient-to-r from-emerald-600 to-green-600 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-xl shadow-sm hover:scale-[1.02] transition-all"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Announcements */}
      <form
        onSubmit={sendAnnouncement}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm"
      >
        <header className="px-6 py-4 border-b border-gray-50">
          <h2 className="text-base md:text-lg font-black text-gray-900 tracking-tight italic">
            Store Announcement
          </h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
            Broadcast a message to newsletter subscribers
          </p>
        </header>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Subject / Title</label>
            <input
              className={inputCls}
              placeholder="e.g. Weekend fresh stock arrival"
              value={annTitle}
              onChange={(e) => setAnnTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Message</label>
            <textarea
              rows="3"
              className={inputCls}
              placeholder="Your message…"
              value={annMessage}
              onChange={(e) => setAnnMessage(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end">
            <button
              disabled={sending}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-colors"
            >
              {sending ? "Sending…" : "Send Announcement"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
