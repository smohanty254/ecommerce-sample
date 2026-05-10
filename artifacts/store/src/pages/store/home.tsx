import { useListFeaturedProducts, useListTrendingProducts } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { ShoppingCart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: featuredData, isLoading: featuredLoading } = useListFeaturedProducts();
  const { data: trendingData, isLoading: trendingLoading } = useListTrendingProducts();

  const featured = featuredData || [];
  const trending = trendingData || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header Placeholder */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="font-bold text-2xl tracking-tighter text-primary">EcoStore</Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/products" className="transition-colors hover:text-foreground/80 text-foreground/60">Products</Link>
            <Link href="/categories" className="transition-colors hover:text-foreground/80 text-foreground/60">Categories</Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/cart">
              <Button variant="ghost" size="icon">
                <ShoppingCart className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button>Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="mb-12 rounded-3xl bg-primary text-primary-foreground p-12 lg:p-24 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">The Future of Commerce.</h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto opacity-90">Premium goods for serious buyers. Experience the command center of shopping.</p>
          <div className="flex justify-center gap-4">
            <Link href="/products">
              <Button size="lg" variant="secondary" className="font-bold text-lg">Shop Now</Button>
            </Link>
          </div>
        </section>

        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold tracking-tight">Featured Products</h2>
            <Link href="/products" className="text-primary hover:underline">View all</Link>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))
            ) : featured.map(product => (
              <Card key={product.id} className="overflow-hidden hover-elevate transition-all border-border/50">
                <div className="aspect-square bg-muted relative">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                  )}
                </div>
                <CardContent className="p-4">
                  <Link href={`/products/${product.id}`} className="font-bold hover:underline block truncate">{product.name}</Link>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{product.categoryName}</p>
                </CardContent>
                <CardFooter className="p-4 pt-0 flex justify-between items-center">
                  <span className="font-bold text-lg">${product.price.toFixed(2)}</span>
                  <Button size="sm" variant="secondary">Add</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
