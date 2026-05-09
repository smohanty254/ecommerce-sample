import { useGetDashboardStats, useGetSalesChart, useGetTopProducts, useGetRecentOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, ShoppingCart, Package, Users, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: sales, isLoading: salesLoading } = useGetSalesChart({ period: "30d" });
  const { data: topProducts, isLoading: topProductsLoading } = useGetTopProducts({ limit: 5 });
  const { data: recentOrders, isLoading: recentOrdersLoading } = useGetRecentOrders({ limit: 5 });

  const StatCard = ({ title, value, growth, icon: Icon, loading }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 mb-2" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        {loading ? (
          <Skeleton className="h-4 w-16" />
        ) : growth !== undefined ? (
          <p className="text-xs text-muted-foreground mt-1 flex items-center">
            {growth > 0 ? (
              <span className="text-green-500 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1" /> {growth}%</span>
            ) : growth < 0 ? (
              <span className="text-destructive flex items-center"><ArrowDownRight className="w-3 h-3 mr-1" /> {Math.abs(growth)}%</span>
            ) : (
              <span>0%</span>
            )}
            <span className="ml-1">from last month</span>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">Overview of your store's performance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Revenue" 
          value={stats ? `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "$0.00"} 
          growth={stats?.revenueGrowth} 
          icon={DollarSign} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Total Orders" 
          value={stats ? stats.totalOrders.toLocaleString() : "0"} 
          growth={stats?.ordersGrowth} 
          icon={ShoppingCart} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Total Products" 
          value={stats ? stats.totalProducts.toLocaleString() : "0"} 
          icon={Package} 
          loading={statsLoading} 
        />
        <StatCard 
          title="Total Customers" 
          value={stats ? stats.totalCustomers.toLocaleString() : "0"} 
          icon={Users} 
          loading={statsLoading} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {salesLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : sales && sales.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg">
                No sales data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {topProductsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : topProducts && topProducts.length > 0 ? (
              <div className="space-y-6">
                {topProducts.map((product) => (
                  <div key={product.productId} className="flex items-center">
                    <div className="w-10 h-10 bg-muted rounded overflow-hidden flex-shrink-0 mr-4">
                      {product.imageUrl && <img src={product.imageUrl} alt={product.productName} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.productName}</p>
                      <p className="text-xs text-muted-foreground">{product.totalSold} sold</p>
                    </div>
                    <div className="font-medium text-sm">
                      ${product.revenue.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No product data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Orders</CardTitle>
          <Link href="/admin/orders" className="text-sm text-primary hover:underline">View All</Link>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 font-medium text-muted-foreground">Order ID</th>
                  <th className="pb-3 font-medium text-muted-foreground">Customer</th>
                  <th className="pb-3 font-medium text-muted-foreground">Date</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrdersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-4"><Skeleton className="h-4 w-16" /></td>
                      <td className="py-4"><Skeleton className="h-4 w-32" /></td>
                      <td className="py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                      <td className="py-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    </tr>
                  ))
                ) : recentOrders && recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <tr key={order.id} className="group hover:bg-muted/50 transition-colors">
                      <td className="py-4 font-medium">#{order.id}</td>
                      <td className="py-4">{order.userName || "Guest"}</td>
                      <td className="py-4 text-muted-foreground">{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className="py-4">
                        <Badge variant="outline" className="capitalize">{order.status}</Badge>
                      </td>
                      <td className="py-4 text-right font-medium">${order.total.toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No recent orders found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
