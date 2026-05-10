import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useGetCart, useListNotifications } from "@workspace/api-client-react";
import { ShoppingCart, Bell, Menu, User, Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { data: cart } = useGetCart({ query: { enabled: !!user } as never });
  const { data: notificationsData } = useListNotifications({ unreadOnly: true }, { query: { enabled: !!user } as never });
  const notifications = notificationsData || [];
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-bold text-2xl tracking-tighter text-primary">EcoStore</Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/products" className="transition-colors hover:text-foreground/80 text-foreground/60">Products</Link>
              <Link href="/categories" className="transition-colors hover:text-foreground/80 text-foreground/60">Categories</Link>
            </nav>
          </div>
          
          <div className="hidden md:flex flex-1 max-w-sm mx-4">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input type="search" placeholder="Search products..." className="w-full bg-muted pl-9 rounded-full border-none focus-visible:ring-1" />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {user ? (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative">
                      <Bell className="h-5 w-5" />
                      {notifications.length > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full">{notifications.length}</Badge>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-4 font-semibold border-b">Notifications</div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">No new notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} className="p-4 border-b last:border-0 hover:bg-muted/50 cursor-pointer">
                            <p className="font-medium text-sm">{n.title}</p>
                            {n.message && <p className="text-xs text-muted-foreground mt-1">{n.message}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                <Link href="/cart">
                  <Button variant="ghost" size="icon" className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    {cart && cart.itemCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full">{cart.itemCount}</Badge>
                    )}
                  </Button>
                </Link>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <User className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="end">
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="border-t my-1" />
                    <div className="p-1">
                      <Link href="/profile">
                        <Button variant="ghost" className="w-full justify-start" size="sm">Profile</Button>
                      </Link>
                      <Link href="/orders">
                        <Button variant="ghost" className="w-full justify-start" size="sm">Orders</Button>
                      </Link>
                      {(user.role === "admin" || user.role === "manager") && (
                        <Link href="/admin">
                          <Button variant="ghost" className="w-full justify-start" size="sm">Admin Dashboard</Button>
                        </Link>
                      )}
                      <Button variant="ghost" className="w-full justify-start text-destructive" size="sm" onClick={logout}>Sign out</Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/login">
                  <Button>Sign Up</Button>
                </Link>
              </div>
            )}
            
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="border-t bg-muted/40 py-12 mt-12">
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          <div>
            <h3 className="font-bold text-lg mb-4 text-foreground">EcoStore</h3>
            <p className="text-muted-foreground leading-relaxed">Premium ecommerce platform for serious merchants and customers.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Shop</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link href="/products" className="hover:text-primary">All Products</Link></li>
              <li><Link href="/categories" className="hover:text-primary">Categories</Link></li>
              <li><Link href="/trending" className="hover:text-primary">Trending</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Support</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link href="/faq" className="hover:text-primary">FAQ</Link></li>
              <li><Link href="/shipping" className="hover:text-primary">Shipping</Link></li>
              <li><Link href="/returns" className="hover:text-primary">Returns</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-foreground">Legal</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-primary">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="container mx-auto px-4 mt-12 pt-8 border-t text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} EcoStore. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
