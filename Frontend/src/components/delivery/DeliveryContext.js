import { createContext, useContext } from "react";

// Shared state for the Delivery Partner portal shell.
// Layout owns availability + live-event fan-out; pages consume them here.
const DeliveryPortalContext = createContext(null);

export function useDeliveryPortal() {
  const ctx = useContext(DeliveryPortalContext);
  if (!ctx) {
    throw new Error(
      "useDeliveryPortal must be used within <DeliveryLayout>"
    );
  }
  return ctx;
}

export default DeliveryPortalContext;
