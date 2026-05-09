import { Link } from "wouter";
import { useGetCart, useUpdateCartItem, useRemoveCartItem, useClearCart } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, Minus, Plus, ArrowRight, ShoppingBag } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function Cart() {
  const { data: cart, isLoading } = useGetCart();
  const updateCartItem = useUpdateCartItem();
  const removeCartItem = useRemoveCartItem();
  const clearCart = useClearCart();

  const handleUpdateQuantity = (productId: number, currentQuantity: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    updateCartItem.mutate({ productId, data: { quantity: newQuantity } }, {
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const handleRemoveItem = (productId: number) => {
    removeCartItem.mutate({ productId }, {
      onSuccess: () => toast({ title: "Item removed" }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const handleClearCart = () => {
    clearCart.mutate(undefined, {
      onSuccess: () => toast({ title: "Cart cleared" }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Shopping Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <div>
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center max-w-lg">
        <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="h-12 w-12" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-4">Your cart is empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Link href="/products">
          <Button size="lg" className="w-full sm:w-auto">Start Shopping</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Shopping Cart</h1>
        <span className="text-muted-foreground">{cart.itemCount} items</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-muted/30">
              <span className="font-medium text-sm text-muted-foreground">Product</span>
              <Button variant="ghost" size="sm" className="text-destructive h-auto py-1" onClick={handleClearCart}>
                Clear Cart
              </Button>
            </div>
            <ul className="divide-y">
              {cart.items.map(item => (
                <li key={item.productId} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="w-24 h-24 bg-muted rounded-md overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No img</div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${item.productId}`} className="font-semibold text-lg hover:underline truncate block">
                      {item.productName}
                    </Link>
                    <div className="font-medium mt-1">${item.price.toFixed(2)}</div>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end mt-4 sm:mt-0">
                    <div className="flex items-center border rounded-md bg-background">
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-r" onClick={() => handleUpdateQuantity(item.productId, item.quantity, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <div className="w-10 text-center text-sm font-medium">{item.quantity}</div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-l" onClick={() => handleUpdateQuantity(item.productId, item.quantity, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="font-bold w-20 text-right">
                      ${(item.subtotal || (item.price * item.quantity)).toFixed(2)}
                    </div>
                    
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => handleRemoveItem(item.productId)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-card border rounded-xl p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>Calculated at checkout</span>
              </div>
            </div>
            
            <Separator className="mb-4" />
            
            <div className="flex justify-between items-end mb-8">
              <span className="font-bold">Total</span>
              <span className="text-2xl font-bold text-primary">${cart.total.toFixed(2)}</span>
            </div>
            
            <Link href="/checkout">
              <Button size="lg" className="w-full font-bold text-lg">
                Proceed to Checkout <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            
            <p className="text-xs text-center text-muted-foreground mt-4">
              Secure checkout. Free shipping on orders over $100.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
