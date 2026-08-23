import { subscribeTopic } from "./socket";

// Private per-user queue: the backend routes each event here only to the
// customer who owns the order (convertAndSendToUser by account email).
const CUSTOMER_QUEUE = "/user/queue/orders";

export function subscribeOrderEvents(onEvent) {
  return subscribeTopic(CUSTOMER_QUEUE, (data) => {
    if (!data || typeof data.type !== "string") return;
    if (typeof data.orderId !== "number") return;
    onEvent(data);
  });
}

// Merge an incoming lifecycle event into an existing order object.
// Returns the same reference when nothing applies. Preserves every field
// not present in the event (items, customer info, etc).
export function patchOrderWithEvent(order, event) {
  if (!order || !event || order.id !== event.orderId) return order;

  const next = { ...order };

  if (typeof event.orderStatus === "string") {
    next.orderStatus = event.orderStatus;
  }
  if (typeof event.paymentStatus === "string") {
    next.paymentStatus = event.paymentStatus;
  }

  // Assignment (ACCEPTED and later transitions carry the partner).
  if (event.type === "ACCEPTED" && event.deliveryPartnerName) {
    next.assignedDelivery = {
      id: event.deliveryPartnerId,
      name: event.deliveryPartnerName,
    };
    next.assignedAt = event.assignedAt || null;
  }

  // Completion stamp.
  if (event.type === "ORDER_COMPLETED" && event.deliveredAt) {
    next.deliveredAt = event.deliveredAt;
  }

  return next;
}
