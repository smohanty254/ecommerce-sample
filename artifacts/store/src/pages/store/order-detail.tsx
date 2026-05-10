import { useEffect } from "react";
import { useParams, Link } from "wouter";
import { useGetOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Package, Truck, CheckCircle2, Clock } from "lucide-react";
import io from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getGetOrderQueryKey } from "@workspace/api-client-react";

export default function OrderDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useGetOrder(id, { query: { enabled: !!id } as never });

  useEffect(() => {
    if (!id) return;
    
    // Set up WebSocket connection for real-time order updates
    const socket = io({ path: "/ws" });
    
    socket.on("connect", () => {
      console.log("Connected to WebSocket");
      // Could emit an event to join an order-specific room if server supported it
    });

    // Listen for order status updates
    socket.on("orderUpdated", (data) => {
      if (data.id === id) {
        // Update query cache directly
        queryClient.setQueryData(getGetOrderQueryKey(id), (oldData: any) => {
          if (!oldData) return oldData;
          return { ...oldData, status: data.status, trackingNumber: data.trackingNumber || oldData.trackingNumber };
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [id, queryClient]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-64 w-full mb-8 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Order Not Found</h1>
        <Link href="/orders"><Button>Back to Orders</Button></Link>
      </div>
    );
  }

  const steps = [
    { id: 'pending', label: 'Order Placed', icon: Package },
    { id: 'processing', label: 'Processing', icon: Clock },
    { id: 'shipped', label: 'Shipped', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: CheckCircle2 },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === order.status);
  // Handle cancelled/refunded separately from the linear flow
  const isTerminalOther = order.status === 'cancelled' || order.status === 'refunded';

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link href="/orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Orders
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Order #{order.id}</h1>
          <p className="text-muted-foreground mt-1">Placed on {new Date(order.createdAt).toLocaleString()}</p>
        </div>
        <Badge variant="outline" className="text-lg py-1 px-4 self-start sm:self-auto capitalize">
          {order.status}
        </Badge>
      </div>

      <div className="bg-card border rounded-xl p-6 md:p-10 mb-8">
        <h2 className="font-semibold text-lg mb-8">Order Status</h2>
        
        {isTerminalOther ? (
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg flex items-center font-medium">
            Order was {order.status}
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-muted rounded-full" />
            <div 
              className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-primary rounded-full transition-all duration-500" 
              style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
            />
            
            <div className="relative flex justify-between">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                const isCompleted = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;
                
                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 border-card relative z-10 transition-colors ${
                      isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className={`mt-3 text-xs md:text-sm font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {order.trackingNumber && (
          <div className="mt-8 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tracking Number</p>
              <p className="font-mono font-medium">{order.trackingNumber}</p>
            </div>
            <Button variant="outline" size="sm">Track Package</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="p-4 bg-muted/30 border-b font-semibold">
              Items Ordered
            </div>
            <div className="divide-y">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded border overflow-hidden flex-shrink-0">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1">
                    <Link href={`/products/${item.productId}`} className="font-medium hover:underline block">{item.productName}</Link>
                    <p className="text-sm text-muted-foreground mt-1">Qty: {item.quantity}</p>
                  </div>
                  <div className="font-medium">
                    ${((item.subtotal || item.price * item.quantity)).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-muted/10 border-t">
              <div className="flex justify-between items-center font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">${order.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="bg-card border rounded-xl p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Shipping Address</h3>
              <p className="text-sm leading-relaxed">{order.shippingAddress}</p>
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Payment Method</h3>
              <p className="text-sm capitalize">{order.paymentMethod?.replace('_', ' ') ?? '—'}</p>
            </div>
            {order.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2 text-sm text-muted-foreground uppercase tracking-wider">Order Notes</h3>
                  <p className="text-sm italic">{order.notes}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
