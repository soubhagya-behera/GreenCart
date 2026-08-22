import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useDeliveryPortal } from "./DeliveryContext";

export function orderId(o) {
  return `#${String(o?.id ?? "").padStart(8, "0")}`;
}

// Orders assigned to this partner. Auto-refreshes on live WS events
// (refreshKey bumps) and every 30s as a fallback.
export function useMyDeliveryOrders() {
  const { refreshKey } = useDeliveryPortal();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () =>
    api("/delivery/orders", { auth: true })
      .then((list) => {
        setOrders(Array.isArray(list) ? list : []);
        setError(null);
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [refreshKey]);

  return { orders, loading, error, reload: load };
}

// Overview stats from /delivery/overview (all real figures).
export function useDeliveryOverview() {
  const { refreshKey } = useDeliveryPortal();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/delivery/overview", { auth: true })
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return { overview, loading };
}

// Available requests from /delivery/requests.
export function useDeliveryRequests() {
  const { refreshKey } = useDeliveryPortal();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = () =>
    api("/delivery/requests", { auth: true })
      .then((list) => {
        setRequests(Array.isArray(list) ? list : []);
        setError(null);
      })
      .catch((e) => setError(e))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [refreshKey]);

  return { requests, loading, error, reload: load };
}
