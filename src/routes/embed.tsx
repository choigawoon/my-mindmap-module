/**
 * Embed Route for Mindmap
 *
 * Read-only view of a mindmap for embedding in other websites.
 * Supports data parameter for Base64 encoded mindmap data.
 */

import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import MindmapRenderer from '@/components/MindmapRenderer'
import { parseTextToTree } from '@/lib/mindmap-parser'
import type { MindmapNode, MindmapShare } from '@/schemas'

// Route search params for embed
interface EmbedSearchParams {
  data?: string
}

export const Route = createFileRoute('/embed')({
  validateSearch: (search: Record<string, unknown>): EmbedSearchParams => ({
    data: search.data as string | undefined,
  }),
  component: EmbedView,
})

function EmbedView() {
  const { t } = useTranslation()
  const search = useSearch({ from: '/embed' })

  const [title, setTitle] = useState('')
  const [parsedNodes, setParsedNodes] = useState<MindmapNode | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Parse data from URL on mount
  useEffect(() => {
    if (search.data) {
      try {
        const decoded = atob(search.data)
        const shared: MindmapShare = JSON.parse(decoded)
        setTitle(shared.title)

        const tree = parseTextToTree(shared.content)
        setParsedNodes(tree)
        setError(null)
      } catch (err) {
        console.error('Failed to parse embed data:', err)
        setError(t('pages.embed.parseError'))
      }
    } else {
      setError(t('pages.embed.noData'))
    }
  }, [search.data, t])

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Minimal header with title */}
      {title && (
        <div className="px-4 py-2 border-b bg-gray-50">
          <h1 className="text-sm font-medium text-gray-700 truncate">{title}</h1>
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
