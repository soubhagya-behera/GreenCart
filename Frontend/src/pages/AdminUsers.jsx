import { useEffect, useMemo, useState } from "react";
import { api, errorMessage } from "../lib/api";
import PageHeader from "../components/admin/PageHeader";
import AdminDataTable from "../components/admin/AdminDataTable";
import RoleBadge from "../components/admin/RoleBadge";
import { useDialog } from "../components/common/DialogContext";

const ROLES = ["user", "seller", "delivery", "admin"];

export default function AdminUsers({ currentUser }) {
  const { alert, confirm } = useDialog();
  const [state, setState] = useState({ loading: true, error: null, users: [] });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [savingId, setSavingId] = useState(null);

  const fetchData = () => {
    api("/admin/users", { auth: true })
      .then((data) =>
        setState({ loading: false, error: null, users: Array.isArray(data) ? data : [] })
      )
      .catch((e) =>
        setState({ loading: false, error: errorMessage(e), users: [] })
      );
  };

  const refresh = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.users.filter((u) => {
      if (roleFilter !== "all" && (u.role || "").toLowerCase() !== roleFilter)
        return false;
      if (!q) return true;
      return [u.name, u.email, u.phone, u.storeName]
        .some((v) => (v || "").toLowerCase().includes(q));
    });
  }, [state.users, search, roleFilter]);

  async function changeRole(user, nextRole) {
    if ((user.role || "").toLowerCase() === nextRole) return;

    const ok = await confirm({
      title: "Change Role",
      message: `${user.name || user.email}: "${user.role}" → "${nextRole}"?`,
      confirmText: "Update Role",
      cancelText: "Cancel",
    });
    if (!ok) return;

    setSavingId(user.id);
    try {
      const updated = await api(`/admin/users/${user.id}/role`, {
        method: "PUT",
        body: { role: nextRole },
        auth: true,
      });
      setState((s) => ({
        ...s,
        users: s.users.map((u) => (u.id === user.id ? { ...u, ...updated } : u)),
      }));
      await alert({
        title: "Role Updated",
        message: `${updated.name || updated.email} is now a ${updated.role}.`,
        type: "success",
      });
    } catch (e) {
      await alert({
        title: "Update Failed",
        message: errorMessage(e),
        type: "error",
      });
    } finally {
      setSavingId(null);
    }
  }

  const isSelf = (u) =>
    currentUser && (u.id === currentUser.id || u.email === currentUser.email);

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={`${state.users.length} registered accounts on the platform.`}
      />

      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <input
          className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-400"
          placeholder="Search by name, email, phone or store…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-1.5 overflow-x-auto">
          {["all", ...ROLES].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors ${
                roleFilter === r
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-500 hover:border-emerald-300"
              }`}
            >
              {r === "all" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      <AdminDataTable
        loading={state.loading}
        error={state.error}
        onRetry={refresh}
        rows={filtered}
        emptyTitle="No users match"
        emptyMessage="Adjust the search or role filter."
        columns={[
          {
            key: "name",
            label: "User",
            render: (u) => (
              <div className="text-xs">
                <p className="font-black text-gray-900">
                  {u.name || "-"}
                  {isSelf(u) && (
                    <span className="ml-2 text-[9px] text-emerald-600 uppercase tracking-widest">
                      (you)
                    </span>
                  )}
                </p>
                <p className="text-gray-400">{u.email}</p>
              </div>
            ),
          },
          { key: "role", label: "Role", render: (u) => <RoleBadge role={u.role} /> },
          {
            key: "verified",
            label: "Verified",
            render: (u) =>
              u.verified ? (
                <span className="text-emerald-600 font-black text-xs">✓</span>
              ) : (
                <span className="text-red-400 font-black text-xs">✗</span>
              ),
          },
          {
            key: "phone",
            label: "Phone",
            render: (u) => (
              <span className="text-xs text-gray-500">{u.phone || "-"}</span>
            ),
          },
          {
            key: "storeName",
            label: "Store",
            render: (u) =>
              u.storeName ? (
                <span className="text-xs font-bold text-emerald-700">{u.storeName}</span>
              ) : (
                <span className="text-xs text-gray-300">—</span>
              ),
          },
          {
            key: "actions",
            label: "Change Role",
            render: (u) => (
              <select
                value={(u.role || "user").toLowerCase()}
                disabled={isSelf(u) || savingId === u.id}
                onChange={(e) => changeRole(u, e.target.value)}
                className={`border rounded-lg px-2 py-1.5 text-[11px] font-bold bg-white outline-none focus:border-emerald-400 ${
                  isSelf(u)
                    ? "opacity-40 cursor-not-allowed"
                    : "cursor-pointer hover:border-emerald-300"
                }`}
                title={
                  isSelf(u)
                    ? "You cannot change your own role"
                    : "Select a new role for this user"
                }
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            ),
          },
        ]}
      />
    </>
  );
}
