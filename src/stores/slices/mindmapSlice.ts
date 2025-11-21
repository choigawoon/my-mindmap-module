/**
 * Mindmap Slice - Manages mindmap editor state
 *
 * Purpose: Handle mindmap editing, parsing, and document management
 * Use cases: Mindmap editor, preview, save/load operations
 */

import type { StateCreator } from 'zustand'
import type { MindmapNode } from '@/schemas'

export interface MindmapDocument {
  id?: number
  title: string
  content: string
  created_at: string
  updated_at: string
}

export interface MindmapSlice {
  // State
  currentDocument: MindmapDocument | null
  parsedNodes: MindmapNode | null
  savedDocuments: MindmapDocument[]
  isEditing: boolean
  hasUnsavedChanges: boolean
  parseError: string | null

  // Actions
  setCurrentDocument: (doc: MindmapDocument | null) => void
  updateContent: (content: string) => void
  updateTitle: (title: string) => void
  setParsedNodes: (nodes: MindmapNode | null) => void
  setParseError: (error: string | null) => void
  setSavedDocuments: (docs: MindmapDocument[]) => void
  addSavedDocument: (doc: MindmapDocument) => void
  updateSavedDocument: (id: number, doc: MindmapDocument) => void
  removeSavedDocument: (id: number) => void
  newDocument: () => void
  markSaved: () => void
  reset: () => void
}

const createNewDocument = (): MindmapDocument => ({
  title: 'Untitled Mindmap',
  content: `Root Node
  Child 1
    Grandchild 1
    Grandchild 2
  Child 2
  Child 3`,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
})

const initialState = {
  currentDocument: createNewDocument(),
  parsedNodes: null as MindmapNode | null,
  savedDocuments: [] as MindmapDocument[],
  isEditing: true,
  hasUnsavedChanges: false,
  parseError: null as string | null,
}

export const createMindmapSlice: StateCreator<MindmapSlice> = (set, get) => ({
  ...initialState,

  setCurrentDocument: (doc) => {
    set({
      currentDocument: doc,
      hasUnsavedChanges: false,
      parseError: null,
    })
  },

  updateContent: (content) => {
    const current = get().currentDocument
    if (current) {
      set({
        currentDocument: {
          ...current,
          content,
          updated_at: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      })
    }
  },

  updateTitle: (title) => {
    const current = get().currentDocument
    if (current) {
      set({
        currentDocument: {
          ...current,
          title,
          updated_at: new Date().toISOString(),
        },
        hasUnsavedChanges: true,
      })
    }
  },

  setParsedNodes: (nodes) => {
    set({ parsedNodes: nodes })
  },

  setParseError: (error) => {
    set({ parseError: error })
  },

  setSavedDocuments: (docs) => {
    set({ savedDocuments: docs })
  },

  addSavedDocument: (doc) => {
    set((state) => ({
      savedDocuments: [...state.savedDocuments, doc],
    }))
  },

  updateSavedDocument: (id, doc) => {
    set((state) => ({
      savedDocuments: state.savedDocuments.map((d) =>
        d.id === id ? doc : d
      ),
    }))
  },

  removeSavedDocument: (id) => {
    set((state) => ({
      savedDocuments: state.savedDocuments.filter((d) => d.id !== id),
    }))
  },

  newDocument: () => {
    set({
      currentDocument: createNewDocument(),
      parsedNodes: null,
      hasUnsavedChanges: false,
      parseError: null,
    })
  },

  markSaved: () => {
    set({ hasUnsavedChanges: false })
  },

  reset: () => set(initialState),
})
