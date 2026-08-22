// Mirrors the backend OrderStatuses canonical values exactly.
export const ORDER_STATUS_OPTIONS = [
  "Awaiting Payment",
  "Confirmed",
  "Processing",
  "Packed",
  "Shipped",
  "Picked Up",
  "OutForDelivery",
  "Delivered",
  "Cancelled",
];

export const TERMINAL_ORDER_STATUSES = ["Delivered", "Cancelled"];

export function formatINR(value) {
  const n = Number(value ?? 0);
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
