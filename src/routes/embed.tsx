/**
 * Embed Route for Mindmap
 *
 * Read-only view of a mindmap for embedding in other websites.
 * Fetches mindmap by ID from API.
 */

import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MindmapRenderer from '@/components/MindmapRenderer'
import { parseTextToTree } from '@/lib/mindmap-parser'
import { useMindmap } from '@/api/services'
import type { MindmapNode } from '@/schemas'

// Route search params for embed
interface EmbedSearchParams {
  id?: number
}

export const Route = createFileRoute('/embed')({
  validateSearch: (search: Record<string, unknown>): EmbedSearchParams => ({
    id: search.id ? Number(search.id) : undefined,
  }),
  component: EmbedView,
})

function EmbedView() {
  const { t } = useTranslation()
  const search = useSearch({ from: '/embed' })

  const [parsedNodes, setParsedNodes] = useState<MindmapNode | null>(null)

  // Fetch mindmap by ID
  const { data: mindmap, isLoading, error } = useMindmap(search.id)

  // Parse content when mindmap data is loaded
  useEffect(() => {
    if (mindmap?.content) {
      try {
        const tree = parseTextToTree(mindmap.content)
        setParsedNodes(tree)
      } catch (err) {
        console.error('Failed to parse mindmap:', err)
        setParsedNodes(null)
      }
    }
  }, [mindmap?.content])

  if (!search.id) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <p className="text-gray-500">{t('pages.embed.noData')}</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  if (error || !mindmap) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <p className="text-gray-500">{t('pages.embed.notFound')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Minimal header with title */}
      {mindmap.title && (
        <div className="px-4 py-2 border-b bg-gray-50">
          <h1 className="text-sm font-medium text-gray-700 truncate">{mindmap.title}</h1>
        </div>
      )}

      {/* Mindmap viewer */}
      <div className="flex-1">
        <MindmapRenderer nodes={parsedNodes} className="h-full" />
      </div>

      {/* Powered by badge */}
      <div className="px-4 py-2 border-t bg-gray-50 flex justify-end">
        <a
          href={window.location.origin}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {t('pages.embed.poweredBy')}
        </a>
      </div>
    </div>
  )
}
