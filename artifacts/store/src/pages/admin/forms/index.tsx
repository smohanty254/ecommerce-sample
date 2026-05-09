import { Link } from "wouter";
import { useListForms, useDeleteForm } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListFormsQueryKey } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function AdminForms() {
  const { data: formsData, isLoading } = useListForms();
  const deleteForm = useDeleteForm();
  const queryClient = useQueryClient();

  const forms = formsData || [];

  const handleDelete = (id: number) => {
    if (!confirm("Are you sure you want to delete this form?")) return;
    
    deleteForm.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Form deleted" });
        queryClient.invalidateQueries({ queryKey: getListFormsQueryKey() });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Forms</h2>
          <p className="text-muted-foreground">Build custom forms and view submissions.</p>
        </div>
        <Link href="/admin/forms/new">
          <Button><Plus className="mr-2 h-4 w-4" /> Create Form</Button>
        </Link>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Form Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fields</TableHead>
              <TableHead>Submissions</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : forms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  No forms created yet
                </TableCell>
              </TableRow>
            ) : (
              forms.map((form) => (
                <TableRow key={form.id}>
                  <TableCell className="font-medium">{form.name}</TableCell>
                  <TableCell>
                    {form.isPublished ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">Published</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-secondary text-secondary-foreground">Draft</Badge>
                    )}
                  </TableCell>
                  <TableCell>{form.fields?.length || 0}</TableCell>
                  <TableCell>{form.submissionCount || 0}</TableCell>
                  <TableCell>{new Date(form.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Link href={`/admin/forms/${form.id}`}>
                      <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(form.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
