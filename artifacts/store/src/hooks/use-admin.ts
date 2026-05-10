import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardStats,
  useGetSalesChart,
  useGetTopProducts,
  useGetRecentOrders,
  useGetRevenueByCategory,
  useListOrders,
  useUpdateOrderStatus,
  useListUsers,
  useUpdateUserRole,
  useListCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  getListOrdersQueryKey,
  getGetDashboardStatsQueryKey,
  getListUsersQueryKey,
  getListCategoriesQueryKey,
  type GetSalesChartParams,
  type GetTopProductsParams,
  type GetRecentOrdersParams,
  type ListOrdersParams,
  type ListUsersParams,
} from "@workspace/api-client-react";
import { STALE_TIMES, GC_TIMES } from "@/lib/query-client";
import { useApiError } from "./use-api-error";

export function useDashboardStats() {
  return useGetDashboardStats({
    query: { staleTime: STALE_TIMES.medium, gcTime: GC_TIMES.medium } as never,
  });
}

export function useSalesChart(params: GetSalesChartParams = {}) {
  return useGetSalesChart(params, {
    query: { staleTime: STALE_TIMES.long, gcTime: GC_TIMES.long } as never,
  });
}

export function useTopProducts(params: GetTopProductsParams = {}) {
  return useGetTopProducts(params, {
    query: { staleTime: STALE_TIMES.long, gcTime: GC_TIMES.long } as never,
  });
}

export function useRecentOrders(params: GetRecentOrdersParams = {}) {
  return useGetRecentOrders(params, {
    query: { staleTime: STALE_TIMES.short, gcTime: GC_TIMES.short } as never,
  });
}

export function useRevenueByCategory() {
  return useGetRevenueByCategory({
    query: { staleTime: STALE_TIMES.long, gcTime: GC_TIMES.long } as never,
  });
}

export function useAdminOrders(params: ListOrdersParams = {}) {
  return useListOrders(params, {
    query: { staleTime: STALE_TIMES.short, gcTime: GC_TIMES.short } as never,
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiError();

  return useUpdateOrderStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        handleSuccess("Order status updated");
      },
      onError: (err) => handleError(err, "Update order status"),
    },
  });
}

export function useAdminUsers(params: ListUsersParams = {}) {
  return useListUsers(params, {
    query: { staleTime: STALE_TIMES.medium, gcTime: GC_TIMES.medium } as never,
  });
}

export function useUpdateUserRoleMutation() {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiError();

  return useUpdateUserRole({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        handleSuccess("User role updated");
      },
      onError: (err) => handleError(err, "Update user role"),
    },
  });
}

export function useCategories() {
  return useListCategories({
    query: { staleTime: STALE_TIMES.veryLong, gcTime: GC_TIMES.long } as never,
  });
}

export function useCreateCategoryMutation() {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiError();

  return useCreateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        handleSuccess("Category created");
      },
      onError: (err) => handleError(err, "Create category"),
    },
  });
}

export function useUpdateCategoryMutation() {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiError();

  return useUpdateCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        handleSuccess("Category updated");
      },
      onError: (err) => handleError(err, "Update category"),
    },
  });
}

export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient();
  const { handleError, handleSuccess } = useApiError();

  return useDeleteCategory({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
        handleSuccess("Category deleted");
      },
      onError: (err) => handleError(err, "Delete category"),
    },
  });
}
