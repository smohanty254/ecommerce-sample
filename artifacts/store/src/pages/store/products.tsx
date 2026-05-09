import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useListProducts, useListCategories, useAddCartItem } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Search, Filter, SlidersHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export default function Products() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<any>("newest");
  const [inStock, setInStock] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 1000]);

  const { data: productsData, isLoading } = useListProducts({
    search: search || undefined,
    categoryId,
    sortBy,
    inStock: inStock || undefined,
    minPrice: priceRange[0],
    maxPrice: priceRange[1],
  });

  const { data: categoriesData } = useListCategories();
  const categories = categoriesData || [];
  const products = productsData?.data || [];

  const addCartItem = useAddCartItem();

  const handleAddToCart = (productId: number) => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be signed in to add items to your cart" });
      setLocation("/login");
      return;
    }
    
    addCartItem.mutate({ data: { productId, quantity: 1 } }, {
      onSuccess: () => {
        toast({ title: "Added to cart", description: "Product has been added to your cart." });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message || "Failed to add to cart", variant: "destructive" });
      }
    });
  };

  const FilterSidebar = () => (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Categories</h3>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox id="cat-all" checked={categoryId === undefined} onCheckedChange={(c) => c && setCategoryId(undefined)} />
            <Label htmlFor="cat-all">All Categories</Label>
          </div>
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center space-x-2">
              <Checkbox id={`cat-${cat.id}`} checked={categoryId === cat.id} onCheckedChange={(c) => c ? setCategoryId(cat.id) : setCategoryId(undefined)} />
              <Label htmlFor={`cat-${cat.id}`}>{cat.name}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Price Range</h3>
        <Slider
          defaultValue={[0, 1000]}
          max={1000}
          step={10}
          value={priceRange}
          onValueChange={setPriceRange}
          className="mb-2"
        />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>${priceRange[0]}</span>
          <span>${priceRange[1]}</span>
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Availability</h3>
        <div className="flex items-center space-x-2">
          <Checkbox id="in-stock" checked={inStock} onCheckedChange={(c) => setInStock(c as boolean)} />
          <Label htmlFor="in-stock">In Stock Only</Label>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products</h1>
          <p className="text-muted-foreground mt-1">Browse our complete collection</p>
        </div>
        
        <div className="flex items-center w-full md:w-auto gap-2">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search..." 
              className="pl-9" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest Arrivals</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="bestseller">Best Sellers</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterSidebar />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="hidden md:block w-64 flex-shrink-0">
          <div className="sticky top-24 bg-card border rounded-xl p-6">
            <div className="flex items-center gap-2 font-bold text-lg mb-6 border-b pb-4">
              <Filter className="h-5 w-5" /> Filters
            </div>
            <FilterSidebar />
          </div>
        </aside>

        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-64 w-full" />
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-24 bg-muted/50 rounded-xl border border-dashed">
              <p className="text-lg font-medium text-muted-foreground">No products found</p>
              <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search query.</p>
              <Button variant="outline" className="mt-4" onClick={() => {
                setSearch(""); setCategoryId(undefined); setInStock(false); setPriceRange([0, 1000]);
              }}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map(product => (
                <Card key={product.id} className="overflow-hidden group hover-elevate transition-all border-border/50 flex flex-col">
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                    )}
                    {product.stock <= 5 && product.stock > 0 && (
                      <div className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-xs font-bold px-2 py-1 rounded">
                        Only {product.stock} left
                      </div>
                    )}
                    {product.stock === 0 && (
                      <div className="absolute top-2 right-2 bg-muted text-muted-foreground text-xs font-bold px-2 py-1 rounded">
                        Out of stock
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 flex-1">
                    <Link href={`/products/${product.id}`} className="font-bold text-lg hover:underline line-clamp-1">{product.name}</Link>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{product.categoryName}</p>
                    <div className="mt-2 font-bold text-lg">${product.price.toFixed(2)}</div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0">
                    <Button 
                      className="w-full" 
                      disabled={product.stock === 0 || addCartItem.isPending}
                      onClick={() => handleAddToCart(product.id)}
                    >
                      {product.stock === 0 ? "Out of Stock" : "Add to Cart"}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
