import { useEffect, useRef, useState } from "react";
import { useShop } from "./data/shop";
import { useFeedback } from "./components/FeedbackProvider";
import {
  LoginPage,
  type LoginRole,
  type Registration,
} from "./components/LoginPage";
import { CustomerLayout } from "./components/CustomerLayout";
import { AdminLayout, type AdminPage } from "./components/AdminLayout";
import { adminPages } from "./data/adminAccess";

import { HomePage } from "./pages/customer/HomePage";
import { ProductsPage } from "./pages/customer/ProductsPage";
import { CartPage } from "./pages/customer/CartPage";
import { OrdersPage } from "./pages/customer/OrdersPage";
import { RewardsPage } from "./pages/customer/RewardsPage";
import { PointsPage } from "./pages/customer/PointsPage";
import { TierPage } from "./pages/customer/TierPage";
import { BadgesPage } from "./pages/customer/BadgesPage";
import { ReferralsPage } from "./pages/customer/ReferralsPage";
import { ProfilePage } from "./pages/customer/ProfilePage";

import { AdminDashboardPage } from "./pages/admin/DashboardPage";
import { AdminCustomersPage } from "./pages/admin/CustomersPage";
import { AdminProductsPage } from "./pages/admin/ProductsAdminPage";
import { AdminOrdersPage } from "./pages/admin/OrdersAdminPage";
import { AdminPointsPage } from "./pages/admin/PointsAdminPage";
import { AdminTiersPage } from "./pages/admin/TiersAdminPage";
import { AdminCampaignsPage } from "./pages/admin/CampaignsAdminPage";
import { AdminRewardsPage } from "./pages/admin/RewardsAdminPage";
import { AdminBadgesPage } from "./pages/admin/BadgesAdminPage";
import { AdminReferralsPage } from "./pages/admin/ReferralsAdminPage";
import { AdminActivityLogsPage } from "./pages/admin/ActivityLogsPage";
import { AdminAnalyticsPage } from "./pages/admin/AnalyticsPage";
import { AdminUsersPage } from "./pages/admin/UsersPage";
import { AdminRolesPage } from "./pages/admin/RolesPage";
import { AdminProfilePage } from "./pages/admin/ProfilePage";

type CustomerPage =
  | "home"
  | "products"
  | "cart"
  | "orders"
  | "rewards"
  | "points"
  | "tier"
  | "badges"
  | "referrals"
  | "profile";
type Session = { role: "admin"; userId: string } | { role: "customer"; userId: string };
const sessionKey = "khmershop-demo-session";
type Route =
  | { role: "customer"; page: CustomerPage }
  | { role: "admin"; page: AdminPage }
  | { role: "login"; loginRole: LoginRole };

const customerPages: CustomerPage[] = [
  "home", "products", "cart", "orders", "rewards", "points", "tier",
  "badges", "referrals", "profile",
];
const guestPages: CustomerPage[] = ["home", "products", "cart"];
const noAdminPages: AdminPage[] = [];
const basePath = new URL(import.meta.env.BASE_URL, window.location.origin)
  .pathname.replace(/\/$/, "");

function routePath(route: Route): string {
  const path = route.role === "login"
    ? route.loginRole === "admin" ? "/admin/login" : "/login"
    : route.role === "admin"
      ? route.page === "dashboard" ? "/admin" : `/admin/${route.page}`
      : route.page === "home" ? "/" : `/${route.page}`;
  return `${basePath}${path}`;
}

function readRoute(): Route {
  const pathname = window.location.pathname;
  const relative = basePath && pathname.startsWith(`${basePath}/`)
    ? pathname.slice(basePath.length)
    : pathname;
  const path = relative.replace(/\/+$/, "") || "/";
  if (path === "/login") return { role: "login", loginRole: "customer" };
  if (path === "/admin/login") return { role: "login", loginRole: "admin" };
  if (path === "/admin" || path === "/admin/dashboard")
    return { role: "admin", page: "dashboard" };
  if (path.startsWith("/admin/")) {
    const page = path.slice(7);
    if (adminPages.includes(page as AdminPage))
      return { role: "admin", page: page as AdminPage };
  }
  const page = path.slice(1) || "home";
  if (customerPages.includes(page as CustomerPage))
    return { role: "customer", page: page as CustomerPage };
  return { role: "customer", page: "home" };
}

function readSession(): Session | null {
  try {
    const stored = sessionStorage.getItem(sessionKey);
    if (!stored) return null;
    const session = JSON.parse(stored) as Partial<Session>;
    if (session.role === "admin")
      return { role: "admin", userId: typeof session.userId === "string" ? session.userId : "admin-super" };
    if (
      session.role === "customer" &&
      "userId" in session &&
      typeof session.userId === "string"
    )
      return { role: "customer", userId: session.userId };
  } catch {
    /* A fresh login is always available. */
  }
  return null;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(readSession);
  const [route, setRoute] = useState<Route>(readRoute);
  const pendingRoute = useRef<Route | null>(null);
  const shop = useShop();
  const { notify } = useFeedback();
  const adminUser = session?.role === "admin"
    ? shop.adminUsers.find((user) => user.id === session.userId && user.active)
    : undefined;
  const allowedAdminPages = adminUser ? shop.rolePermissions[adminUser.role] ?? noAdminPages : noAdminPages;

  const navigate = (next: Route, replace = false) => {
    const path = routePath(next);
    if (window.location.pathname !== path) {
      window.history[replace ? "replaceState" : "pushState"](null, "", path);
    }
    setRoute(next);
  };

  useEffect(() => {
    const onPopState = () => setRoute(readRoute());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (session?.role === "customer" && shop.disabledCustomerIds.includes(session.userId)) {
      try { sessionStorage.removeItem(sessionKey); } catch { /* In-memory sign-out still works. */ }
      setSession(null);
      return;
    }
    if (session?.role === "admin" && (!adminUser || !allowedAdminPages.length)) {
      try { sessionStorage.removeItem(sessionKey); } catch { /* In-memory sign-out still works. */ }
      setSession(null);
      return;
    }
    if (!session) {
      if (route.role === "admin" || (route.role === "customer" && !guestPages.includes(route.page))) {
        pendingRoute.current = route;
        navigate({ role: "login", loginRole: route.role }, true);
      }
    } else if (session.role === "admin" && route.role === "admin" && !allowedAdminPages.includes(route.page)) {
      navigate({ role: "admin", page: allowedAdminPages[0] }, true);
    } else if (route.role === "login" || route.role !== session.role) {
      navigate(
        session.role === "admin"
          ? { role: "admin", page: allowedAdminPages[0] }
          : { role: "customer", page: "home" },
        true,
      );
    } else if (window.location.pathname !== routePath(route)) {
      window.history.replaceState(null, "", routePath(route));
    }
  }, [route, session, adminUser, allowedAdminPages, shop.disabledCustomerIds]);

  useEffect(() => {
    if (
      session?.role === "customer" &&
      shop.currentUserId !== session.userId &&
      shop.customers.some((customer) => customer.id === session.userId)
    ) {
      shop.selectCustomer(session.userId);
    }
  }, [session, shop.currentUserId, shop.customers, shop.selectCustomer]);

  const beginSession = (next: Session) => {
    try {
      sessionStorage.setItem(sessionKey, JSON.stringify(next));
    } catch {
      /* Session stays active until refresh. */
    }
    setSession(next);
    const destination = pendingRoute.current;
    pendingRoute.current = null;
    const nextAdmin = next.role === "admin"
      ? shop.adminUsers.find((user) => user.id === next.userId)
      : undefined;
    const nextAdminPages = nextAdmin ? shop.rolePermissions[nextAdmin.role] : [];
    const canResume = !!destination && destination.role === next.role &&
      (destination.role === "customer" ||
        (destination.role === "admin" && nextAdminPages.includes(destination.page)));
    navigate(
      canResume && destination
        ? destination
        : next.role === "admin"
          ? { role: "admin", page: nextAdminPages[0] }
          : { role: "customer", page: "home" },
      true,
    );
  };

  const login = (
    role: LoginRole,
    email: string,
    password: string,
  ): string | null => {
    if (role === "admin") {
      const admin = shop.adminUsers.find((user) => user.email.toLowerCase() === email.toLowerCase() && user.active);
      if (!admin || password !== "admin1234")
        return "Incorrect admin email or password.";
      shop.recordLogin(null, admin.id);
      beginSession({ role: "admin", userId: admin.id });
      return null;
    }
    const customer = shop.customers.find(
      (item) => item.email.toLowerCase() === email.toLowerCase(),
    );
    if (!customer || password !== "demo1234" || shop.disabledCustomerIds.includes(customer.id))
      return "Incorrect customer email or password.";
    shop.recordLogin(customer.id);
    shop.selectCustomer(customer.id);
    beginSession({ role: "customer", userId: customer.id });
    return null;
  };

  const register = (fields: Registration): string | null => {
    const result = shop.registerCustomer(fields);
    if (result.error || !result.userId)
      return result.error ?? "Could not create the demo account.";
    beginSession({ role: "customer", userId: result.userId });
    return null;
  };

  const logout = () => {
    shop.setCart([]);
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {
      /* In-memory logout still works. */
    }
    setSession(null);
    pendingRoute.current = null;
    navigate(session?.role === "admin" ? { role: "login", loginRole: "admin" } : { role: "customer", page: "home" }, true);
    notify("Signed out.", "info");
  };

  const addToCart = (productId: string) => {
    if (session?.role !== "customer") {
      pendingRoute.current = route.role === "customer" ? route : { role: "customer", page: "products" };
      navigate({ role: "login", loginRole: "customer" });
      return;
    }
    const product = shop.products.find((p) => p.id === productId);
    const inCart =
      shop.cart.find((item) => item.productId === productId)?.qty ?? 0;
    if (!product || product.stock <= inCart) {
      notify("This product is out of stock.", "error");
      return;
    }
    shop.addToCart(productId);
    notify(`${product.name} added to your cart.`, "success");
    navigate({ role: "customer", page: "cart" });
  };

  const cartCount = shop.cart.reduce((s, c) => s + c.qty, 0);
  const customerPage = route.role === "customer" ? route.page : "home";
  const adminPage = route.role === "admin" ? route.page : allowedAdminPages[0];
  const navigateCustomer = (page: CustomerPage) => navigate({ role: "customer", page });
  const navigateAdmin = (page: AdminPage) => {
    if (allowedAdminPages.includes(page)) navigate({ role: "admin", page });
  };

  if (session?.role === "customer" && shop.disabledCustomerIds.includes(session.userId)) {
    return null;
  }

  if (route.role === "login" || (session?.role === "customer" && !shop.customers.some((customer) => customer.id === session.userId))) {
    return <LoginPage key={route.role === "login" ? route.loginRole : "customer"} initialRole={route.role === "login" ? route.loginRole : "customer"} onRoleChange={(loginRole) => navigate({ role: "login", loginRole })} onBrowse={() => { pendingRoute.current = null; navigate({ role: "customer", page: "home" }); }} onLogin={login} onRegister={register} />;
  }

  if (!session && (route.role === "admin" || (route.role === "customer" && !guestPages.includes(route.page)))) {
    return null;
  }

  if (session?.role === "customer" && shop.currentUserId !== session.userId) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-[var(--muted-foreground)]">
        Opening your account…
      </div>
    );
  }

  if (session?.role === "admin") {
    if (!adminUser || !allowedAdminPages.includes(adminPage)) return null;
    return (
      <AdminLayout page={adminPage} onNav={navigateAdmin} onLogout={logout} allowedPages={allowedAdminPages} userName={adminUser.name} userRole={adminUser.role}>
        {adminPage === "dashboard" && <AdminDashboardPage />}
        {adminPage === "customers" && <AdminCustomersPage />}
        {adminPage === "products" && <AdminProductsPage />}
        {adminPage === "orders" && <AdminOrdersPage />}
        {adminPage === "points" && <AdminPointsPage />}
        {adminPage === "tiers" && <AdminTiersPage />}
        {adminPage === "campaigns" && <AdminCampaignsPage />}
        {adminPage === "rewards" && <AdminRewardsPage />}
        {adminPage === "badges" && <AdminBadgesPage />}
        {adminPage === "referrals" && <AdminReferralsPage />}
        {adminPage === "logs" && <AdminActivityLogsPage />}
        {adminPage === "analytics" && <AdminAnalyticsPage />}
        {adminPage === "users" && <AdminUsersPage actorId={adminUser.id} />}
        {adminPage === "roles" && <AdminRolesPage actorId={adminUser.id} />}
        {adminPage === "profile" && <AdminProfilePage userId={adminUser.id} />}
      </AdminLayout>
    );
  }

  return (
    <CustomerLayout
      page={customerPage}
      onNav={navigateCustomer}
      cartCount={cartCount}
      onLogout={logout}
      guest={!session}
      onSignIn={() => navigate({ role: "login", loginRole: "customer" })}
    >
      {customerPage === "home" && (
        <HomePage
          onNav={(page) => navigateCustomer(page as CustomerPage)}
          onAddToCart={addToCart}
          guest={!session}
          onSignIn={() => navigate({ role: "login", loginRole: "customer" })}
        />
      )}
      {customerPage === "products" && <ProductsPage onAddToCart={addToCart} guest={!session} />}
      {customerPage === "cart" && (
        <CartPage onNav={(page) => navigateCustomer(page as CustomerPage)} guest={!session} onSignIn={() => { pendingRoute.current = { role: "customer", page: "cart" }; navigate({ role: "login", loginRole: "customer" }); }} />
      )}
      {customerPage === "orders" && <OrdersPage />}
      {customerPage === "rewards" && <RewardsPage />}
      {customerPage === "points" && <PointsPage />}
      {customerPage === "tier" && <TierPage />}
      {customerPage === "badges" && <BadgesPage />}
      {customerPage === "referrals" && <ReferralsPage />}
      {customerPage === "profile" && <ProfilePage />}
    </CustomerLayout>
  );
}
