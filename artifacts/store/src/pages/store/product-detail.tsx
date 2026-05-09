import { useState } from "react";
import { useParams, Link } from "wouter";
import { useGetProduct, useListReviews, useAddCartItem } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Star, Minus, Plus, ShoppingCart, ArrowLeft, Truck, ShieldCheck, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function ProductDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const { user } = useAuth();
  
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useGetProduct(id, { query: { enabled: !!id } });
  const { data: reviewsData } = useListReviews({ productId: id }, { query: { enabled: !!id } });
  const addCartItem = useAddCartItem();

  const reviews = reviewsData?.data || [];
  const averageRating = reviewsData?.averageRating || product?.rating || 0;

  const handleAddToCart = () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be signed in to add items to your cart" });
      return;
    }
    
    addCartItem.mutate({ data: { productId: id, quantity } }, {
      onSuccess: () => {
        toast({ title: "Added to cart", description: `${quantity} ${quantity === 1 ? 'item' : 'items'} added to your cart.` });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message || "Failed to add to cart", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-12 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <Link href="/products">
          <Button>Back to Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/products" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-2xl overflow-hidden border border-border/50">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
            )}
          </div>
          {product.images && product.images.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              {product.images.map((img, i) => (
                <div key={i} className="aspect-square bg-muted rounded-lg overflow-hidden border border-border/50 cursor-pointer hover:border-primary">
                  <img src={img} alt={`${product.name} - ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="secondary">{product.categoryName}</Badge>
            {product.isFeatured && <Badge className="bg-primary text-primary-foreground">Featured</Badge>}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{product.name}</h1>
          
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center text-yellow-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-5 w-5 ${i < Math.round(averageRating) ? "fill-current" : "text-muted"}`} />
              ))}
            </div>
            <span className="text-muted-foreground text-sm">
              ({product.reviewCount || reviews.length} reviews)
            </span>
          </div>

          <div className="text-3xl font-bold mb-6">
            ${product.price.toFixed(2)}
            {product.compareAtPrice && (
              <span className="text-xl text-muted-foreground line-through ml-3">${product.compareAtPrice.toFixed(2)}</span>
            )}
          </div>

          <p className="text-muted-foreground mb-8 leading-relaxed">
            {product.description || "No description available."}
          </p>

          <div className="bg-muted/50 p-6 rounded-xl border border-border/50 mb-8 space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-medium">Status</span>
              {product.stock > 0 ? (
                <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  In Stock ({product.stock} available)
                </span>
              ) : (
                <span className="text-destructive font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-destructive" />
                  Out of Stock
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center border rounded-md">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none border-r" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={product.stock === 0}>
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="w-12 text-center font-medium">{quantity}</div>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-none border-l" onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} disabled={product.stock === 0 || quantity >= product.stock}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button className="flex-1 h-10 text-lg font-semibold" size="lg" disabled={product.stock === 0 || addCartItem.isPending} onClick={handleAddToCart}>
                <ShoppingCart className="mr-2 h-5 w-5" /> Add to Cart
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-auto">
            <div className="flex flex-col items-center text-center p-4 border rounded-xl bg-card">
              <Truck className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm font-medium">Free Shipping</span>
              <span className="text-xs text-muted-foreground mt-1">On orders over $100</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 border rounded-xl bg-card">
              <ShieldCheck className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm font-medium">2 Year Warranty</span>
              <span className="text-xs text-muted-foreground mt-1">Full coverage</span>
            </div>
            <div className="flex flex-col items-center text-center p-4 border rounded-xl bg-card">
              <RefreshCw className="h-6 w-6 text-primary mb-2" />
              <span className="text-sm font-medium">30 Day Returns</span>
              <span className="text-xs text-muted-foreground mt-1">No questions asked</span>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger value="details" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3 px-6">Product Details</TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3 px-6">Reviews ({reviews.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="pt-6">
          <div className="prose dark:prose-invert max-w-none">
            <h3>About this product</h3>
            <p>{product.description}</p>
            {product.sku && <p><strong>SKU:</strong> {product.sku}</p>}
            {product.tags && product.tags.length > 0 && (
              <div>
                <strong>Tags:</strong>
                <div className="flex gap-2 mt-2">
                  {product.tags.map(tag => <Badge key={tag} variant="outline">{tag}</Badge>)}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        <TabsContent value="reviews" className="pt-6">
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reviews.map(review => (
                <div key={review.id} className="border-b pb-6 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{review.userName || 'Anonymous'}</div>
                    <div className="text-sm text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center text-yellow-500 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-current" : "text-muted"}`} />
                    ))}
                  </div>
                  {review.title && <h4 className="font-bold mb-1">{review.title}</h4>}
                  {review.body && <p className="text-muted-foreground text-sm">{review.body}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
