import { useEffect, useRef, useState, useMemo} from 'react'
import type { JSX } from 'react'
import type { GitObject, CommitObject, BlobObject, TreeObject, TagObject } from './ObjectDatabase'

interface ObjectGraphProps {
  objects: Array<GitObject | CommitObject | BlobObject | TreeObject | TagObject>
  selectedHash?: string
  onSelectObject: (hash: string) => void
}

interface NodePosition {
  x: number
  y: number
  hash: string
  label: string
  type: 'commit' | 'tree' | 'blob' | 'tag'
  depth: number
}

export function ObjectGraph({
  objects,
  selectedHash,
  onSelectObject
}: ObjectGraphProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [panOffset, setPanOffset] = useState({ x: 50, y: 50 }) // Start with some padding
  const [isPanning, setIsPanning] = useState(false)
  const [draggedNodeHash, setDraggedNodeHash] = useState<string | null>(null)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [dragOverrides, setDragOverrides] = useState<Map<string, NodePosition>>(new Map())
  // Track if we actually moved the mouse during a click (to prevent selecting when finishing a drag)
  const hasMovedRef = useRef(false)

  // Constants for layout
  const NODE_RADIUS = 20
  const ROW_HEIGHT = 70 // Fixed height per node -> ensures spacing
  const COL_WIDTH_TAG = 50 // New column for tags
  const COL_WIDTH_COMMIT = 150 // Shifted right to make room for tags
  const COL_START_OBJECTS = 300 // Shifted right
  const DEPTH_INDENT = 120 // How far right each subfolder moves
  const NODE_TO_LABELS_GAP = 30 // Vertical gap between node and its label
  const COL_LABEL_SCALE = 0.7 // Scale for column header font size relative to node radius
  const LINE_WIDTH = 1.5 // Base line width for connections
  const ICON_SCALE = 0.7 // Scale for Lucide icons (1 = 24px, adjust if you want smaller/larger icons)
  const NODE_LABEL_SCALE = 0.6 // Scale for node labels relative to node radius
  const MAX_LABEL_LENGTH = 20 // Max characters for node labels before truncation

  // Icon Paths (SVG Data from Lucide)
  const ICON_PATHS = useMemo(() => ({
    commit: new Path2D("M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M12 3v6 M12 15v6"),
    tree: new Path2D("M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z"),
    blob: new Path2D("M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"),
    tag: new Path2D("M12 2l8 8-8 8-8-8 8-8z") // Simple diamond/tag shape placeholder if needed, or rely on color
  }), [])

  // 1. Calculate Initial Layout
  const defaultPositions = useMemo(() => {
    const positionMap = new Map<string, NodePosition>()
    const objectMap = new Map(objects.map((o) => [o.hash, o]))

    // --- Step A: Determine Depth of Trees/Blobs ---
    const depthMap = new Map<string, number>()

    // Initialize traversal from Commits -> Root Trees
    const queue: { hash: string; depth: number }[] = []
    const visited = new Set<string>()

    const commits = objects.filter((o) => o.type === 'commit') as CommitObject[]

    commits.forEach((c) => {
      // Commits don't have "depth" in this context, but their root tree is depth 0
      if (c.tree) queue.push({ hash: c.tree, depth: 0 })
    })

    // BFS to assign depth
    while (queue.length > 0) {
      const { hash, depth } = queue.shift()!
      if (visited.has(hash)) continue
      visited.add(hash)

      // Keep the smallest depth found (shortest path from root) -> actually for visual "directory structure",
      // we usually just want the first valid path found.
      if (!depthMap.has(hash)) {
        depthMap.set(hash, depth)
      }
      
      const obj = objectMap.get(hash)
      if (obj && obj.type === 'tree') {
        ;(obj as TreeObject).entries.forEach((entry) => {
          queue.push({ hash: entry.hash, depth: depth + 1 })
        })
      }
    }

    // --- Step B: Assign Coordinates ---

    // 1. Commits (Left Column)
    commits.forEach((commit, index) => {
      positionMap.set(commit.hash, {
        x: COL_WIDTH_COMMIT,
        y: index * ROW_HEIGHT + NODE_TO_LABELS_GAP,
        hash: commit.hash,
        label: commit.message,
        type: 'commit',
        depth: -1
      })
    })

    // 2. Trees (Variable Indentation)
    const trees = objects.filter((o) => o.type === 'tree')
    trees.forEach((tree, index) => {
      const treeObj = tree as TreeObject
      const depth = depthMap.get(treeObj.hash) ?? 0 // Default to 0 if orphan
      positionMap.set(treeObj.hash, {
        x: COL_START_OBJECTS + depth * DEPTH_INDENT,
        y: index * ROW_HEIGHT + NODE_TO_LABELS_GAP,
        hash: treeObj.hash,
        label: treeObj.names.length > 0 ? treeObj.names[0] : treeObj.hash.substring(0, 6),
        type: 'tree',
        depth
      })
    })

    // 3. Blobs (Variable Indentation)
    const blobs = objects.filter((o) => o.type === 'blob')
    blobs.forEach((blob, index) => {
      const blobObj = blob as BlobObject
      // Offset blobs vertically to start after trees, or interleave?
      // Listing them after trees for now to prevent overlap
      const startY = trees.length * ROW_HEIGHT
      const depth = depthMap.get(blobObj.hash) ?? 1

      positionMap.set(blobObj.hash, {
        x: COL_START_OBJECTS + depth * DEPTH_INDENT,
        y: startY + index * ROW_HEIGHT + NODE_TO_LABELS_GAP,
        hash: blobObj.hash,
        label: blobObj.names.length > 0 ? blobObj.names[0] : blobObj.hash.substring(0, 6),
        type: 'blob',
        depth
      })
    })

    // 4. Tags (Place near their referenced object)
    const tags = objects.filter((o) => o.type === 'tag') as TagObject[]
    tags.forEach((tag, index) => {
      const targetObj = objectMap.get(tag.objectHash)
      let baseX = COL_START_OBJECTS
      let baseY = index * ROW_HEIGHT + NODE_TO_LABELS_GAP

      // If pointing to a commit, place to the left of it
      if (targetObj) {
        const targetPos = positionMap.get(targetObj.hash)
        if (targetPos) {
          // Align Y with target, place X to the left
          baseY = targetPos.y
          // If multiple tags point to same object, we might overlap. 
          // For simplicity, let's just place it at fixed offset left.
          baseX = targetPos.x - 80 
        }
      }
      
      positionMap.set(tag.hash, {
        x: baseX,
        y: baseY,
        hash: tag.hash,
        label: tag.hash.substring(0, 6),
        type: 'tag',
        depth: 0
      })
    })

    return positionMap
  }, [objects])
  const nodePositions = useMemo(() => {
    const merged = new Map(defaultPositions)
    
    // Create a set of valid hashes for quick lookup
    const validHashes = new Set(defaultPositions.keys())

    dragOverrides.forEach((pos, hash) => {
        // Only apply override if the object exists in the current dataset
        if (validHashes.has(hash)) {
            merged.set(hash, pos)
        }
    })
    return merged
  }, [defaultPositions, dragOverrides])

  const relatedHashes = useMemo(() => {
    const set = new Set<string>()
    if (!selectedHash) return set

    // Simple BFS/DFS to find all descendants
    // We treat Git objects as directed: Tag -> Commit -> Tree -> [Tree | Blob]
    const objectMap = new Map(objects.map((o) => [o.hash, o]))
    const queue = [selectedHash]
    set.add(selectedHash)

    let index = 0
    while (index < queue.length) {
      const currentHash = queue[index++]
      const obj = objectMap.get(currentHash)

      if (!obj) continue

      let children: string[] = []

      if (obj.type === 'tag') {
        const tag = obj as TagObject
        children.push(tag.objectHash)
      } else if (obj.type === 'commit') {
        const commit = obj as CommitObject
        children.push(commit.tree)
        // Optionally include parents if we want "history" highlighting? 
        // User asked for "connected nodes" usually implying the content snapshot. 
        // Let's stick to the content tree for now.
      } else if (obj.type === 'tree') {
        const tree = obj as TreeObject
        children = tree.entries.map((e) => e.hash)
      }

      for (const child of children) {
        if (!set.has(child)) {
          set.add(child)
          queue.push(child)
        }
      }
    }
    return set
  }, [selectedHash, objects])

  // Handle Resize
  useEffect(() => {
    if (!canvasRef.current?.parentElement) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        })
      }
    })

    observer.observe(canvasRef.current.parentElement)
    return () => observer.disconnect()
  }, [])

  // 2. Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Use containerSize if available, fallback to rect
    // This dependency ensures we re-render when the div resizes
    const displayWidth = containerSize.width || canvas.clientWidth
    const displayHeight = containerSize.height || canvas.clientHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Handle High DPI
    const dpr = window.devicePixelRatio || 1

    // Explicitly set dimensions based on container to avoid "out of bounds" or stretching
    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr

    // CSS style needs to match purely for consistency, though class 'w-full h-full' usually handles it
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`

    ctx.scale(dpr, dpr)

    // Background
    ctx.fillStyle = '#1e1e1e'
    ctx.fillRect(0, 0, displayWidth, displayHeight)

    ctx.save()
    ctx.translate(panOffset.x, panOffset.y)

    // --- Draw Connections First (so they are behind nodes) ---
    ctx.lineWidth = LINE_WIDTH

    // Helper to draw bezier curve
    const drawConnection = (
      from: { x: number; y: number },
      to: { x: number; y: number },
      color: string,
      isHighlighted: boolean
    ): void => {
      ctx.strokeStyle = isHighlighted ? '#ffffff' : color
      ctx.lineWidth = isHighlighted ? 3 : 1.5

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)

      // Bezier curve for smoother connections
      const cp1x = from.x + (to.x - from.x) / 2
      const cp2x = from.x + (to.x - from.x) / 2
      ctx.bezierCurveTo(cp1x, from.y, cp2x, to.y, to.x, to.y)

      ctx.stroke()
    }

    // Commit -> Tree
    objects
      .filter((o) => o.type === 'commit')
      .forEach((commitObj) => {
        const commit = commitObj as CommitObject
        const fromPos = nodePositions.get(commit.hash)
        const toPos = nodePositions.get(commit.tree)

        if (fromPos && toPos) {
          const isHighlighted = (relatedHashes.has(fromPos.hash) && relatedHashes.has(toPos.hash))
          drawConnection(
            { x: fromPos.x, y: fromPos.y },
            { x: toPos.x, y: toPos.y },
            'rgba(100, 100, 100, 0.4)',
            isHighlighted
          )
        }

        // Commit -> Parent Commit
        commit.parent?.forEach((pHash) => {
          const parentPos = nodePositions.get(pHash)
          if (fromPos && parentPos) {
            const isHighlighted = fromPos.hash === selectedHash || parentPos.hash === selectedHash

            // Draw vertical-ish arc for commit parent
            ctx.strokeStyle = isHighlighted ? '#ffffff' : 'rgba(59, 130, 246, 0.3)'
            ctx.lineWidth = isHighlighted ? 3 : 1.5

            ctx.beginPath()
            ctx.moveTo(fromPos.x, fromPos.y)
            ctx.lineTo(parentPos.x, parentPos.y)
            ctx.stroke()
          }
        })
      })
    
    // Tag -> Target Object
    objects
      .filter((o) => o.type === 'tag')
      .forEach((tagObj) => {
        const tag = tagObj as TagObject
        const fromPos = nodePositions.get(tag.hash)
        const toPos = nodePositions.get(tag.objectHash)

        if (fromPos && toPos) {
          const isHighlighted = (relatedHashes.has(fromPos.hash) && relatedHashes.has(toPos.hash))
          // Draw connection from Tag to Commit/Object
          drawConnection(
            { x: fromPos.x, y: fromPos.y },
            { x: toPos.x, y: toPos.y },
            'rgba(167, 139, 250, 0.5)', // purple tint
            isHighlighted
          )
        }
      })

    // Tree -> Entry (Tree or Blob)
    objects
      .filter((o) => o.type === 'tree')
      .forEach((treeObj) => {
        const tree = treeObj as TreeObject
        const fromPos = nodePositions.get(tree.hash)

        if (fromPos && tree.entries) {
          tree.entries.forEach((entry) => {
            const toPos = nodePositions.get(entry.hash)
            if (toPos) {
              const isHighlighted = (relatedHashes.has(fromPos.hash) && relatedHashes.has(toPos.hash))
              drawConnection(
                { x: fromPos.x, y: fromPos.y },
                { x: toPos.x, y: toPos.y },
                'rgba(100, 100, 100, 0.25)',
                isHighlighted
              )
            }
          })
        }
      })

    // --- Draw Nodes ---

    // --- Draw Nodes ---
    nodePositions.forEach((pos) => {
      // Find the specific color for this node type
      let typeColor = '#a16207' // default yellow
      
      if (pos.type === 'commit') {
        typeColor = '#60a5fa' // blue-400
      } else if (pos.type === 'tree') {
        typeColor = '#4ade80' // green-400
      } else if (pos.type === 'tag') {
        typeColor = '#a78bfa' // purple-400
      } else {
        typeColor = '#facc15' // yellow-400
      }

      const isSelected = pos.hash === selectedHash

      ctx.beginPath()
      ctx.arc(pos.x, pos.y, NODE_RADIUS, 0, Math.PI * 2)

      // Make background transparent (or very dark gray for hit area visibility)
      ctx.fillStyle = isSelected ? 'rgb(50, 50, 50)' : 'rgb(30, 30, 30)' 
      // Use the type color for the ring if selected, otherwise a subtle grey
      ctx.strokeStyle = isSelected ? '#ffffff' : '#4b5563' 
      
      ctx.fill()

      if (isSelected) {
        ctx.strokeStyle = '#fff' // Highlight ring
        ctx.lineWidth = 2
        ctx.stroke()
      }
      // Node Label (Short Hash)
      ctx.fillStyle = '#9ca3af'
      ctx.font = `${NODE_RADIUS * NODE_LABEL_SCALE}px monospace`
      ctx.textAlign = 'center'
      ctx.fillText(
        pos.label.length > MAX_LABEL_LENGTH
          ? pos.label.substring(0, MAX_LABEL_LENGTH) + '...'
          : pos.label,
        pos.x,
        pos.y + NODE_RADIUS + 14
      )
      // --- Draw Icon ---
      ctx.save()
      // Move to center of node
      ctx.translate(pos.x, pos.y)
      // Reference size for Lucide icons is 24x24.
      // We want to center it, so we shift back by 12.
      // We can also scale it down slightly if needed (e.g. 0.8x for 19px icon)
      const scale = ICON_SCALE * (NODE_RADIUS * 2) / 24 // Scale to fit node size
      ctx.scale(scale, scale)
      ctx.translate(-12, -12) 

      ctx.lineWidth = 2
      // Icon color (light/white for contrast)
      ctx.strokeStyle = typeColor
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      if (pos.type === 'commit') {
        ctx.stroke(ICON_PATHS.commit)
      } else if (pos.type === 'tree') {
        ctx.stroke(ICON_PATHS.tree)
      } else if (pos.type === 'tag') {
        ctx.stroke(ICON_PATHS.blob)
      } else {
        ctx.stroke(ICON_PATHS.blob)
      }
      ctx.restore()
    })

    // Draw Column Headers (Fixed relative to pan x, but moves with pan y? Or fully fixed?)
    // Let's make them move with the graph so they identify the columns
    ctx.fillStyle = '#9ca3af'
    ctx.font = `${NODE_RADIUS * COL_LABEL_SCALE}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText('TAGS', COL_WIDTH_TAG, -20)
    ctx.fillText('COMMITS', COL_WIDTH_COMMIT, -20)
    ctx.fillText('ROOT TREES', COL_START_OBJECTS, -20)
    ctx.fillText('SUB TREES / FILES', COL_START_OBJECTS + DEPTH_INDENT * 1.5, -20)

    ctx.restore()
  }, [objects, selectedHash, panOffset, nodePositions, containerSize, relatedHashes, ICON_PATHS])

  // 3. Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    // Calculate mouse pos in World Space
    const mouseX = e.clientX - rect.left - panOffset.x
    const mouseY = e.clientY - rect.top - panOffset.y

    setLastMousePos({ x: e.clientX, y: e.clientY })
    hasMovedRef.current = false

    // Check collision with any node
    let clickedNodeHash: string | null = null
    for (const [hash, pos] of nodePositions.entries()) {
      const dist = Math.sqrt(Math.pow(mouseX - pos.x, 2) + Math.pow(mouseY - pos.y, 2))
      if (dist <= NODE_RADIUS) {
        clickedNodeHash = hash
        break
      }
    }

    if (clickedNodeHash) {
      setDraggedNodeHash(clickedNodeHash)
    } else {
      setIsPanning(true)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    const dx = e.clientX - lastMousePos.x
    const dy = e.clientY - lastMousePos.y
    
    // Track if strict click or drag occurred
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      hasMovedRef.current = true
    }

    if (draggedNodeHash) {
      // Update the Drag Overrides state
      // We take the CURRENT position (which might be default or already dragged) and add delta
      setDragOverrides((prev) => {
        const next = new Map(prev)
        const currentPos = nodePositions.get(draggedNodeHash)
        
        if (currentPos) {
          next.set(draggedNodeHash, {
            ...currentPos,
            x: currentPos.x + dx,
            y: currentPos.y + dy
          })
        }
        return next
      })
    } else if (isPanning) {
      // Pan canvas
      setPanOffset((prev) => ({
        x: prev.x + dx,
        y: prev.y + dy
      }))
    }

    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = (): void => {
    setIsPanning(false)
    setDraggedNodeHash(null)
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>): void => {
    // If we dragged (either panned widely or moved a node), don't trigger select
    if (hasMovedRef.current) return 
    
    // ...existing code for hit testing (finding foundHash)...
    // Copy the existing hit logic here
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const clickX = e.clientX - rect.left - panOffset.x
    const clickY = e.clientY - rect.top - panOffset.y

    let foundHash: string | undefined
    for (const [hash, pos] of nodePositions.entries()) {
        const dx = clickX - pos.x
        const dy = clickY - pos.y
        if (Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS) {
            foundHash = hash
            break
        }
    }

    if (foundHash) {
      onSelectObject(foundHash)
    }
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#1e1e1e]">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full block"
        style={{ cursor: draggedNodeHash ? 'grabbing' : isPanning ? 'move' : 'default' }}
      />

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 bg-[#252526] border border-gray-700 rounded p-3 text-xs text-gray-400 shadow-xl pointer-events-none opacity-80">
        <p className="mb-2 font-semibold">Git Objects:</p>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          <span>Commit</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-600"></div>
          <span>Tree (Folder)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
          <span>Blob (File)</span>
        </div>
        <div className="mt-2 text-[10px] text-gray-500">Drag to Pan • Click to Inspect</div>
      </div>
    </div>
  )
}
