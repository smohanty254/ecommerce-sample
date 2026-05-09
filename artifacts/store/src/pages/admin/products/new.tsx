import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useCreateProduct, useListCategories } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const productSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z.string().min(2, "Slug is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0.01, "Price must be greater than 0"),
  compareAtPrice: z.coerce.number().optional(),
  stock: z.coerce.number().min(0, "Stock cannot be negative"),
  sku: z.string().optional(),
  categoryId: z.coerce.number().min(1, "Category is required"),
  imageUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isFeatured: z.boolean().default(false),
});

export default function AdminProductNew() {
  const [, setLocation] = useLocation();
  const { data: categoriesData } = useListCategories();
  const createProduct = useCreateProduct();
  const categories = categoriesData || [];

  const form = useForm<z.infer<typeof productSchema>>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      price: 0,
      compareAtPrice: 0,
      stock: 0,
      sku: "",
      categoryId: 0,
      imageUrl: "",
      isFeatured: false,
    },
  });

  const onSubmit = (data: z.infer<typeof productSchema>) => {
    createProduct.mutate({
      data: {
        ...data,
        compareAtPrice: data.compareAtPrice || undefined,
        imageUrl: data.imageUrl || undefined,
        sku: data.sku || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Product created successfully" });
        setLocation("/admin/products");
      },
      onError: (err) => {
        toast({ title: "Error creating product", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center gap-4">
        <Link href="/admin/products">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Product</h2>
          <p className="text-muted-foreground">Add a new product to your catalog.</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl><Input placeholder="e.g. Premium Wireless Headphones" {...field} onChange={(e) => {
                        field.onChange(e);
                        // Auto-generate slug
                        if (!form.getValues('slug')) {
                          form.setValue('slug', e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                        }
                      }} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="slug" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug</FormLabel>
                      <FormControl><Input placeholder="premium-wireless-headphones" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl><Textarea className="min-h-[150px]" placeholder="Detailed product description..." {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="compareAtPrice" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Compare at Price ($)</FormLabel>
                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <FormField control={form.control} name="stock" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inventory (Stock)</FormLabel>
                        <FormControl><Input type="number" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sku" render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU (Stock Keeping Unit)</FormLabel>
                        <FormControl><Input placeholder="PRD-12345" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              <Card>
                <CardContent className="p-6 space-y-6">
                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ? field.value.toString() : ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  
                  <FormField control={form.control} name="isFeatured" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Featured</FormLabel>
                        <p className="text-sm text-muted-foreground">Show on homepage</p>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 space-y-6">
                  <FormField control={form.control} name="imageUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Main Image URL</FormLabel>
                      <FormControl><Input placeholder="https://example.com/image.jpg" {...field} /></FormControl>
                      <FormMessage />
                      {field.value && (
                        <div className="mt-4 aspect-square bg-muted rounded-lg overflow-hidden border">
                          <img src={field.value} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                      )}
                    </FormItem>
                  )} />
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Link href="/admin/products"><Button type="button" variant="outline">Cancel</Button></Link>
            <Button type="submit" disabled={createProduct.isPending}>
              <Save className="mr-2 h-4 w-4" /> Save Product
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
