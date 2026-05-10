import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCart,
  useAddCartItem,
  useUpdateCartItem,
  useRemoveCartItem,
  useClearCart,
  getGetCartQueryKey,
  type Cart,
} from "@workspace/api-client-react";
import { STALE_TIMES, GC_TIMES } from "@/lib/query-client";
import { useApiError } from "./use-api-error";
import { useAuth } from "@/lib/auth";

export function useCart() {
  const { user } = useAuth();
  return useGetCart({
    query: { staleTime: STALE_TIMES.short, gcTime: GC_TIMES.short, enabled: !!user } as never,
  });
}

export function useAddToCartMutation() {
  const queryClient = useQueryClient();
  const { handleError } = useApiError();

  return useAddCartItem({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: getGetCartQueryKey() });
        const previous = queryClient.getQueryData<Cart>(getGetCartQueryKey());

        queryClient.setQueryData<Cart>(getGetCartQueryKey(), (old) => {
          if (!old) return old;
          const existingItem = old.items?.find(
            (i) => i.productId === variables.data.productId,
          );
          if (existingItem) {
            return {
              ...old,
              items: old.items?.map((i) =>
                i.productId === variables.data.productId
                  ? { ...i, quantity: i.quantity + (variables.data.quantity ?? 1) }
                  : i,
              ),
            };
          }
          return {
            ...old,
            items: [
              ...(old.items ?? []),
              {
                productId: variables.data.productId,
                productName: "",
                price: 0,
                quantity: variables.data.quantity ?? 1,
                imageUrl: null,
                subtotal: 0,
              },
            ],
          };
        });

        return { previous };
      },
      onError: (err, _vars, context: { previous?: Cart } | undefined) => {
        if (context?.previous) {
          queryClient.setQueryData(getGetCartQueryKey(), context.previous);
        }
        handleError(err, "Add to cart");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      },
    },
  });
}

export function useUpdateCartItemMutation() {
  const queryClient = useQueryClient();
  const { handleError } = useApiError();

  return useUpdateCartItem({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: getGetCartQueryKey() });
        const previous = queryClient.getQueryData<Cart>(getGetCartQueryKey());

        queryClient.setQueryData<Cart>(getGetCartQueryKey(), (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items?.map((i) =>
              i.productId === variables.productId
                ? { ...i, quantity: variables.data.quantity ?? i.quantity }
                : i,
            ),
          };
        });

        return { previous };
      },
      onError: (err, _vars, context: { previous?: Cart } | undefined) => {
        if (context?.previous) {
          queryClient.setQueryData(getGetCartQueryKey(), context.previous);
        }
        handleError(err, "Update cart");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      },
    },
  });
}

export function useRemoveCartItemMutation() {
  const queryClient = useQueryClient();
  const { handleError } = useApiError();

  return useRemoveCartItem({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey: getGetCartQueryKey() });
        const previous = queryClient.getQueryData<Cart>(getGetCartQueryKey());

        queryClient.setQueryData<Cart>(getGetCartQueryKey(), (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items?.filter((i) => i.productId !== variables.productId),
          };
        });

        return { previous };
      },
      onError: (err, _vars, context: { previous?: Cart } | undefined) => {
        if (context?.previous) {
          queryClient.setQueryData(getGetCartQueryKey(), context.previous);
        }
        handleError(err, "Remove item");
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      },
    },
  });
}

export function useClearCartMutation() {
  const queryClient = useQueryClient();
  const { handleError } = useApiError();

  return useClearCart({
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData<Cart>(getGetCartQueryKey(), (old) =>
          old ? { ...old, items: [] } : old,
        );
      },
      onError: (err) => handleError(err, "Clear cart"),
    },
  });
}
