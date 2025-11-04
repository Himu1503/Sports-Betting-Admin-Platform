import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '../api/client'
import { Sport } from '../types'

const SPORTS_QUERY_KEY = ['sports']

export function useSports() {
  return useQuery({
    queryKey: SPORTS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<Sport[]>('/api/sports')
      return response.data
    },
  })
}

export function useCreateSport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiClient.post<Sport>('/api/sports', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPORTS_QUERY_KEY })
    },
  })
}

export function useUpdateSport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ name, data }: { name: string; data: { name: string } }) => {
      const response = await apiClient.put<Sport>(`/api/sports/${name}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPORTS_QUERY_KEY })
    },
  })
}

export function useDeleteSport() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (name: string) => {
      await apiClient.delete(`/api/sports/${name}`)
      return name
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SPORTS_QUERY_KEY })
    },
  })
}

