import { QueryClient } from "@tanstack/react-query";
import { shouldRetry } from "./error";

export const STALE_TIMES = {
  instant: 0,
  short: 30 * 1000,
  medium: 2 * 60 * 1000,
  long: 5 * 60 * 1000,
  veryLong: 10 * 60 * 1000,
} as const;

export const GC_TIMES = {
  short: 2 * 60 * 1000,
  medium: 5 * 60 * 1000,
  long: 10 * 60 * 1000,
} as const;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIMES.medium,
        gcTime: GC_TIMES.medium,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
