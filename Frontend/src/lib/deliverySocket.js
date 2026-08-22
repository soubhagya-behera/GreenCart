import { Client } from "@stomp/stompjs";

const TOPIC = "/topic/delivery";

let client = null;
let refCount = 0;

function wsUrl() {
  const base =
    import.meta.env.VITE_API_URL || "http://localhost:8080";
  const url = new URL(base);
  const proto = url.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${url.host}/ws`;
}

// Reuses the shared STOMP endpoint; each subscriber gets its own
// subscription while one broker connection serves the whole page.
export function subscribeDelivery(onEvent) {
  if (!client) {
    client = new Client({
      brokerURL: wsUrl(),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onStompError: (frame) => {
        console.error("delivery socket STOMP error", frame.headers?.message);
      },
    });
    client.activate();
  }

  refCount += 1;

  let subscription = null;

  const attach = () => {
    if (client.connected && !subscription) {
      subscription = client.subscribe(TOPIC, (frame) => {
        let data;
        try {
          data = JSON.parse(frame.body);
        } catch {
          return;
        }
        if (!data || typeof data.type !== "string") return;
        onEvent(data);
      });
    }
  };

  // If already connected subscribe now, otherwise on the next connect.
  const prevOnConnect = client.onConnect;
  client.onConnect = () => {
    prevOnConnect?.();
    attach();
  };
  if (client.connected) attach();

  return () => {
    refCount -= 1;
    try {
      subscription?.unsubscribe();
    } catch { /* connection may already be gone */ }
    if (refCount <= 0) {
      client?.deactivate();
      client = null;
      refCount = 0;
    }
  };
}
