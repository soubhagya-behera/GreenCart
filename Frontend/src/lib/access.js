import { getToken } from "./api";

// Single source of truth for role-based portal routing.

export function homeFor(role) {
  if (role === "admin") return "/admin";
  if (role === "seller") return "/seller";
  if (role === "delivery") return "/delivery";
  return "/";
}

export function isSellerRoute(route) {
  return route === "/seller" || route.startsWith("/seller/");
}

export function isAdminRoute(route) {
  return route === "/admin" || route.startsWith("/admin/");
}

export function isDeliveryRoute(route) {
  return route === "/delivery" || route.startsWith("/delivery/");
}

const AUTH_REQUIRED_PREFIXES = [
  "/cart",
  "/orders",
  "/profile",
  "/address",
  "/dashboard",
  "/delivery",
  "/seller",
  "/admin",
  "/recipes-admin",
];


const CUSTOMER_ONLY_ROUTES = ["/cart", "/all-products"];

// Legacy recipe-management path: each portal now owns its own recipes page.
export function recipesHomeFor(role) {
  if (role === "admin") return "/admin/recipes";
  return "/seller/recipes";
}

export function routeRedirect(route, user) {
  if (!getToken()) {
    return AUTH_REQUIRED_PREFIXES.some((p) => route.startsWith(p))
      ? "/auth"
      : null;
  }

  if (!user) return null;

  const role = user.role;

  // ADMIN stays inside the administration shell.
  if (role === "admin") {
    if (isAdminRoute(route)) return null;
    if (route === "/recipes-admin") return recipesHomeFor(role);
    if (isSellerRoute(route) || isDeliveryRoute(route)) return "/admin";
    if (CUSTOMER_ONLY_ROUTES.includes(route)) return "/admin";
    return null;
  }

  // SELLER stays inside the seller portal.
  if (role === "seller") {
    if (isAdminRoute(route) || isDeliveryRoute(route)) return "/seller";
    if (isSellerRoute(route)) return null;
    if (route === "/recipes-admin") return recipesHomeFor(role);
    return null;
  }

  // DELIVERY stays inside the delivery hub.
  if (role === "delivery") {
    if (isAdminRoute(route) || isSellerRoute(route)) return "/delivery";
    if (route === "/recipes-admin") return "/delivery";
    return null;
  }

  // CUSTOMER (role "user") never sees admin or seller surfaces.
  if (isAdminRoute(route) || isSellerRoute(route) || isDeliveryRoute(route)) {
    return "/";
  }
  if (route === "/recipes-admin") return "/";

  return null;
}
