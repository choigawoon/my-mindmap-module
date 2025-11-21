/**
 * Mindmap Renderer Component
 *
 * Renders mindmap tree structure as SVG visualization.
 * Supports zoom and pan interactions.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import type { MindmapNode } from '@/schemas'
import {
  calculateLayout,
  getBoundingBox,
  flattenPositions,
  type NodePosition,
} from '@/lib/mindmap-parser'

interface MindmapRendererProps {
  nodes: MindmapNode | null
  className?: string
}

export default function MindmapRenderer({
  nodes,
  className = '',
}: MindmapRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [scale, setScale] = useState(1)
  const [translate, setTranslate] = useState({ x: 50, y: 50 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Calculate layout
  const layout = nodes ? calculateLayout(nodes) : null
  const boundingBox = layout ? getBoundingBox(layout) : null
  const positions = layout ? flattenPositions(layout) : []

  // Handle mouse wheel for zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setScale((prev) => Math.min(Math.max(prev * delta, 0.1), 3))
  }, [])

  // Handle mouse events for pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y })
    }
  }, [translate])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setTranslate({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    }
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add wheel event listener
  useEffect(() => {
    const svg = svgRef.current
    if (svg) {
      svg.addEventListener('wheel', handleWheel, { passive: false })
      return () => svg.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  // Reset view
  const resetView = () => {
    setScale(1)
    setTranslate({ x: 50, y: 50 })
  }

  // Fit to view
  const fitToView = () => {
    if (boundingBox && svgRef.current) {
      const svg = svgRef.current
      const svgRect = svg.getBoundingClientRect()
      const padding = 100

      const scaleX = (svgRect.width - padding) / (boundingBox.width || 1)
      const scaleY = (svgRect.height - padding) / (boundingBox.height || 1)
      const newScale = Math.min(scaleX, scaleY, 1.5)

      setScale(newScale)
      setTranslate({
        x: padding / 2 - boundingBox.minX * newScale,
        y: padding / 2 - boundingBox.minY * newScale,
      })
    }
  }

  if (!nodes) {
    return (
      <div className={`flex items-center justify-center h-full bg-gray-50 ${className}`}>
        <p className="text-gray-500">No mindmap to display</p>
      </div>
    )
  }

  return (
    <div className={`relative h-full ${className}`}>
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setScale((s) => Math.min(s * 1.2, 3))}
          className="px-3 py-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-sm"
        >
          +
        </button>
        <button
          onClick={() => setScale((s) => Math.max(s * 0.8, 0.1))}
          className="px-3 py-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-sm"
        >
          -
        </button>
        <button
          onClick={fitToView}
          className="px-3 py-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-sm"
        >
          Fit
        </button>
        <button
          onClick={resetView}
          className="px-3 py-1 bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 text-sm"
        >
          Reset
        </button>
      </div>

      {/* Scale indicator */}
      <div className="absolute bottom-4 left-4 z-10 px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-600">
        {Math.round(scale * 100)}%
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full bg-gray-50 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${translate.x}, ${translate.y}) scale(${scale})`}>
          {/* Render connections first (behind nodes) */}
          {positions.map((pos) =>
            pos.children.map((childPos) => (
              <Connection
                key={`${pos.node.id}-${childPos.node.id}`}
                parent={pos}
                child={childPos}
              />
            ))
          )}

          {/* Render nodes */}
          {positions.map((pos) => (
            <Node key={pos.node.id} position={pos} />
          ))}
        </g>
      </svg>
    </div>
  )
}

// Node component
function Node({ position }: { position: NodePosition }) {
  const { node, x, y, width, height } = position
  const isRoot = x === 0

  return (
    <g>
      {/* Node background */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={6}
        ry={6}
        fill={isRoot ? '#3b82f6' : '#ffffff'}
        stroke={isRoot ? '#2563eb' : '#d1d5db'}
        strokeWidth={2}
        className="drop-shadow-sm"
      />

      {/* Node text */}
      <text
        x={x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        fill={isRoot ? '#ffffff' : '#374151'}
        fontSize={12}
        fontFamily="system-ui, sans-serif"
        fontWeight={isRoot ? 600 : 400}
      >
        {node.text.length > 20 ? node.text.substring(0, 17) + '...' : node.text}
      </text>
    </g>
  )
}

// Connection line component
function Connection({
  parent,
  child,
}: {
  parent: NodePosition
  child: NodePosition
}) {
  const startX = parent.x + parent.width
  const startY = parent.y + parent.height / 2
  const endX = child.x
  const endY = child.y + child.height / 2

  // Bezier curve control points
  const midX = (startX + endX) / 2
  const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`

  return (
    <path
      d={path}
      fill="none"
      stroke="#9ca3af"
      strokeWidth={2}
      className="transition-colors"
    />
  )
}
