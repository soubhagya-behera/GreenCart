import { useEffect, useState } from "react";
import { api, apiForm, fileUrl } from "../lib/api";
import { assets } from "../assets/greencart/greencart_assets/assets";
import { navigate } from "../lib/router";

export default function Profile({ user, setUser }) {
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
    return () => { mounted = false; };
  }, [user, setUser]);

  async function saveProfile(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      await api("/auth/profile", { method: "PUT", body: { name, currentPassword, newPassword }, auth: true });
      const me = await api("/auth/me", { auth: true });
      setUser?.(me);
      setCurrentPassword("");
      setNewPassword("");
      alert("Profile updated");
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
      alert("Avatar updated");
    } catch (e) {
      alert(e.message || "Failed to upload avatar");
    }
  }

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-extrabold text-gray-800 mb-6">Your Profile</h1>
        <div className="flex items-center gap-4 mb-6">
          <img
            src={user?.avatarUrl ? fileUrl(user.avatarUrl) : assets.profile_icon}
            alt=""
            className="w-20 h-20 rounded-full object-cover border border-gray-200"
            onError={(e)=>{ e.currentTarget.src = assets.profile_icon; }}
          />
          <label className="inline-block">
            <span className="px-3 py-2 rounded-lg border border-gray-200 cursor-pointer bg-white">Change Avatar</span>
            <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
          </label>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Full Name</label>
            <input className="w-full border rounded-lg px-4 py-2" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Current Password</label>
              <input className="w-full border rounded-lg px-4 py-2" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">New Password</label>
              <input className="w-full border rounded-lg px-4 py-2" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
          </div>
          <button disabled={saving} className="px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold">
            {saving ? "Saving..." : "Save Changes"}
          </button>
          {err && <div className="text-sm text-red-600">{err}</div>}
        </form>
      </div>
    </section>
  );
}
