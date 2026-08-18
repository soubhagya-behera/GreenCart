import { Client } from "@stomp/stompjs";

const TOPIC = "/topic/inventory";

let client = null;
let subscribed = false;
const listeners = new Set();

function wsUrl() {
  const base =
    import.meta.env.VITE_API_URL || "http://localhost:8080";
  const url = new URL(base);
  const proto = url.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${url.host}/ws`;
}

function handleMessage(frame) {
  let data;
  try {
    data = JSON.parse(frame.body);
  } catch {
    return;
  }
  if (
    !data ||
    typeof data.productId !== "number" ||
    typeof data.stock !== "number"
  ) {
    return;
  }
  listeners.forEach((fn) => {
    try {
      fn(data);
    } catch (err) {
      console.error("inventory listener error", err);
    }
  });
}

function ensureClient() {
  if (client) return client;

  client = new Client({
    brokerURL: wsUrl(),
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      if (!subscribed) {
        client.subscribe(TOPIC, handleMessage);
        subscribed = true;
      }
    },
    onStompError: (frame) => {
      console.error("STOMP error", frame.headers?.message);
    },
    onWebSocketError: () => {
      console.error("WebSocket error");
    },
  });

  client.activate();
  return client;
}

export function subscribeInventory(onEvent) {
  listeners.add(onEvent);
  ensureClient();
  return () => {
    listeners.delete(onEvent);
  };
}