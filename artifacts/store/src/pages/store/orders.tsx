import { Link } from "wouter";
import { useListOrders } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, ArrowRight, Clock, CheckCircle2, Truck, XCircle } from "lucide-react";

export default function Orders() {
  const { data: ordersData, isLoading } = useListOrders();
  const orders = ordersData?.data || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'shipped': return <Truck className="h-4 w-4 text-blue-500" />;
      case 'cancelled': case 'refunded': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return "bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20";
      case 'shipped': return "bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20";
      case 'processing': return "bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20";
      case 'cancelled': case 'refunded': return "bg-destructive/10 text-destructive hover:bg-destructive/20";
      default: return "bg-secondary text-secondary-foreground hover:bg-secondary/80";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">My Orders</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-24 bg-card border rounded-xl">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-6">When you place orders, they will appear here.</p>
          <Link href="/products">
            <Button>Start Shopping</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-muted/40 p-4 border-b flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Placed</p>
                    <p className="font-medium">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="font-medium">${order.total.toFixed(2)}</p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm text-muted-foreground">Order #</p>
                    <p className="font-medium">{order.id}</p>
                  </div>
                </div>
                <Link href={`/orders/${order.id}`}>
                  <Button variant="outline" size="sm">
                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(order.status)}
                    <h3 className="font-semibold text-lg capitalize">{order.status}</h3>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(order.status)}>
                    {order.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex-shrink-0 w-24 group relative">
                      <div className="aspect-square bg-muted rounded-md overflow-hidden border">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                        )}
                      </div>
                      <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {item.quantity}
                      </div>
                    </div>
                  ))}
                  {order.items.length === 0 && (
                    <div className="text-sm text-muted-foreground">No items data available.</div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
