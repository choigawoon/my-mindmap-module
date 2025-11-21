/**
 * Mindmap Model Schema
 *
 * Defines the structure for mindmap nodes and documents.
 * Used for validation and type inference.
 */

import { z } from 'zod'

// =============================================================================
// Node Schema (recursive tree structure)
// =============================================================================

export interface MindmapNode {
  id: string
  text: string
  children: MindmapNode[]
  collapsed?: boolean
}

export const MindmapNodeSchema: z.ZodType<MindmapNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    text: z.string(),
    children: z.array(MindmapNodeSchema),
    collapsed: z.boolean().optional(),
  })
)

// =============================================================================
// Mindmap Document Schema
// =============================================================================

export const MindmapSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1, 'Title is required'),
  content: z.string(), // Raw text content
  nodes: MindmapNodeSchema.optional(), // Parsed tree structure
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export type Mindmap = z.infer<typeof MindmapSchema>

// =============================================================================
// API Request/Response Schemas
// =============================================================================

export const MindmapCreateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string(),
})

export type MindmapCreate = z.infer<typeof MindmapCreateSchema>

export const MindmapUpdateSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().optional(),
})

export type MindmapUpdate = z.infer<typeof MindmapUpdateSchema>

// =============================================================================
// Share Schema (for URL encoding)
// =============================================================================

export const MindmapShareSchema = z.object({
  title: z.string(),
  content: z.string(),
})

export type MindmapShare = z.infer<typeof MindmapShareSchema>
