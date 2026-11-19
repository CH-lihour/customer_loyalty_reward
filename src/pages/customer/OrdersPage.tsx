import { useEffect, useState } from "react";
import { useShop } from "../../data/shop";
import type { Order, OrderStatus } from "../../data/mockData";
import { apiMyOrders } from "../../data/api";

const statusColors: Record<OrderStatus, string> = {
  PENDING: "text-yellow-400 bg-yellow-400/10",
  CONFIRMED: "text-blue-400 bg-blue-400/10",
  PROCESSING: "text-orange-400 bg-orange-400/10",
  SHIPPED: "text-cyan-400 bg-cyan-400/10",
  COMPLETED: "text-green-400 bg-green-400/10",
  CANCELLED: "text-red-400 bg-red-400/10",
};

export function OrdersPage({ token = null }: { token?: string | null }) {
  const { orders, currentUser, money } = useShop();
  // Signed in through the API, the customer's orders come from it; the demo store is the fallback.
  const [apiOrders, setApiOrders] = useState<Order[] | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiMyOrders(token).then(
      (loaded) => {
        if (cancelled) return;
        setApiOrders(loaded);
        setLoadError("");
      },
      (e: Error) => !cancelled && setLoadError(e.message),
    );
    return () => {
      cancelled = true;
    };
  }, [token]);
  const myOrders = token ? (apiOrders ?? []) : orders.filter((o) => o.customerId === currentUser.id);

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">My Orders</h1>

      {loadError && (
        <p role="alert" className="text-sm text-red-400">
          {loadError}
        </p>
      )}
      {myOrders.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted-foreground)]">
          {token && !apiOrders && !loadError ? "Loading your orders…" : "No orders yet."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myOrders.map((order) => (
            <div
              key={order.id}
              className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)] card-glow transition-all"
            >
              <div className="flex flex-wrap gap-3 items-start justify-between mb-3">
                <div>
                  <div className="font-mono-data text-sm font-semibold">
                    {order.id}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {order.createdAt}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[order.status]}`}
                  >
                    {order.status}
                  </span>
                  {order.payment && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full text-green-400 bg-green-400/10">
                      Paid · KHQR
                    </span>
                  )}
                  {order.pointsEarned > 0 && !(order.pointsFromApi && order.status === "CANCELLED") && (
                    <span className="text-xs text-[var(--gold-mid)] font-semibold">
                      +{order.pointsEarned} pts earned
                    </span>
                  )}
                  {order.status === "PROCESSING" && !order.pointsFromApi && (
                    <span className="text-xs text-[var(--muted-foreground)]">
                      pts pending completion
                    </span>
                  )}
                  {order.status === "CANCELLED" && order.pointsFromApi && order.pointsEarned > 0 && (
                    <span className="text-xs text-[var(--muted-foreground)]">
                      points taken back
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {order.items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-[var(--muted-foreground)]">
                      {item.name} × {item.qty}
                    </span>
                    <span>{money(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--border)] mt-3 pt-3 flex justify-between items-center">
                <span className="text-sm text-[var(--muted-foreground)]">
                  Order Total
                </span>
                <span className="font-semibold text-lg">
                  {money(order.total)}
                </span>
              </div>
              {order.deliveryAddress && (
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  Delivery: {order.deliveryAddress} · {order.deliveryPhone}
                </p>
              )}
              {order.payment && (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  Paid by KHQR on {order.payment.paidAt.slice(0, 10)} · Transaction{" "}
                  <span className="font-mono-data">{order.payment.transactionId}</span>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
