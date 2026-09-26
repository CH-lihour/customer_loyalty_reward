import { useState } from 'react';
import { CustomerLayout } from './components/CustomerLayout';
import { AdminLayout, type AdminPage } from './components/AdminLayout';

import { HomePage } from './pages/customer/HomePage';
import { ProductsPage } from './pages/customer/ProductsPage';
import { CartPage, type CartItem } from './pages/customer/CartPage';
import { OrdersPage } from './pages/customer/OrdersPage';
import { RewardsPage } from './pages/customer/RewardsPage';
import { PointsPage } from './pages/customer/PointsPage';
import { BadgesPage } from './pages/customer/BadgesPage';
import { ReferralsPage } from './pages/customer/ReferralsPage';
import { ProfilePage } from './pages/customer/ProfilePage';

import { AdminDashboardPage } from './pages/admin/DashboardPage';
import { AdminCustomersPage } from './pages/admin/CustomersPage';
import { AdminProductsPage } from './pages/admin/ProductsAdminPage';
import { AdminOrdersPage } from './pages/admin/OrdersAdminPage';
import { AdminPointsPage } from './pages/admin/PointsAdminPage';
import { AdminTiersPage } from './pages/admin/TiersAdminPage';
import { AdminRewardsPage } from './pages/admin/RewardsAdminPage';
import { AdminBadgesPage } from './pages/admin/BadgesAdminPage';
import { AdminReferralsPage } from './pages/admin/ReferralsAdminPage';
import { AdminActivityLogsPage } from './pages/admin/ActivityLogsPage';
import { AdminAnalyticsPage } from './pages/admin/AnalyticsPage';

type CustomerPage = 'home' | 'products' | 'cart' | 'orders' | 'rewards' | 'points' | 'badges' | 'referrals' | 'profile';
type AppMode = 'customer' | 'admin';

export default function App() {
  const [mode, setMode] = useState<AppMode>('customer');
  const [customerPage, setCustomerPage] = useState<CustomerPage>('home');
  const [adminPage, setAdminPage] = useState<AdminPage>('dashboard');
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(c => c.productId === productId);
      if (existing) return prev.map(c => c.productId === productId ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { productId, qty: 1 }];
    });
    setCustomerPage('cart');
  };

  const cartCount = cart.reduce((s, c) => s + c.qty, 0);

  if (mode === 'admin') {
    return (
      <AdminLayout page={adminPage} onNav={setAdminPage} onSwitchToCustomer={() => setMode('customer')}>
        {adminPage === 'dashboard' && <AdminDashboardPage />}
        {adminPage === 'customers' && <AdminCustomersPage />}
        {adminPage === 'products' && <AdminProductsPage />}
        {adminPage === 'orders' && <AdminOrdersPage />}
        {adminPage === 'points' && <AdminPointsPage />}
        {adminPage === 'tiers' && <AdminTiersPage />}
        {adminPage === 'rewards' && <AdminRewardsPage />}
        {adminPage === 'badges' && <AdminBadgesPage />}
        {adminPage === 'referrals' && <AdminReferralsPage />}
        {adminPage === 'logs' && <AdminActivityLogsPage />}
        {adminPage === 'analytics' && <AdminAnalyticsPage />}
      </AdminLayout>
    );
  }

  return (
    <CustomerLayout
      page={customerPage}
      onNav={p => setCustomerPage(p as CustomerPage)}
      cartCount={cartCount}
      onSwitchToAdmin={() => setMode('admin')}
    >
      {customerPage === 'home' && <HomePage onNav={p => setCustomerPage(p as CustomerPage)} onAddToCart={addToCart} />}
      {customerPage === 'products' && <ProductsPage onAddToCart={addToCart} />}
      {customerPage === 'cart' && <CartPage cart={cart} onUpdateCart={setCart} onNav={p => setCustomerPage(p as CustomerPage)} />}
      {customerPage === 'orders' && <OrdersPage />}
      {customerPage === 'rewards' && <RewardsPage />}
      {customerPage === 'points' && <PointsPage />}
      {customerPage === 'badges' && <BadgesPage />}
      {customerPage === 'referrals' && <ReferralsPage />}
      {customerPage === 'profile' && <ProfilePage />}
    </CustomerLayout>
  );
}
