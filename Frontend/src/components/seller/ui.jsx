// Generic visual primitives shared across Seller Portal pages.
// Mirrors the Admin Console's design language without importing admin code.

const STATUS_PILL_STYLES = {
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
  // Listing states
  active: "bg-emerald-50 text-emerald-600 border-emerald-100",
  inactive: "bg-gray-100 text-gray-500 border-gray-200",
};

export function StatusPill({ value }) {
  const label = String(value ?? "-");
  const style =
    STATUS_PILL_STYLES[label.toLowerCase()] ||
    "bg-gray-100 text-gray-500 border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${style}`}
    >
      {label === "OutForDelivery" ? "Out for Delivery" : label}
    </span>
  );
}

export function Panel({ title, subtitle, actions, children, className = "" }) {
  return (
    <section
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${className}`}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-50">
          <div>
            {title && (
              <h2 className="text-base md:text-lg font-black text-gray-900 tracking-tight italic">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      {children}
    </section>
  );
}

export function MicroLabel({ children, className = "" }) {
  return (
    <p
      className={`text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 ${className}`}
    >
      {children}
    </p>
  );
}

export function EmptyState({ icon = "◻", title, message }) {
  return (
    <div className="px-6 py-14 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl text-gray-300 mb-4">
        {icon}
      </div>
      <p className="text-xs font-black uppercase tracking-widest text-gray-400">
        {title}
      </p>
      {message && (
        <p className="text-xs text-gray-400 mt-1.5 max-w-xs mx-auto leading-relaxed">
          {message}
        </p>
      )}
    </div>
  );
}

export function ErrorState({ error, onRetry, retryLabel = "Retry" }) {
  if (!error) return null;
  return (
    <div className="bg-white rounded-2xl border border-red-100 p-10 text-center">
      <p className="text-sm font-black text-red-500 uppercase tracking-widest">
        {error}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-colors"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-4">
              <div
                className={`h-3.5 bg-gray-100 rounded-full animate-pulse ${
                  c === 0 ? "w-3/4" : "w-1/2"
                }`}
              />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function MiniBar({ ratio = 0, tone = "emerald" }) {
  const tones = {
    emerald: "from-emerald-400 to-green-500",
    violet: "from-violet-400 to-purple-500",
  };
  return (
    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden min-w-[64px]">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${tones[tone] || tones.emerald}`}
        style={{ width: `${Math.min(100, Math.max(6, ratio * 100))}%` }}
      />
    </div>
  );
}

export function HealthRow({ label, value, tone = "text-gray-800", onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`w-full flex items-center justify-between px-0 ${
        onClick ? "group text-left cursor-pointer" : ""
      }`}
    >
      <span className="text-xs font-bold text-gray-500 group-hover:text-emerald-700 transition-colors">
        {label}
      </span>
      <span className={`text-lg font-black tabular-nums ${tone}`}>
        {value}
        {onClick && (
          <span className="inline-block ml-1.5 text-[9px] font-black uppercase tracking-widest text-gray-300 group-hover:text-emerald-500 transition-colors">
            →
          </span>
        )}
      </span>
    </Tag>
  );
}

export function RefreshButton({ onClick, label = "Refresh" }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:border-emerald-300 text-gray-600 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl transition-colors"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      {label}
    </button>
  );
}

export function formatOrderId(id) {
  return `#${String(id ?? 0).padStart(8, "0")}`;
}
