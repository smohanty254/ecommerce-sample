import { useQueryClient } from "@tanstack/react-query";
import {
  useListProducts,
  useGetProduct,
  useListFeaturedProducts,
  useListTrendingProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useUpdateProductStock,
  getListProductsQueryKey,
  getGetProductQueryKey,
  getListFeaturedProductsQueryKey,
  getListTrendingProductsQueryKey,
  type ListProductsParams,
} from "@workspace/api-client-react";
import { STALE_TIMES, GC_TIMES } from "@/lib/query-client";
import { useApiError } from "./use-api-error";

export function useProducts(params: ListProductsParams = {}) {
  return useListProducts(params, {
    query: { staleTime: STALE_TIMES.medium, gcTime: GC_TIMES.medium } as never,
  });
}

export function useProduct(id: number, enabled = true) {
  return useGetProduct(id, {
    query: { staleTime: STALE_TIMES.long, gcTime: GC_TIMES.long, enabled: enabled && id > 0 } as never,
  });
}

export function useFeaturedProducts() {
  return useListFeaturedProducts({
    query: { staleTime: STALE_TIMES.long, gcTime: GC_TIMES.long } as never,
  });
}

export function useTrendingProducts() {
  return useListTrendingProducts({
    query: { staleTime: STALE_TIMES.long, gcTime: GC_TIMES.long } as never,
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiError();

  return useCreateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListFeaturedProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTrendingProductsQueryKey() });
        handleSuccess("Product created");
      },
      onError: (err) => handleError(err, "Create product"),
    },
  });
}

export function useUpdateProductMutation(id: number) {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiError();

  return useUpdateProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(id) });
        handleSuccess("Product updated");
      },
      onError: (err) => handleError(err, "Update product"),
    },
  });
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiError();

  return useDeleteProduct({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        handleSuccess("Product deleted");
      },
      onError: (err) => handleError(err, "Delete product"),
    },
  });
}

export function useUpdateStockMutation(id: number) {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiError();

  return useUpdateProductStock({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
        handleSuccess("Stock updated");
      },
      onError: (err) => handleError(err, "Update stock"),
    },
  });
}
