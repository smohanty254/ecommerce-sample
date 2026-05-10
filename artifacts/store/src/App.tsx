import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useGetMe } from "@workspace/api-client-react";
import { createQueryClient } from "@/lib/query-client";
import { ErrorBoundary } from "@/components/error-boundary";

import StoreLayout from "@/components/layouts/StoreLayout";
import AdminLayout from "@/components/layouts/AdminLayout";

import Home from "@/pages/store/home";
import Login from "@/pages/auth/login";
import Products from "@/pages/store/products";
import ProductDetail from "@/pages/store/product-detail";
import Cart from "@/pages/store/cart";
import Checkout from "@/pages/store/checkout";
import Orders from "@/pages/store/orders";
import OrderDetail from "@/pages/store/order-detail";
import Profile from "@/pages/store/profile";

import AdminDashboard from "@/pages/admin/dashboard";
import AdminProducts from "@/pages/admin/products/index";
import AdminProductNew from "@/pages/admin/products/new";
import AdminProductEdit from "@/pages/admin/products/edit";
import AdminOrders from "@/pages/admin/orders/index";
import AdminCustomers from "@/pages/admin/customers/index";
import AdminCategories from "@/pages/admin/categories/index";
import AdminAnalytics from "@/pages/admin/analytics/index";
import AdminForms from "@/pages/admin/forms/index";
import AdminFormBuilder from "@/pages/admin/forms/builder";
import AdminReports from "@/pages/admin/reports/index";

const queryClient = createQueryClient();

function ProtectedRoute({ component: Component, role, layout: Layout = ({children}: any) => <>{children}</>, ...rest }: any) {
  const { user, token } = useAuth();
  
  if (!token) return <Redirect to="/login" />;
  if (role && user && user.role !== role && user.role !== "admin") return <Redirect to="/" />;
  
  return <Route {...rest}>
    {() => <Layout><Component /></Layout>}
  </Route>;
}

function Router() {
  const { token, setUser, logout } = useAuth();
  const { data: user, error } = useGetMe({
    query: { enabled: !!token, retry: false } as never,
  });

  useEffect(() => {
    if (user) setUser(user);
    if (error) logout();
  }, [user, error, setUser, logout]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      {/* Store Routes */}
      <Route path="/">
        <StoreLayout><Home /></StoreLayout>
      </Route>
      <Route path="/products">
        <StoreLayout><Products /></StoreLayout>
      </Route>
      <Route path="/products/:id">
        <StoreLayout><ProductDetail /></StoreLayout>
      </Route>
      <Route path="/cart">
        <StoreLayout><Cart /></StoreLayout>
      </Route>
      
      {/* Protected Store Routes */}
      <ProtectedRoute path="/checkout" component={Checkout} layout={StoreLayout} />
      <ProtectedRoute path="/orders" component={Orders} layout={StoreLayout} />
      <ProtectedRoute path="/orders/:id" component={OrderDetail} layout={StoreLayout} />
      <ProtectedRoute path="/profile" component={Profile} layout={StoreLayout} />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} role="manager" layout={AdminLayout} />
      <ProtectedRoute path="/admin/products" component={AdminProducts} role="manager" layout={AdminLayout} />
      <ProtectedRoute path="/admin/products/new" component={AdminProductNew} role="manager" layout={AdminLayout} />
      <ProtectedRoute path="/admin/products/:id/edit" component={AdminProductEdit} role="manager" layout={AdminLayout} />
      <ProtectedRoute path="/admin/orders" component={AdminOrders} role="manager" layout={AdminLayout} />
      <ProtectedRoute path="/admin/customers" component={AdminCustomers} role="admin" layout={AdminLayout} />
      <ProtectedRoute path="/admin/categories" component={AdminCategories} role="manager" layout={AdminLayout} />
      <ProtectedRoute path="/admin/analytics" component={AdminAnalytics} role="manager" layout={AdminLayout} />
      <ProtectedRoute path="/admin/forms" component={AdminForms} role="manager" layout={AdminLayout} />
      <ProtectedRoute path="/admin/forms/new" component={AdminFormBuilder} role="manager" layout={AdminLayout} />
      <ProtectedRoute path="/admin/forms/:id" component={AdminFormBuilder} role="manager" layout={AdminLayout} />
      <ProtectedRoute path="/admin/reports" component={AdminReports} role="manager" layout={AdminLayout} />
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
