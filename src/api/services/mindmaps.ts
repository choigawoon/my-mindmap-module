/**
 * Mindmaps API Service
 *
 * This module provides React Query hooks for managing mindmaps.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import type {
  Mindmap,
  MindmapCreate,
  MindmapUpdate,
  MindmapsListResponse,
} from '@/schemas'

/**
 * Query keys for mindmaps
 */
export const mindmapsKeys = {
  all: ['mindmaps'] as const,
  lists: () => [...mindmapsKeys.all, 'list'] as const,
  list: (params?: { skip?: number; limit?: number }) =>
    [...mindmapsKeys.lists(), params] as const,
  details: () => [...mindmapsKeys.all, 'detail'] as const,
  detail: (id: number) => [...mindmapsKeys.details(), id] as const,
}

/**
 * Fetch mindmaps list
 */
export const useMindmaps = (params?: { skip?: number; limit?: number }) => {
  return useQuery({
    queryKey: mindmapsKeys.list(params),
    queryFn: () =>
      apiClient.get<MindmapsListResponse>('/api/mindmaps', { params }),
  })
}

/**
 * Fetch single mindmap
 */
export const useMindmap = (id: number | undefined) => {
  return useQuery({
    queryKey: mindmapsKeys.detail(id!),
    queryFn: () => apiClient.get<Mindmap>(`/api/mindmaps/${id}`),
    enabled: !!id,
  })
}

/**
 * Create new mindmap
 */
export const useCreateMindmap = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: MindmapCreate) =>
      apiClient.post<Mindmap>('/api/mindmaps', data),
    onSuccess: () => {
      // Invalidate and refetch mindmaps list
      queryClient.invalidateQueries({ queryKey: mindmapsKeys.lists() })
    },
  })
}

/**
 * Update mindmap
 */
export const useUpdateMindmap = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: MindmapUpdate }) =>
      apiClient.put<Mindmap>(`/api/mindmaps/${id}`, data),
    onSuccess: (data) => {
      // Invalidate mindmap detail and list
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: mindmapsKeys.detail(data.id) })
      }
      queryClient.invalidateQueries({ queryKey: mindmapsKeys.lists() })
    },
  })
}

/**
 * Delete mindmap
 */
export const useDeleteMindmap = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) =>
      apiClient.delete<{ message: string }>(`/api/mindmaps/${id}`),
    onSuccess: () => {
      // Invalidate mindmaps list
      queryClient.invalidateQueries({ queryKey: mindmapsKeys.lists() })
    },
  })
}
