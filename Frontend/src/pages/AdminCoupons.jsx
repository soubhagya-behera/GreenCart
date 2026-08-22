import { useEffect, useState } from "react";
import { api, errorMessage } from "../lib/api";
import PageHeader from "../components/admin/PageHeader";
import AdminDataTable from "../components/admin/AdminDataTable";
import StatusBadge from "../components/admin/StatusBadge";
import { useDialog } from "../components/common/DialogContext";
import { formatDate, formatINR } from "../lib/orderStatuses";

const BLANK = {
  code: "",
  discountPercent: "",
  minAmount: "",
  expiryDate: "",
  active: true,
};

function toInputValue(iso) {
  if (!iso) return "";
  return String(iso).slice(0, 16);
}

export default function AdminCoupons() {
  const { alert, confirm } = useDialog();
  const [state, setState] = useState({ loading: true, error: null, coupons: [] });
  const [form, setForm] = useState(null); // null = list mode
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState("");

  const fetchData = () => {
    api("/admin/coupons", { auth: true })
      .then((data) =>
        setState({
          loading: false,
          error: null,
          coupons: Array.isArray(data) ? data : [],
        })
      )
      .catch((e) =>
        setState({ loading: false, error: errorMessage(e), coupons: [] })
      );
  };

  const refresh = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  function openCreate() {
    setEditingId(null);
    setFieldError("");
    setForm({ ...BLANK });
  }

  function openEdit(coupon) {
    setEditingId(coupon.id);
    setFieldError("");
    setForm({
      code: coupon.code || "",
      discountPercent: coupon.discountPercent ?? "",
      minAmount: coupon.minAmount ?? "",
      expiryDate: toInputValue(coupon.expiryDate),
      active: coupon.active !== false,
    });
  }

  function validate() {
    const code = form.code.trim().toUpperCase();
    if (!code) return "Coupon code is required.";
    const pct = Number(form.discountPercent);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 100)
      return "Discount must be between 1 and 100 percent.";
    const min = Number(form.minAmount);
    if (!Number.isFinite(min) || min < 0)
      return "Minimum amount must be zero or more.";
    return "";
  }

  async function save(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFieldError(err);
      return;
    }

    const body = {
      code: form.code.trim().toUpperCase(),
      discountPercent: Number(form.discountPercent),
      minAmount: Number(form.minAmount),
      active: form.active,
      ...(form.expiryDate
        ? { expiryDate: new Date(form.expiryDate).toISOString().slice(0, 19) }
        : {}),
    };

    setSaving(true);
    try {
      if (editingId) {
        await api(`/admin/coupons/${editingId}`, {
          method: "PUT",
          body,
          auth: true,
        });
      } else {
        await api("/admin/coupons", { method: "POST", body, auth: true });
      }
      setForm(null);
      setEditingId(null);
      refresh();
      await alert({
        title: editingId ? "Coupon Updated" : "Coupon Created",
        message: `${body.code} saved successfully.`,
        type: "success",
      });
    } catch (ex) {
      await alert({ title: "Save Failed", message: errorMessage(ex), type: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(coupon) {
    try {
      await api(`/admin/coupons/${coupon.id}`, {
        method: "PUT",
        body: { active: !coupon.active },
        auth: true,
      });
      refresh();
    } catch (e) {
      await alert({ title: "Update Failed", message: errorMessage(e), type: "error" });
    }
  }

  async function remove(coupon) {
    const ok = await confirm({
      title: "Delete Coupon",
      message: `Permanently delete "${coupon.code}"? This cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
      danger: true,
      loadingText: "Deleting...",
      onConfirm: async () => {
        await api(`/admin/coupons/${coupon.id}`, { method: "DELETE", auth: true });
      },
    });
    if (!ok) return;
    await alert({
      title: "Coupon Deleted",
      message: `${coupon.code} has been removed.`,
      type: "success",
    });
    refresh();
  }

  const isExpired = (c) =>
    c.expiryDate && new Date(c.expiryDate).getTime() < Date.now();

  return (
    <>
      <PageHeader
        title="Coupons"
        subtitle={`${state.coupons.length} discount codes configured for the store.`}
        actions={
          form ? (
            <button
              onClick={() => { setForm(null); setEditingId(null); }}
              className="bg-white border border-gray-200 text-gray-600 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl hover:border-gray-400 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={openCreate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-sm transition-colors"
            >
              + New Coupon
            </button>
          )
        }
      />

      {form && (
        <form
          onSubmit={save}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Code
            </label>
            <input
              className="mt-1.5 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm uppercase font-bold outline-none focus:border-emerald-400"
              placeholder="FRESH20"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Discount %
            </label>
            <input
              type="number"
              min="1"
              max="100"
              step="0.5"
              className="mt-1.5 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400"
              value={form.discountPercent}
              onChange={(e) =>
                setForm({ ...form, discountPercent: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Minimum Order Amount (₹)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              className="mt-1.5 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400"
              value={form.minAmount}
              onChange={(e) => setForm({ ...form, minAmount: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Expiry
            </label>
            <input
              type="datetime-local"
              className="mt-1.5 w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400"
              value={form.expiryDate}
              onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
            />
          </div>
          <label className="flex items-center gap-2.5 text-xs font-bold text-gray-600 md:col-span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="w-4 h-4 accent-emerald-600"
            />
            Active and redeemable
          </label>

          {fieldError && (
            <p className="md:col-span-2 text-xs font-black text-red-500">
              {fieldError}
            </p>
          )}

          <div className="md:col-span-2">
            <button
              disabled={saving}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white text-xs font-black uppercase tracking-[0.2em] py-3.5 rounded-xl hover:scale-[1.01] transition-all disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Update Coupon" : "Create Coupon"}
            </button>
          </div>
        </form>
      )}

      <AdminDataTable
        loading={state.loading}
        error={state.error}
        onRetry={refresh}
        rows={state.coupons}
        emptyTitle="No coupons yet"
        emptyMessage="Create your first discount code with the button above."
        columns={[
          {
            key: "code",
            label: "Code",
            render: (c) => (
              <span className="text-xs font-black text-gray-900 tracking-wider">
                {c.code}
              </span>
            ),
          },
          {
            key: "discountPercent",
            label: "Discount",
            render: (c) => (
              <span className="text-sm font-black text-emerald-600">
                {c.discountPercent}%
              </span>
            ),
          },
          {
            key: "minAmount",
            label: "Min Order",
            render: (c) => (
              <span className="text-xs text-gray-500">{formatINR(c.minAmount)}</span>
            ),
          },
          {
            key: "expiryDate",
            label: "Expiry",
            render: (c) => {
              const expired = isExpired(c);
              return (
                <span
                  className={`text-xs whitespace-nowrap ${
                    expired ? "text-red-500 font-bold" : "text-gray-500"
                  }`}
                >
                  {formatDate(c.expiryDate)}
                  {expired && " · expired"}
                </span>
              );
            },
          },
          {
            key: "active",
            label: "Status",
            render: (c) => (
              <StatusBadge
                value={
                  isExpired(c)
                    ? "Inactive"
                    : c.active === false
                    ? "Inactive"
                    : "Active"
                }
              />
            ),
          },
          {
            key: "actions",
            label: "Actions",
            align: "right",
            render: (c) => (
              <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                <button
                  onClick={() => toggleActive(c)}
                  className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  {c.active === false ? "Enable" : "Disable"}
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="text-[9px] font-black uppercase tracking-widest text-gray-600 bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:border-emerald-300 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(c)}
                  className="text-[9px] font-black uppercase tracking-widest text-red-500 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
