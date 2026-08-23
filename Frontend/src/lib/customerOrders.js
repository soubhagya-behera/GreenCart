// Shared, module-level store of THIS customer's orders.
//
// Every entry originates from the backend — either a REST response
// (checkout / payment verify / GET /orders/my) or an existing entry merged
// with a WebSocket lifecycle patch. Nothing is ever fabricated client-side.
//
// State behaves like Map<OrderId, Order>: the same order can never appear
// twice, no matter how many times the checkout response, ORDER_CREATED /
// NEW_REQUEST events and refetches arrive.

const orders = new Map();
const listeners = new Set();
let snapshot = [];

function emit() {
  snapshot = [...orders.values()].sort((a, b) => b.id - a.id);
  listeners.forEach((fn) => {
    try { fn(snapshot); } catch { /* listener errors are its own problem */ }
  });
}

export function getOrders() {
  return snapshot;
}

// Merge full backend order objects into the store (field-wise upsert keyed
// by id). Safe to call repeatedly with the same order — idempotent.
export function upsertOrders(list) {
  let changed = false;
  (Array.isArray(list) ? list : [list]).forEach((o) => {
    if (!o || o.id == null) return;
    const current = orders.get(o.id);
    orders.set(o.id, current ? { ...current, ...o } : o);
    changed = true;
  });
  if (changed) emit();
}

export function upsertOrder(order) {
  upsertOrders([order]);
}

// Apply a partial patch (e.g. from a WebSocket event) to an EXISTING entry.
// Never creates entries — a patch alone is not enough data to render an
// order card, so unknown ids are ignored and handled via refetch instead.
// Returns true when a known order was patched.
export function patchKnownOrder(id, patch) {
  if (id == null || !patch) return false;
  const current = orders.get(id);
  if (!current) return false;
  const next = { ...current, ...patch };
  if (next === current) return false;
  upsertOrders(next);
  return true;
}

export function subscribeOrders(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
