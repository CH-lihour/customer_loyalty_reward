import { orders } from '../../data/mockData';
import type { OrderStatus } from '../../data/mockData';

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'text-yellow-400 bg-yellow-400/10',
  CONFIRMED: 'text-blue-400 bg-blue-400/10',
  PROCESSING: 'text-orange-400 bg-orange-400/10',
  SHIPPED: 'text-cyan-400 bg-cyan-400/10',
  COMPLETED: 'text-green-400 bg-green-400/10',
  CANCELLED: 'text-red-400 bg-red-400/10',
};

export function OrdersPage() {
  const myOrders = orders.filter(o => o.customerId === 'u1');

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">My Orders</h1>

      {myOrders.length === 0 ? (
        <div className="text-center py-16 text-[var(--muted-foreground)]">No orders yet.</div>
      ) : (
        <div className="flex flex-col gap-3">
          {myOrders.map(order => (
            <div key={order.id} className="bg-[var(--card)] rounded-xl p-5 border border-[var(--border)] card-glow transition-all">
              <div className="flex flex-wrap gap-3 items-start justify-between mb-3">
                <div>
                  <div className="font-mono-data text-sm font-semibold">{order.id}</div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{order.createdAt}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[order.status]}`}>{order.status}</span>
                  {order.pointsEarned > 0 && (
                    <span className="text-xs text-[var(--gold-mid)] font-semibold">+{order.pointsEarned} pts earned</span>
                  )}
                  {order.status === 'PROCESSING' && (
                    <span className="text-xs text-[var(--muted-foreground)]">pts pending completion</span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                {order.items.map(item => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">{item.name} × {item.qty}</span>
                    <span>${(item.price * item.qty).toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--border)] mt-3 pt-3 flex justify-between items-center">
                <span className="text-sm text-[var(--muted-foreground)]">Order Total</span>
                <span className="font-semibold text-lg">${order.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
