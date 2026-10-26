import { useEffect, useRef, useState } from "react";
import { useShop } from "./data/shop";
import { useFeedback } from "./components/FeedbackProvider";
import { LoginPage, type LoginRole } from "./components/LoginPage";
import { CustomerLayout } from "./components/CustomerLayout";
import { AddToCartDialog } from "./components/AddToCartDialog";
import { useModalState } from "./components/useModalState";
import { AdminLayout, type AdminPage } from "./components/AdminLayout";
import { adminPages, type AdminRole } from "./data/adminAccess";
import {
  ApiError,
  apiLogin,
  apiLogout,
  apiProfile,
  apiRegister,
  type ApiProfile,
  type RegisterFields,
} from "./data/api";

import { HomePage } from "./pages/customer/HomePage";
import { ProductsPage } from "./pages/customer/ProductsPage";
import { ProductDetailPage } from "./pages/customer/ProductDetailPage";
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
import { AdminCategoriesPage } from "./pages/admin/CategoriesAdminPage";
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
import { AdminExchangeRatePage } from "./pages/admin/ExchangeRatePage";
import { AdminProfilePage } from "./pages/admin/ProfilePage";
import { AdminStockAlertsPage } from "./pages/admin/StockAlertsPage";
import { AdminStockPage } from "./pages/admin/StockPage";
import { AdminStockMovementsPage } from "./pages/admin/StockMovementsPage";
import { AdminFulfillmentPage } from "./pages/admin/FulfillmentPage";
import { AdminStocktakePage } from "./pages/admin/StocktakePage";
import { AdminStockReportsPage } from "./pages/admin/StockReportsPage";
import { AdminSuppliersPage } from "./pages/admin/SuppliersPage";

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
type Session = { role: LoginRole; userId: string; token: string };
const sessionKey = "khmershop-demo-session";
type Route =
  | { role: "customer"; page: CustomerPage; productId?: string }
  | { role: "admin"; page: AdminPage }
  | { role: "login"; loginRole: LoginRole };

const customerPages: CustomerPage[] = [
  "home",
  "products",
  "cart",
  "orders",
  "rewards",
  "points",
  "tier",
  "badges",
  "referrals",
  "profile",
];
const guestPages: CustomerPage[] = ["home", "products", "cart"];
const noAdminPages: AdminPage[] = [];
const basePath = new URL(
  import.meta.env.BASE_URL,
  window.location.origin,
).pathname.replace(/\/$/, "");

function routePath(route: Route): string {
  const path =
    route.role === "login"
      ? route.loginRole === "admin"
        ? "/backend/login"
        : "/login"
      : route.role === "admin"
        ? route.page === "dashboard"
          ? "/backend"
          : `/backend/${route.page}`
        : route.productId
          ? `/products/${encodeURIComponent(route.productId)}`
          : route.page === "home"
            ? "/"
            : `/${route.page}`;
  return `${basePath}${path}`;
}

function readRoute(): Route {
  const pathname = window.location.pathname;
  const relative =
    basePath && pathname.startsWith(`${basePath}/`)
      ? pathname.slice(basePath.length)
      : pathname;
  // Staff pages moved from /admin to /backend; old links still open the same page.
  const path = (relative.replace(/\/+$/, "") || "/").replace(/^\/admin(?=\/|$)/, "/backend");
  if (path === "/login") return { role: "login", loginRole: "customer" };
  if (path === "/backend/login") return { role: "login", loginRole: "admin" };
  if (path === "/backend" || path === "/backend/dashboard")
    return { role: "admin", page: "dashboard" };
  if (path.startsWith("/backend/")) {
    const page = path.slice("/backend/".length);
    if (adminPages.includes(page as AdminPage))
      return { role: "admin", page: page as AdminPage };
  }
  const productMatch = /^\/products\/([^/]+)$/.exec(path);
  if (productMatch)
    return {
      role: "customer",
      page: "products",
      productId: decodeURIComponent(productMatch[1]),
    };
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
    if (
      (session.role === "admin" || session.role === "customer") &&
      typeof session.userId === "string" &&
      typeof session.token === "string"
    )
      return { role: session.role, userId: session.userId, token: session.token };
  } catch {
    /* A fresh login is always available. */
  }
  return null;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(readSession);
  const [route, setRoute] = useState<Route>(readRoute);
  const [pendingProductId, setPendingProductId, cartDialogClosing] =
    useModalState<string | null>(null);
  const pendingRoute = useRef<Route | null>(null);
  // The API token last confirmed by the server, so each one is checked once.
  const verifiedToken = useRef<string | null>(null);
  const shop = useShop();
  const { notify } = useFeedback();
  const adminUser =
    session?.role === "admin"
      ? shop.adminUsers.find(
          (user) => user.id === session.userId && user.active,
        )
      : undefined;
  const allowedAdminPages = adminUser
    ? (shop.rolePermissions[adminUser.role] ?? noAdminPages)
    : noAdminPages;

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
    if (
      session?.role === "customer" &&
      shop.disabledCustomerIds.includes(session.userId)
    ) {
      try {
        sessionStorage.removeItem(sessionKey);
      } catch {
        /* In-memory sign-out still works. */
      }
      setSession(null);
      return;
    }
    if (
      session?.role === "admin" &&
      (!adminUser || !allowedAdminPages.length)
    ) {
      try {
        sessionStorage.removeItem(sessionKey);
      } catch {
        /* In-memory sign-out still works. */
      }
      setSession(null);
      return;
    }
    if (!session) {
      if (
        route.role === "admin" ||
        (route.role === "customer" && !guestPages.includes(route.page))
      ) {
        pendingRoute.current = route;
        navigate({ role: "login", loginRole: route.role }, true);
      } else if (window.location.pathname !== routePath(route)) {
        // Show the current address for the page, such as /backend/login for an old /admin/login link.
        window.history.replaceState(null, "", routePath(route));
      }
    } else if (
      session.role === "admin" &&
      route.role === "admin" &&
      !allowedAdminPages.includes(route.page)
    ) {
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

  const storeSession = (next: Session | null) => {
    try {
      if (next) sessionStorage.setItem(sessionKey, JSON.stringify(next));
      else sessionStorage.removeItem(sessionKey);
    } catch {
      /* The in-memory session still applies until refresh. */
    }
    setSession(next);
  };

  // A stored session is only trusted once the API accepts its token again.
  useEffect(() => {
    if (!session || verifiedToken.current === session.token) return;
    const { role, token } = session;
    verifiedToken.current = token;
    apiProfile(role, token).then(
      (profile) => {
        const userId =
          role === "admin"
            ? shop.linkApiAdmin(profile)
            : shop.linkApiCustomer(profile);
        setSession((current) => {
          if (current?.token !== token || current.userId === userId)
            return current;
          const next = { ...current, userId };
          try {
            sessionStorage.setItem(sessionKey, JSON.stringify(next));
          } catch {
            /* The in-memory session still applies until refresh. */
          }
          return next;
        });
      },
      (error) => {
        verifiedToken.current = null;
        if (readSession()?.token === token) storeSession(null);
        notify(
          error instanceof ApiError && error.status === 0
            ? error.message
            : "Your session has expired. Please sign in again.",
          "error",
        );
      },
    );
  }, [session]);

  /** `adminPages` are the pages the API granted; the store has not applied them yet on this render. */
  const beginSession = (next: Session, adminPages: AdminPage[] = []) => {
    verifiedToken.current = next.token;
    storeSession(next);
    const destination = pendingRoute.current;
    pendingRoute.current = null;
    const nextAdminPages = adminPages;
    const canResume =
      !!destination &&
      destination.role === next.role &&
      (destination.role === "customer" ||
        (destination.role === "admin" &&
          nextAdminPages.includes(destination.page)));
    navigate(
      canResume && destination
        ? destination
        : next.role === "admin"
          ? { role: "admin", page: nextAdminPages[0] }
          : { role: "customer", page: "home" },
      true,
    );
  };

  const login = async (
    role: LoginRole,
    email: string,
    password: string,
  ): Promise<string | null> => {
    let token: string;
    let profile: ApiProfile;
    try {
      token = await apiLogin(role, email, password);
      profile = await apiProfile(role, token);
    } catch (error) {
      return error instanceof ApiError ? error.message : "Sign in failed.";
    }
    // Accounts disabled in the demo admin stay locked out; drop the new token.
    const reject = (message: string) => {
      apiLogout(role, token).catch(() => {});
      return message;
    };
    if (role === "admin") {
      // The API refuses disabled accounts; a user without a role has no page to open.
      const pages = (profile.pages ?? []) as AdminPage[];
      if (!profile.role || !pages.length)
        return reject("This staff account has no role yet. Ask a Super Admin to assign one.");
      const userId = shop.linkApiAdmin(profile);
      shop.recordLogin(null, userId);
      beginSession({ role: "admin", userId, token }, pages);
      return null;
    }
    const userId = shop.linkApiCustomer(profile);
    if (shop.disabledCustomerIds.includes(userId))
      return reject("This account has been deactivated.");
    shop.recordLogin(userId);
    shop.selectCustomer(userId);
    beginSession({ role: "customer", userId, token });
    return null;
  };

  /** Creates the customer account through the API, which signs them straight in. */
  const register = async (fields: RegisterFields): Promise<string | null> => {
    let token: string;
    let customer: ApiProfile;
    try {
      ({ token, customer } = await apiRegister(fields));
    } catch (error) {
      return error instanceof ApiError ? error.message : "Registration failed.";
    }
    const userId = shop.linkApiCustomer(customer);
    shop.selectCustomer(userId);
    beginSession({ role: "customer", userId, token });
    return null;
  };

  const logout = () => {
    shop.setCart([]);
    if (session) apiLogout(session.role, session.token).catch(() => {});
    verifiedToken.current = null;
    storeSession(null);
    pendingRoute.current = null;
    navigate(
      session?.role === "admin"
        ? { role: "login", loginRole: "admin" }
        : { role: "customer", page: "home" },
      true,
    );
    notify("Signed out.", "info");
  };

  const addToCart = (productId: string) => {
    if (session?.role !== "customer") {
      pendingRoute.current =
        route.role === "customer"
          ? route
          : { role: "customer", page: "products" };
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
    setPendingProductId(productId);
  };

  const confirmAddToCart = (qty: number) => {
    const product = shop.products.find((p) => p.id === pendingProductId);
    const inCart =
      shop.cart.find((item) => item.productId === pendingProductId)?.qty ?? 0;
    if (
      !product ||
      !Number.isInteger(qty) ||
      qty < 1 ||
      product.stock < inCart + qty
    ) {
      notify("The selected quantity is no longer available.", "error");
      return;
    }
    shop.addToCart(product.id, qty);
    setPendingProductId(null);
    notify(`${qty} × ${product.name} added to your cart.`, "success");
    navigate({ role: "customer", page: "cart" });
  };

  const cartCount = shop.cart.reduce((s, c) => s + c.qty, 0);
  const pendingProduct = shop.products.find(
    (product) => product.id === pendingProductId,
  );
  const availableQty = pendingProduct
    ? Math.max(
        0,
        pendingProduct.stock -
          (shop.cart.find((item) => item.productId === pendingProductId)?.qty ??
            0),
      )
    : 0;
  const customerPage = route.role === "customer" ? route.page : "home";
  const adminPage = route.role === "admin" ? route.page : allowedAdminPages[0];
  const productId = route.role === "customer" ? route.productId : undefined;
  const navigateCustomer = (page: CustomerPage) =>
    navigate({ role: "customer", page });
  const viewProduct = (id: string) => {
    navigate({ role: "customer", page: "products", productId: id });
    window.scrollTo({ top: 0 });
  };
  const navigateAdmin = (page: AdminPage) => {
    if (allowedAdminPages.includes(page)) navigate({ role: "admin", page });
  };

  if (
    session?.role === "customer" &&
    shop.disabledCustomerIds.includes(session.userId)
  ) {
    return null;
  }

  if (
    route.role === "login" ||
    (session?.role === "customer" &&
      !shop.customers.some((customer) => customer.id === session.userId))
  ) {
    return (
      <LoginPage
        key={route.role === "login" ? route.loginRole : "customer"}
        role={route.role === "login" ? route.loginRole : "customer"}
        onBrowse={() => {
          pendingRoute.current = null;
          navigate({ role: "customer", page: "home" });
        }}
        onLogin={login}
        onRegister={register}
      />
    );
  }

  if (
    !session &&
    (route.role === "admin" ||
      (route.role === "customer" && !guestPages.includes(route.page)))
  ) {
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
      <AdminLayout
        page={adminPage}
        onNav={navigateAdmin}
        onLogout={logout}
        allowedPages={allowedAdminPages}
        userName={adminUser.name}
        userRoleLabel={shop.roleLabels[adminUser.role] ?? adminUser.role}
      >
        {adminPage === "dashboard" && <AdminDashboardPage />}
        {adminPage === "customers" && <AdminCustomersPage />}
        {adminPage === "products" && (
          <AdminProductsPage actorId={adminUser.id} token={session.token} />
        )}
        {adminPage === "categories" && (
          <AdminCategoriesPage actorId={adminUser.id} token={session.token} />
        )}
        {adminPage === "orders" && <AdminOrdersPage />}
        {adminPage === "points" && <AdminPointsPage />}
        {adminPage === "tiers" && <AdminTiersPage />}
        {adminPage === "campaigns" && <AdminCampaignsPage />}
        {adminPage === "rewards" && <AdminRewardsPage />}
        {adminPage === "badges" && <AdminBadgesPage />}
        {adminPage === "referrals" && <AdminReferralsPage />}
        {adminPage === "stock-alerts" && (
          <AdminStockAlertsPage actorId={adminUser.id} onNav={navigateAdmin} />
        )}
        {adminPage === "stock" && <AdminStockPage actorId={adminUser.id} />}
        {adminPage === "stock-movements" && (
          <AdminStockMovementsPage actorId={adminUser.id} />
        )}
        {adminPage === "fulfillment" && (
          <AdminFulfillmentPage actorId={adminUser.id} />
        )}
        {adminPage === "stocktake" && (
          <AdminStocktakePage actorId={adminUser.id} />
        )}
        {adminPage === "stock-reports" && <AdminStockReportsPage />}
        {adminPage === "suppliers" && (
          <AdminSuppliersPage actorId={adminUser.id} />
        )}
        {adminPage === "logs" && <AdminActivityLogsPage />}
        {adminPage === "analytics" && <AdminAnalyticsPage />}
        {adminPage === "users" && <AdminUsersPage actorId={adminUser.id} token={session.token} />}
        {adminPage === "roles" && <AdminRolesPage actorId={adminUser.id} token={session.token} />}
        {adminPage === "exchange-rate" && (
          <AdminExchangeRatePage actorId={adminUser.id} />
        )}
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
          onViewProduct={viewProduct}
          guest={!session}
          onSignIn={() => navigate({ role: "login", loginRole: "customer" })}
        />
      )}
      {customerPage === "products" && !productId && (
        <ProductsPage
          onAddToCart={addToCart}
          onViewProduct={viewProduct}
          guest={!session}
        />
      )}
      {customerPage === "products" && productId && (
        <ProductDetailPage
          key={productId}
          productId={productId}
          onAddToCart={addToCart}
          onViewProduct={viewProduct}
          onBack={() => navigateCustomer("products")}
          guest={!session}
        />
      )}
      {customerPage === "cart" && (
        <CartPage
          onNav={(page) => navigateCustomer(page as CustomerPage)}
          guest={!session}
          onSignIn={() => {
            pendingRoute.current = { role: "customer", page: "cart" };
            navigate({ role: "login", loginRole: "customer" });
          }}
        />
      )}
      {customerPage === "orders" && <OrdersPage />}
      {customerPage === "rewards" && <RewardsPage />}
      {customerPage === "points" && <PointsPage />}
      {customerPage === "tier" && <TierPage />}
      {customerPage === "badges" && <BadgesPage />}
      {customerPage === "referrals" && <ReferralsPage />}
      {customerPage === "profile" && <ProfilePage />}
      {pendingProduct && (
        <AddToCartDialog
          product={pendingProduct}
          available={availableQty}
          money={shop.money}
          onClose={() => setPendingProductId(null)}
          closing={cartDialogClosing}
          onConfirm={confirmAddToCart}
        />
      )}
    </CustomerLayout>
  );
}
