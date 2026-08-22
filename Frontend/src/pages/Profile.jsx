import { useEffect, useState } from "react";
import { api, apiForm, fileUrl } from "../lib/api";
import { assets } from "../assets/greencart/greencart_assets/assets";
import { navigate } from "../lib/router";
import { useDialog } from "../components/common/DialogContext";

export default function Profile({ user, setUser }) {
  const { alert } = useDialog();
  const [name, setName] = useState(user?.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    async function ensureUser() {
      if (!user) {
        try {
          const me = await api("/auth/me", { auth: true });
          if (mounted) {
            setUser?.(me);
            setName(me.name || "");
          }
        } catch {
          navigate("/auth");
        }
      } else {
        setName(user.name || "");
      }
    }
    ensureUser();
    return () => {
      mounted = false;
    };
  }, [user, setUser]);

  async function saveProfile(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      await api("/auth/profile", {
        method: "PUT",
        body: { name, currentPassword, newPassword },
        auth: true,
      });
      const me = await api("/auth/me", { auth: true });
      setUser?.(me);
      setCurrentPassword("");
      setNewPassword("");
      await alert({
        title: "Profile Updated",
        message: "Profile updated",
        type: "success",
      });
    } catch (e) {
      setErr(e.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      await apiForm("/auth/avatar", fd, { auth: true });
      const me = await api("/auth/me", { auth: true });
      setUser?.(me);
      await alert({
        title: "Avatar Updated",
        message: "Avatar updated",
        type: "success",
      });
    } catch (e) {
      await alert({
        title: "Upload Failed",
        message: e.message || "Failed to upload avatar",
        type: "error",
      });
    }
  }

  return (
    <section className="bg-gray-50 min-h-screen">
      <div className="mx-auto max-w-4xl px-4 md:px-6 py-10 animate-fade-in">
        <span className="label-pill">Your Account</span>
        <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mt-3 mb-6 tracking-tight">
          Profile
        </h1>

        <div className="rounded-2xl bg-emerald-600 p-6 text-white shadow-sm mb-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10 text-center sm:text-left">
            <img
              src={user?.avatarUrl ? fileUrl(user.avatarUrl) : assets.profile_icon}
              alt=""
              className="w-20 h-20 rounded-full object-cover border-4 border-white/30 shadow-lg"
            />

            <div className="min-w-0">
              <h2 className="text-xl font-extrabold tracking-tight truncate">
                {user?.name}
              </h2>
              <p className="mt-1 text-white/80 text-sm truncate">{user?.email}</p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2.5 mt-4">
                <label className="inline-flex px-4 py-2 rounded-lg bg-white text-emerald-700 font-bold text-xs cursor-pointer hover:bg-emerald-50 transition-colors shadow-sm">
                  Change Avatar
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={uploadAvatar}
                  />
                </label>

                {user?.verified && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-700/50 text-[11px] font-bold uppercase tracking-wider">
                    ✓ Verified
                  </span>
                )}

                <button
                  onClick={() => {
                    localStorage.removeItem("token");
                    window.location.href = "/auth";
                  }}
                  className="px-4 py-2 rounded-lg bg-red-500/90 text-white font-bold text-xs hover:bg-red-600 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Account type</p>
            <p className="text-base font-extrabold text-gray-900 mt-1.5 capitalize">{user?.role || "—"}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Email</p>
            <p className="text-sm font-bold text-gray-900 mt-1.5 truncate">{user?.email || "—"}</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 px-4 py-3.5">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">Verification</p>
            <p className={`text-base font-extrabold mt-1 ${user?.verified ? "text-emerald-600" : "text-amber-500"}`}>
              {user?.verified ? "Verified ✓" : "Pending"}
            </p>
          </div>
        </div>

        <form
          onSubmit={saveProfile}
          className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 space-y-5"
        >
          <div>
            <h2 className="text-lg font-extrabold text-gray-900">Account Settings</h2>

            <p className="text-gray-500 text-sm mt-1">
              Update your name and password.
            </p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Full Name
            </label>
            <input
              className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Current Password
              </label>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                type="password"
                placeholder="Required to change password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                New Password
              </label>
              <input
                className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all"
                type="password"
                placeholder="Leave blank to keep current"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
          {err && (
            <div className="text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {err}
            </div>
          )}
          <button
            disabled={saving}
            className="btn-primary w-full !py-3 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </section>
  );
}