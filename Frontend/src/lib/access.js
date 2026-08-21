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


export function routeRedirect(route, user) {
  if (!getToken()) {
    return AUTH_REQUIRED_PREFIXES.some((p) => route.startsWith(p))
      ? "/auth"
      : null;
  }

  if (!user) return null;

  const role = user.role;

  if (isAdminRoute(route)) {
    return role === "admin" ? null : homeFor(role);
  }

  if (isSellerRoute(route)) {
    return role === "seller" ? null : homeFor(role);
  }

  if (route === "/delivery") {
    return role === "delivery" ? null : homeFor(role);
  }

  if (route === "/recipes-admin") {
    return role === "seller" || role === "admin" ? null : homeFor(role);
  }

  return null;
}
