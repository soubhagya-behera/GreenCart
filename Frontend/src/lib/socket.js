import { Client } from "@stomp/stompjs";
import { getToken } from "./api";

// Single shared STOMP client for the whole page.
//
// - one broker connection regardless of how many topics/components subscribe
//   (inventory + delivery + orders multiplexed over the same session)
// - authenticates with the project's existing JWT (same Bearer token as the
//   REST API), refreshed before every (re)connect so a renewed token is used
// - automatic reconnect with heartbeats; subscriptions are re-created after
//   every reconnect
// - reference counted: the connection closes ~1s after the last subscription
//   detaches (the delay absorbs React strict-mode double mounts and route
//   changes so we never thrash connections)

let client = null;
let teardownTimer = null;

// dest -> Set<handler>
const handlers = new Map();
// dest -> active STOMP subscription for the CURRENT connection
const subs = new Map();

function wsUrl() {
  const base =
    import.meta.env.VITE_API_URL || "http://localhost:8080";
  const url = new URL(base);
  const proto = url.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${url.host}/ws`;
}

function dispatch(dest, frame) {
  let data;
  try {
    data = JSON.parse(frame.body);
  } catch {
    return;
  }
  const set = handlers.get(dest);
  if (!set || !data) return;
  set.forEach((fn) => {
    try {
      fn(data);
    } catch (err) {
      console.error(`socket listener error (${dest})`, err);
    }
  });
}

function attach(dest) {
  if (!client || !client.connected || subs.has(dest)) return;
  subs.set(
    dest,
    client.subscribe(dest, (frame) => dispatch(dest, frame))
  );
}

function ensureClient() {
  if (teardownTimer) {
    clearTimeout(teardownTimer);
    teardownTimer = null;
  }
  if (client) return client;

  client = new Client({
    brokerURL: wsUrl(),
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    // Fresh token on first connect AND on every automatic reconnect.
    beforeConnect: (c) => {
      const t = getToken();
      c.connectHeaders = t ? { Authorization: `Bearer ${t}` } : {};
    },

    // New connection: (re)create every destination's subscription.
    onConnect: () => {
      handlers.forEach((_set, dest) => attach(dest));
    },

    // Subscriptions die with the socket; recreated by onConnect.
    onWebSocketClose: () => subs.clear(),

    onStompError: (frame) => {
      console.error("STOMP error", frame.headers?.message);
    },
    onWebSocketError: () => {
      // Reconnect loop handles recovery; nothing else to do here.
    },
  });

  client.activate();
  return client;
}

export function subscribeTopic(dest, handler) {
  if (!handlers.has(dest)) handlers.set(dest, new Set());
  const first = handlers.get(dest).size === 0;
  handlers.get(dest).add(handler);

  ensureClient();
  if (first) attach(dest);
  else if (client?.connected && !subs.has(dest)) attach(dest);

  return () => {
    const set = handlers.get(dest);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) {
      handlers.delete(dest);
      try {
        subs.get(dest)?.unsubscribe();
      } catch {
        /* connection may already be gone */
      }
      subs.delete(dest);
      scheduleTeardown();
    }
  };
}

function scheduleTeardown() {
  if (handlers.size > 0) return; // another topic took over
  if (teardownTimer) clearTimeout(teardownTimer);
  teardownTimer = setTimeout(() => {
    teardownTimer = null;
    if (handlers.size === 0) {
      try {
        client?.deactivate();
      } catch {
        /* already down */
      }
      client = null;
      subs.clear();
    }
  }, 1000);
}
