import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { parseApiError, isUnauthorized, isForbidden } from "@/lib/error";
import { useAuth } from "@/lib/auth";

export function useApiError() {
  const { toast } = useToast();
  const { logout } = useAuth();

  const handleError = useCallback(
    (err: unknown, context?: string) => {
      if (isUnauthorized(err)) {
        logout();
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        return;
      }

      if (isForbidden(err)) {
        toast({
          title: "Access denied",
          description: "You don't have permission to perform this action.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: context ? `${context} failed` : "Something went wrong",
        description: parseApiError(err),
        variant: "destructive",
      });
    },
    [toast, logout],
  );

  const handleSuccess = useCallback(
    (message: string, description?: string) => {
      toast({ title: message, description });
    },
    [toast],
  );

  return { handleError, handleSuccess };
}
