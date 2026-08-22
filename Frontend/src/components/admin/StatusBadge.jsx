const STATUS_STYLES = {
  // Order statuses (canonical backend values)
  "awaiting payment": "bg-amber-50 text-amber-600 border-amber-100",
  confirmed: "bg-teal-50 text-teal-600 border-teal-100",
  processing: "bg-blue-50 text-blue-600 border-blue-100",
  packed: "bg-sky-50 text-sky-600 border-sky-100",
  shipped: "bg-indigo-50 text-indigo-600 border-indigo-100",
  "picked up": "bg-cyan-50 text-cyan-600 border-cyan-100",
  outfordelivery: "bg-violet-50 text-violet-600 border-violet-100",
  delivered: "bg-emerald-50 text-emerald-600 border-emerald-100",
  cancelled: "bg-red-50 text-red-500 border-red-100",
  // Payment statuses
  paid: "bg-emerald-50 text-emerald-600 border-emerald-100",
  pending: "bg-amber-50 text-amber-600 border-amber-100",
  failed: "bg-red-50 text-red-500 border-red-100",
  refunded: "bg-gray-100 text-gray-500 border-gray-200",
  // Generic product/listing states
  active: "bg-emerald-50 text-emerald-600 border-emerald-100",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function StatusBadge({ value, prefix }) {
  const label = String(value ?? "-");
  const style =
    STATUS_STYLES[label.toLowerCase()] ||
    "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${style}`}
    >
      {prefix ? `${prefix} ` : ""}
      {label === "OutForDelivery" ? "Out for Delivery" : label}
    </span>
  );
}
