import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import { subscribeDelivery } from "../../lib/deliverySocket";
import { useDeliveryPortal } from "./DeliveryContext";

export function orderId(o) { return `#${String(o?.id ?? "").padStart(8, "0")}`; }

// List state behaves like Map<OrderId, Item>: responses are keyed by id so
// neither duplicate events nor overlapping refetches can ever render the
// same order twice.
function uniqueById(list) {
  const seen = new Set();
  const out = [];
  (Array.isArray(list) ? list : []).forEach((item) => {
    if (item == null || item.id == null || seen.has(item.id)) return;
    seen.add(item.id);
    out.push(item);
  });
  return out;
}

// Monotonic fetch guard: each load takes a sequence number and only the
// newest one may write state. A slow stale response can therefore never
// resurrect a card that a newer state (accept/reject/assign) removed.
function useSequencedLoad() {
  const seq = useRef(0);
  return useCallback((fetcher, apply) => {
    const mine = ++seq.current;
    return fetcher()
      .then((res) => {
        if (mine !== seq.current) return; // superseded by a newer load
        apply(res);
      })
      .catch((e) => {
        if (mine === seq.current) throw e;
      });
  }, []);
}

// Merge a lifecycle event into an existing assigned-order object so the UI
// moves instantly while the refreshKey reload is in flight.
function patchFromEvent(order, event) {
  if (!order || order.id !== event.orderId) return order;
  const next = { ...order };
  if (typeof event.orderStatus === "string") next.orderStatus = event.orderStatus;
  if (typeof event.paymentStatus === "string") next.paymentStatus = event.paymentStatus;
  if (event.type === "ACCEPTED" && event.deliveryPartnerName) {
    next.assignedDelivery = {
      id: event.deliveryPartnerId,
      name: event.deliveryPartnerName,
    };
    next.assignedAt = event.assignedAt || null;
  }
  if (event.type === "ORDER_COMPLETED" && event.deliveredAt) {
    next.deliveredAt = event.deliveredAt;
  }
  return next;
}

// Orders assigned to this partner (Active + History). Reloads on live WS
// events (refreshKey bumps) and every 30s as a fallback.
export function useMyDeliveryOrders() {
  const { refreshKey, user } = useDeliveryPortal();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sequenced = useSequencedLoad();

  const load = useCallback(() =>
    sequenced(
      () => api("/delivery/orders", { auth: true }),
      (list) => {
        setOrders(uniqueById(list));
        setError(null);
      }
    ).catch((e) => setError(e)).finally(() => setLoading(false)),
  [sequenced]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [refreshKey, load]);

  // Instant local transitions from authoritative events — no refetch wait.
  useEffect(() => {
    const off = subscribeDelivery((event) => {
      if (typeof event.orderId !== "number") return; // PARTNER_STATUS etc.
      switch (event.type) {
        case "ORDER_COMPLETED":
        case "PAYMENT_STATUS_CHANGED":
        case "ORDER_STATUS_CHANGED":
        case "CANCELLED":
          // Patch in place: Delivered/Cancelled orders leave Active and
          // land in History without waiting for the reload.
          setOrders((prev) =>
            prev.some((o) => o.id === event.orderId)
              ? prev.map((o) => patchFromEvent(o, event))
              : prev
          );
          break;
        default:
          break;
      }
    });
    return off;
  }, []);

  return { orders, loading, error, reload: load };
}

export function useDeliveryOverview() {
  const { refreshKey } = useDeliveryPortal();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sequenced = useSequencedLoad();

  const load = useCallback(() =>
    sequenced(
      () => api("/delivery/overview", { auth: true }),
      (data) => {
        setOverview(data);
        setError(null);
      }
    ).catch((e) => setError(e)).finally(() => setLoading(false)),
  [sequenced]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [refreshKey, load]);

  return { overview, loading, error, reload: load };
}

// Available delivery requests for THIS partner (server already hides the
// ones this partner rejected). One logical request per order.
export function useDeliveryRequests() {
  const { refreshKey, user } = useDeliveryPortal();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const sequenced = useSequencedLoad();

  const load = useCallback(() =>
    sequenced(
      () => api("/delivery/requests", { auth: true }),
      (list) => {
        setRequests(uniqueById(list));
        setError(null);
      }
    ).catch((e) => setError(e)).finally(() => setLoading(false)),
  [sequenced]);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [refreshKey, load]);

  // Real-time queue maintenance:
  //   ACCEPTED            → gone for every partner (someone claimed it)
  //   CANCELLED           → gone for every partner
  //   ORDER_COMPLETED     → gone (defensive: never listed anyway)
  //   DELIVERY_REJECTED   → gone ONLY for the rejecting partner
  // NEW_REQUEST is not applied locally (the card needs full DTO fields);
  // the layout's refreshKey bump pulls it with real data immediately.
  useEffect(() => {
    const myId = user?.id;
    const off = subscribeDelivery((event) => {
      if (typeof event.orderId !== "number") return;
      const remove =
        event.type === "ACCEPTED" ||
        event.type === "CANCELLED" ||
        event.type === "ORDER_COMPLETED" ||
        (event.type === "DELIVERY_REJECTED" &&
          myId != null &&
          event.partnerId === myId);
      if (!remove) return;
      setRequests((prev) =>
        prev.some((r) => r.id === event.orderId)
          ? prev.filter((r) => r.id !== event.orderId)
          : prev
      );
    });
    return off;
  }, [user?.id]);

  return { requests, loading, error, reload: load };
}
