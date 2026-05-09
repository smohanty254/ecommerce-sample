import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetCart, useCreateOrder, useGetMe } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, CreditCard, ArrowLeft } from "lucide-react";

const checkoutSchema = z.object({
  shippingAddress: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  zipCode: z.string().min(3, "Zip code is required"),
  country: z.string().min(2, "Country is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  notes: z.string().optional(),
});

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { data: cart } = useGetCart();
  const { data: user } = useGetMe();
  const createOrder = useCreateOrder();

  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingAddress: user?.address || "",
      city: "",
      zipCode: "",
      country: "",
      paymentMethod: "credit_card",
      notes: "",
    },
  });

  const onSubmit = (data: z.infer<typeof checkoutSchema>) => {
    if (!cart || cart.items.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }

    const fullAddress = `${data.shippingAddress}, ${data.city}, ${data.zipCode}, ${data.country}`;

    createOrder.mutate({
      data: {
        shippingAddress: fullAddress,
        paymentMethod: data.paymentMethod,
        notes: data.notes
      }
    }, {
      onSuccess: (order) => {
        toast({ title: "Order placed successfully!" });
        setLocation(`/orders/${order.id}`);
      },
      onError: (err) => {
        toast({ title: "Checkout failed", description: err.message, variant: "destructive" });
      }
    });
  };

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Your cart is empty</h1>
        <Link href="/products"><Button>Go Shopping</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link href="/cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Return to Cart
      </Link>
      
      <h1 className="text-3xl font-bold tracking-tight mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">Shipping Information</h2>
                <FormField
                  control={form.control}
                  name="shippingAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl><Input placeholder="123 Main St" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip / Postal Code</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">Payment Method</h2>
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1"
                        >
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                            <FormControl><RadioGroupItem value="credit_card" /></FormControl>
                            <FormLabel className="font-normal flex flex-1 items-center justify-between cursor-pointer">
                              <span className="flex items-center"><CreditCard className="mr-2 h-4 w-4" /> Credit Card</span>
                            </FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-4 cursor-pointer hover:bg-muted/50">
                            <FormControl><RadioGroupItem value="paypal" /></FormControl>
                            <FormLabel className="font-normal flex flex-1 items-center justify-between cursor-pointer">
                              <span>PayPal</span>
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-semibold border-b pb-2">Order Notes (Optional)</h2>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl><Textarea placeholder="Special instructions for delivery..." className="resize-none" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button type="submit" size="lg" className="w-full font-bold" disabled={createOrder.isPending}>
                {createOrder.isPending ? "Processing..." : `Place Order — $${cart.total.toFixed(2)}`}
              </Button>
              <div className="flex items-center justify-center text-sm text-muted-foreground mt-4 gap-2">
                <ShieldCheck className="h-4 w-4 text-green-500" /> Payments are secure and encrypted.
              </div>
            </form>
          </Form>
        </div>

        <div>
          <div className="bg-muted/30 border rounded-xl p-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-6">Order Summary</h2>
            <div className="space-y-4 mb-6 max-h-80 overflow-y-auto pr-2">
              {cart.items.map(item => (
                <div key={item.productId} className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-muted rounded overflow-hidden flex-shrink-0 border">
                    {item.imageUrl && <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{item.productName}</h4>
                    <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <div className="font-medium text-sm">${((item.subtotal || item.price * item.quantity)).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${cart.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>$0.00</span>
              </div>
              <div className="border-t pt-3 mt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">${cart.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
