/**
 * Mindmap Editor Page
 *
 * Split view editor with text input and visual preview.
 * Supports save, load, and share functionality.
 */

import { createFileRoute, useSearch } from '@tanstack/react-router'
import { useEffect, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Save,
  FolderOpen,
  Share2,
  Plus,
  Trash2,
  FileText,
  Download,
  Copy,
  Check,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import MindmapRenderer from '@/components/MindmapRenderer'
import {
  useCurrentMindmap,
  useParsedNodes,
  useSavedMindmaps,
  useHasUnsavedChanges,
  useParseError,
  useMindmapActions,
} from '@/stores'
import { db, type MindmapEntity } from '@/db'
import { parseTextToTree } from '@/lib/mindmap-parser'
import type { MindmapShare } from '@/schemas'

// Route search params for sharing
interface MindmapSearchParams {
  data?: string
}

export const Route = createFileRoute('/mindmap')({
  validateSearch: (search: Record<string, unknown>): MindmapSearchParams => ({
    data: search.data as string | undefined,
  }),
  component: MindmapEditor,
})

function MindmapEditor() {
  const { t } = useTranslation()
  const search = useSearch({ from: '/mindmap' })

  const currentDocument = useCurrentMindmap()
  const parsedNodes = useParsedNodes()
  const savedDocuments = useSavedMindmaps()
  const hasUnsavedChanges = useHasUnsavedChanges()
  const parseError = useParseError()

  const {
    setCurrentDocument,
    updateContent,
    updateTitle,
    setParsedNodes,
    setParseError,
    setSavedDocuments,
    addSavedDocument,
    updateSavedDocument,
    removeSavedDocument,
    newDocument,
    markSaved,
  } = useMindmapActions()

  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false)
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Load saved documents from IndexedDB
  const loadSavedDocuments = useCallback(async () => {
    try {
      const docs = await db.mindmaps.toArray()
      setSavedDocuments(docs.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
      })))
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
  }, [setSavedDocuments])

  // Load shared data from URL on mount
  useEffect(() => {
    if (search.data) {
      try {
        const decoded = atob(search.data)
        const shared: MindmapShare = JSON.parse(decoded)
        setCurrentDocument({
          title: shared.title,
          content: shared.content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      } catch (error) {
        console.error('Failed to parse shared data:', error)
      }
    }
  }, [search.data, setCurrentDocument])

  // Load documents on mount
  useEffect(() => {
    loadSavedDocuments()
  }, [loadSavedDocuments])

  // Parse content when it changes
  useEffect(() => {
    if (currentDocument?.content) {
      try {
        const tree = parseTextToTree(currentDocument.content)
        setParsedNodes(tree)
        setParseError(null)
      } catch (error) {
        setParseError(error instanceof Error ? error.message : 'Parse error')
        setParsedNodes(null)
      }
    } else {
      setParsedNodes(null)
    }
  }, [currentDocument?.content, setParsedNodes, setParseError])

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateContent(e.target.value)
  }

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateTitle(e.target.value)
  }

  // Save document
  const handleSave = async () => {
    if (!currentDocument) return

    setSaveStatus('saving')
    try {
      const now = new Date().toISOString()
      const docData: Omit<MindmapEntity, 'id'> = {
        title: currentDocument.title,
        content: currentDocument.content,
        created_at: currentDocument.created_at,
        updated_at: now,
      }

      if (currentDocument.id) {
        // Update existing
        await db.mindmaps.put({ ...docData, id: currentDocument.id })
        updateSavedDocument(currentDocument.id, {
          ...currentDocument,
          updated_at: now,
        })
      } else {
        // Create new
        const id = await db.mindmaps.add(docData)
        const newDoc = { ...currentDocument, id, updated_at: now }
        addSavedDocument(newDoc)
        setCurrentDocument(newDoc)
      }

      markSaved()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (error) {
      console.error('Failed to save:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  // Load document
  const handleLoad = (doc: typeof savedDocuments[0]) => {
    setCurrentDocument(doc)
    setIsLoadDialogOpen(false)
  }

  // Delete document
  const handleDelete = async (id: number) => {
    try {
      await db.mindmaps.delete(id)
      removeSavedDocument(id)
      if (currentDocument?.id === id) {
        newDocument()
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  // Generate share URL
  const handleShare = () => {
    if (!currentDocument) return

    const shareData: MindmapShare = {
      title: currentDocument.title,
      content: currentDocument.content,
    }
    const encoded = btoa(JSON.stringify(shareData))
    const url = `${window.location.origin}/mindmap?data=${encoded}`
    setShareUrl(url)
    setIsShareDialogOpen(true)
    setCopied(false)
  }

  // Copy share URL
  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  // Export as text file
  const handleExport = () => {
    if (!currentDocument) return

    const blob = new Blob([currentDocument.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentDocument.title.replace(/[^a-z0-9]/gi, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <Input
            value={currentDocument?.title || ''}
            onChange={handleTitleChange}
            placeholder={t('pages.mindmap.untitled')}
            className="w-64 font-semibold"
          />
          {hasUnsavedChanges && (
            <Badge variant="secondary">{t('pages.mindmap.unsaved')}</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => newDocument()}>
            <Plus className="w-4 h-4 mr-1" />
            {t('common.create')}
          </Button>

          <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderOpen className="w-4 h-4 mr-1" />
                {t('pages.mindmap.load')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t('pages.mindmap.loadDocument')}</DialogTitle>
              </DialogHeader>
              <div className="max-h-80 overflow-y-auto">
                {savedDocuments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    {t('pages.mindmap.noSavedDocuments')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {savedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                      >
                        <button
                          onClick={() => handleLoad(doc)}
                          className="flex-1 text-left"
                        >
                          <div className="font-medium">{doc.title}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(doc.updated_at).toLocaleDateString()}
                          </div>
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => doc.id && handleDelete(doc.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? (
              <span className="animate-pulse">{t('common.saving')}</span>
            ) : saveStatus === 'saved' ? (
              <>
                <Check className="w-4 h-4 mr-1 text-green-500" />
                {t('pages.mindmap.saved')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                {t('common.save')}
              </>
            )}
          </Button>

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-1" />
            {t('pages.mindmap.export')}
          </Button>

          <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-1" />
                {t('pages.mindmap.share')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('pages.mindmap.shareDocument')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  {t('pages.mindmap.shareDescription')}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="flex-1 text-xs"
                  />
                  <Button onClick={handleCopyUrl} size="sm">
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {copied && (
                  <p className="text-sm text-green-600">
                    {t('pages.mindmap.copied')}
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Parse error alert */}
      {parseError && (
        <Alert variant="destructive" className="m-4 mb-0">
          <X className="h-4 w-4" />
          <AlertDescription>{parseError}</AlertDescription>
        </Alert>
      )}

      {/* Split view */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor panel */}
        <div className="w-1/2 border-r flex flex-col">
          <div className="p-2 bg-gray-100 border-b flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="text-sm font-medium">{t('pages.mindmap.editor')}</span>
          </div>
          <textarea
            value={currentDocument?.content || ''}
            onChange={handleContentChange}
            placeholder={t('pages.mindmap.editorPlaceholder')}
            className="flex-1 p-4 font-mono text-sm resize-none focus:outline-none"
            spellCheck={false}
          />
          <div className="p-2 bg-gray-50 border-t text-xs text-gray-500">
            {t('pages.mindmap.editorHint')}
          </div>
        </div>

        {/* Preview panel */}
        <div className="w-1/2 flex flex-col">
          <div className="p-2 bg-gray-100 border-b flex items-center gap-2">
            <span className="text-sm font-medium">{t('pages.mindmap.preview')}</span>
          </div>
          <MindmapRenderer nodes={parsedNodes} className="flex-1" />
        </div>
      </div>
    </div>
  )
}
