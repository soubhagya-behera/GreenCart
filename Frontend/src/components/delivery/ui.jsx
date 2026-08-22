import { errorMessage } from "../../lib/api";

// ---- formatting ---------------------------------------------------------

const STATUS_PILL = {
  Processing: "bg-blue-50 text-blue-600 border-blue-100",
  Confirmed: "bg-sky-50 text-sky-600 border-sky-100",
  Packed: "bg-purple-50 text-purple-600 border-purple-100",
  Shipped: "bg-indigo-50 text-indigo-600 border-indigo-100",
  "Picked Up": "bg-amber-50 text-amber-600 border-amber-100",
  OutForDelivery: "bg-emerald-50 text-emerald-600 border-emerald-100",
  Delivered: "bg-gray-100 text-gray-500 border-gray-200",
  Cancelled: "bg-red-50 text-red-600 border-red-100",
};

export function StatusPill({ status }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap ${
        STATUS_PILL[status] || STATUS_PILL.Processing
      }`}
    >
      {status === "OutForDelivery" ? "Out for Delivery" : status || "—"}
    </span>
  );
}

export function PaymentTag({ method, status }) {
  const isCod = String(method || "").toUpperCase() === "COD";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest ${
          isCod ? "bg-amber-50 text-amber-700" : "bg-violet-50 text-violet-700"
        }`}
      >
        {isCod ? "Cash on Delivery" : method === "UPI" ? "UPI (Paid Online)" : method || "—"}
      </span>
      <span
        className={`text-[9px] font-black uppercase tracking-widest ${
          String(status).toLowerCase() === "paid" ? "text-emerald-600" : "text-gray-400"
        }`}
      >
        {status || ""}
      </span>
    </span>
  );
}

export function EmptyState({ icon = "📦", title, message }) {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-2xl border border-dashed border-gray-200">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-sm font-black text-gray-900 mb-1">{title}</h3>
      <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">{message}</p>
    </div>
  );
}

export function SkeletonCards({ count = 3, height = "h-28" }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`bg-white rounded-2xl border border-gray-100 ${height} skeleton`} />
      ))}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="bg-white border border-red-100 rounded-2xl p-6 text-center mb-5">
      <p className="text-xs font-black text-red-500 uppercase tracking-widest">
        {errorMessage(error)}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
