import { fileUrl } from "../lib/api";
import { assets } from "../assets/greencart/greencart_assets/assets";
import { useDeliveryPortal } from "../components/delivery/DeliveryContext";
import { useMyDeliveryOrders } from "../components/delivery/useDeliveryData";

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 shrink-0">
        {label}
      </span>
      <span className="text-xs font-bold text-gray-800 text-right break-words">{value || "—"}</span>
    </div>
  );
}

export default function DeliveryProfile() {
  const { user, online, toggleAvailability, toggling } = useDeliveryPortal();
  const { orders } = useMyDeliveryOrders();

  const completed = orders.filter((o) => o.orderStatus === "Delivered").length;
  const active = orders.filter((o) => o.orderStatus === "Picked Up" || o.orderStatus === "OutForDelivery").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">
          Account
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-1">
          Partner Profile
        </h1>
      </div>

      {/* Identity card */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <img
            src={user?.avatarUrl ? fileUrl(user.avatarUrl) : assets.profile_icon}
            onError={(e) => { e.currentTarget.src = assets.profile_icon; }}
            alt=""
            className="w-20 h-20 rounded-2xl object-cover bg-gray-50 border border-gray-100"
          />
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">{user?.name || "Partner"}</h2>
            <p className="text-xs font-bold text-gray-400 mt-0.5">{user?.email || "—"}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-black uppercase tracking-widest text-emerald-700">
              🛵 Delivery Partner
            </span>
          </div>

          {/* Availability */}
          <button
            onClick={toggleAvailability}
            disabled={toggling}
            aria-pressed={online}
            className={`sm:ml-auto self-center sm:self-auto inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest leading-none transition-colors ${
              online
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-gray-100 border-gray-200 text-gray-500"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${online ? "bg-emerald-200 animate-pulse" : "bg-gray-400"}`} />
            {toggling ? "…" : online ? "Online" : "Offline"}
          </button>
        </div>
      </section>

      {/* Account information — existing auth data only */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-2">
        <h3 className="text-sm font-black text-gray-900 pt-4 pb-1">Account Information</h3>
        <InfoRow label="Name" value={user?.name} />
        <InfoRow label="Email" value={user?.email} />
        <InfoRow label="Phone" value={user?.phone} />
        <InfoRow label="Role" value="delivery" />
        <InfoRow
          label="Delivery Status"
          value={
            active > 0
              ? `Delivering · ${active} active order${active === 1 ? "" : "s"}`
              : online
              ? "Online · Available"
              : "Offline"
          }
        />
      </section>

      {/* Work summary — real counts from assigned orders */}
      <section className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Deliveries</p>
          <p className="text-2xl font-black text-blue-600 tabular-nums mt-1.5">{active}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Completed</p>
          <p className="text-2xl font-black text-emerald-600 tabular-nums mt-1.5">{completed}</p>
        </div>
      </section>
    </div>
  );
}
