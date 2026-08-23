import { subscribeTopic } from "./socket";

const TOPIC = "/topic/delivery";

// Delivery/admin operational events over the shared page connection.
export function subscribeDelivery(onEvent) {
  return subscribeTopic(TOPIC, (data) => {
    // Order lifecycle events carry a type + orderId; PARTNER_STATUS
    // carries partnerId instead. Anything else is ignored.
    const ok =
      typeof data.type === "string" &&
      (typeof data.orderId === "number" ||
        typeof data.partnerId === "number");
    if (ok) onEvent(data);
  });
}
