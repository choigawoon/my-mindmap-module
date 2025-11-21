/**
 * Mindmap Text Parser
 *
 * Converts indentation-based text to tree structure.
 * Each indentation level (2 spaces) represents a child node.
 *
 * Example input:
 * ```
 * Root Node
 *   Child 1
 *     Grandchild 1
 *     Grandchild 2
 *   Child 2
 * ```
 */

import type { MindmapNode } from '@/schemas'

interface ParsedLine {
  text: string
  level: number
  lineNumber: number
}

/**
 * Parse indentation-based text into a tree structure
 */
export function parseTextToTree(text: string): MindmapNode {
  const lines = text.split('\n')
  const parsedLines: ParsedLine[] = []

  // Parse each line to get text and indentation level
  lines.forEach((line, index) => {
    // Skip empty lines
    if (line.trim() === '') return

    // Count leading spaces (2 spaces = 1 level)
    const match = line.match(/^(\s*)/)
    const spaces = match ? match[1].length : 0
    const level = Math.floor(spaces / 2)
    const text = line.trim()

    parsedLines.push({
      text,
      level,
      lineNumber: index + 1,
    })
  })

  if (parsedLines.length === 0) {
    return {
      id: generateId(),
      text: 'Empty Mindmap',
      children: [],
    }
  }

  // Build tree structure
  const root: MindmapNode = {
    id: generateId(),
    text: parsedLines[0].text,
    children: [],
  }

  const stack: { node: MindmapNode; level: number }[] = [
    { node: root, level: parsedLines[0].level },
  ]

  for (let i = 1; i < parsedLines.length; i++) {
    const { text, level } = parsedLines[i]

    const newNode: MindmapNode = {
      id: generateId(),
      text,
      children: [],
    }

    // Find parent node
    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop()
    }

    // Add as child to parent
    const parent = stack[stack.length - 1].node
    parent.children.push(newNode)

    // Add to stack for potential children
    stack.push({ node: newNode, level })
  }

  return root
}

/**
 * Convert tree structure back to indentation-based text
 */
export function treeToText(node: MindmapNode, level: number = 0): string {
  const indent = '  '.repeat(level)
  let result = `${indent}${node.text}`

  if (node.children.length > 0) {
    const childTexts = node.children.map((child) =>
      treeToText(child, level + 1)
    )
    result += '\n' + childTexts.join('\n')
  }

  return result
}

/**
 * Calculate node positions for rendering
 */
export interface NodePosition {
  node: MindmapNode
  x: number
  y: number
  width: number
  height: number
  children: NodePosition[]
}

const NODE_HEIGHT = 40
const NODE_PADDING = 20
const LEVEL_GAP = 150
const SIBLING_GAP = 20

export function calculateLayout(node: MindmapNode): NodePosition {
  return layoutNode(node, 0, 0)
}

function layoutNode(
  node: MindmapNode,
  x: number,
  startY: number
): NodePosition {
  const width = Math.max(100, node.text.length * 8 + NODE_PADDING * 2)
  const height = NODE_HEIGHT

  // Layout children first to calculate total height
  const childPositions: NodePosition[] = []
  let currentY = startY

  for (const child of node.children) {
    const childPos = layoutNode(child, x + LEVEL_GAP, currentY)
    childPositions.push(childPos)
    currentY = childPos.y + getSubtreeHeight(childPos) + SIBLING_GAP
  }

  // Calculate node Y position (center of children)
  let y = startY
  if (childPositions.length > 0) {
    const firstChildY = childPositions[0].y
    const lastChild = childPositions[childPositions.length - 1]
    const lastChildBottom = lastChild.y + getSubtreeHeight(lastChild)
    y = (firstChildY + lastChildBottom) / 2 - height / 2
  }

  return {
    node,
    x,
    y,
    width,
    height,
    children: childPositions,
  }
}

function getSubtreeHeight(pos: NodePosition): number {
  if (pos.children.length === 0) {
    return pos.height
  }

  const lastChild = pos.children[pos.children.length - 1]
  return lastChild.y + getSubtreeHeight(lastChild) - pos.y
}

/**
 * Get all node positions as flat array for rendering
 */
export function flattenPositions(root: NodePosition): NodePosition[] {
  const result: NodePosition[] = [root]

  for (const child of root.children) {
    result.push(...flattenPositions(child))
  }

  return result
}

/**
 * Calculate bounding box for the entire tree
 */
export function getBoundingBox(root: NodePosition): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
} {
  const positions = flattenPositions(root)

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const pos of positions) {
    minX = Math.min(minX, pos.x)
    minY = Math.min(minY, pos.y)
    maxX = Math.max(maxX, pos.x + pos.width)
    maxY = Math.max(maxY, pos.y + pos.height)
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  }
}

/**
 * Generate unique ID for nodes
 */
function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Count total nodes in tree
 */
export function countNodes(node: MindmapNode): number {
  let count = 1
  for (const child of node.children) {
    count += countNodes(child)
  }
  return count
}

/**
 * Get maximum depth of tree
 */
export function getMaxDepth(node: MindmapNode, currentDepth: number = 0): number {
  if (node.children.length === 0) {
    return currentDepth
  }

  let maxChildDepth = currentDepth
  for (const child of node.children) {
    maxChildDepth = Math.max(maxChildDepth, getMaxDepth(child, currentDepth + 1))
  }

  return maxChildDepth
}
