import { useState } from "react";
import { useListCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListCategoriesQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCategories() {
  const { data: categoriesData, isLoading } = useListCategories();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const queryClient = useQueryClient();

  const categories = categoriesData || [];

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const handleEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditSlug(cat.slug);
  };

  const handleCancel = () => {
    setEditingId(null);
    setIsAdding(false);
  };

  const handleSaveAdd = () => {
    if (!newName || !newSlug) {
      toast({ title: "Name and slug are required", variant: "destructive" });
      return;
    }
    createCategory.mutate({ data: { name: newName, slug: newSlug } }, {
      onSuccess: () => {
        toast({ title: "Category added" });
        setIsAdding(false);
        setNewName("");
        setNewSlug("");
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const handleSaveEdit = (id: number) => {
    if (!editName || !editSlug) {
      toast({ title: "Name and slug are required", variant: "destructive" });
      return;
    }
    updateCategory.mutate({ id, data: { name: editName, slug: editSlug } }, {
      onSuccess: () => {
        toast({ title: "Category updated" });
        setEditingId(null);
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete category?")) return;
    deleteCategory.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Category deleted" });
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
      },
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground">Manage product categories.</p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}><Plus className="mr-2 h-4 w-4" /> Add Category</Button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Products</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && (
              <TableRow>
                <TableCell>
                  <Input value={newName} onChange={(e) => {
                    setNewName(e.target.value);
                    setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }} placeholder="Category Name" />
                </TableCell>
                <TableCell>
                  <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="category-slug" />
                </TableCell>
                <TableCell>0</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={handleSaveAdd}><Check className="h-4 w-4 text-green-500" /></Button>
                  <Button variant="ghost" size="icon" onClick={handleCancel}><X className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            )}
            
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : categories.length === 0 && !isAdding ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center h-32 text-muted-foreground">No categories found</TableCell>
              </TableRow>
            ) : (
              categories.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    {editingId === cat.id ? (
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : (
                      <span className="font-medium">{cat.name}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === cat.id ? (
                      <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
                    ) : (
                      <span className="text-muted-foreground">{cat.slug}</span>
                    )}
                  </TableCell>
                  <TableCell>{cat.productCount || 0}</TableCell>
                  <TableCell className="text-right">
                    {editingId === cat.id ? (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(cat.id)}><Check className="h-4 w-4 text-green-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={handleCancel}><X className="h-4 w-4 text-destructive" /></Button>
                      </>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(cat)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
