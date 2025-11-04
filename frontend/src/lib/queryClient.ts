import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data is fresh for 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes - garbage collection time (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Retry failed requests once
      refetchOnMount: false, // Don't refetch on component mount if data exists
    },
    mutations: {
      retry: 1,
    },
  },
})

