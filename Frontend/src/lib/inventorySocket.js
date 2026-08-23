import { subscribeTopic } from "./socket";

const TOPIC = "/topic/inventory";

// Inventory stock updates over the shared page connection.
export function subscribeInventory(onEvent) {
  return subscribeTopic(TOPIC, (data) => {
    if (
      !data ||
      typeof data.productId !== "number" ||
      typeof data.stock !== "number"
    ) {
      return;
    }
    onEvent(data);
  });
}
