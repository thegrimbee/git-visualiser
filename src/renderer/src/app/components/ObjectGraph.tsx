import { useEffect, useRef, useState, useMemo } from 'react'
import type { JSX } from 'react'
import type { GitObject, CommitObject, BlobObject, TreeObject, TagObject } from './ObjectTypes'
import { Legend } from './GraphComponents/Legend'

interface ObjectGraphProps {
  objects: Array<GitObject | CommitObject | BlobObject | TreeObject | TagObject>
  selectedHash?: string | null
  onSelectObject: (hash: string) => void
  visibilityMap: Map<string, boolean>
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
  onSelectObject,
  visibilityMap
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
  const COL_WIDTH_COMMIT = 170 // Shifted right to make room for tags
  const COL_START_OBJECTS = 300 // Shifted right
  const DEPTH_INDENT = 140 // How far right each subfolder moves
  const NODE_TO_LABELS_GAP = 30 // Vertical gap between node and its label
  const COL_LABEL_SCALE = 0.7 // Scale for column header font size relative to node radius
  const LINE_WIDTH = 1.5 // Base line width for connections
  const LUCIDE_ICON_SIZE = 24 // Base size for Lucide icons (they are designed for 24x24)
  const ICON_SCALE = 0.7 // Scale for Lucide icons (1 = 24px, adjust if you want smaller/larger icons)
  const NODE_LABEL_SCALE = 0.6 // Scale for node labels relative to node radius
  const NODE_LABEL_VERTICAL_GAP = 14 // Vertical gap between node and label for non-commit nodes
  const COMMIT_LABEL_LEFT_GAP = 12 // Horizontal gap between commit node and its label
  const MAX_LABEL_LENGTH = 20 // Max characters for node labels before truncation

  // Icon Paths (SVG Data from Lucide)
  const ICON_PATHS = useMemo(() => ({
    commit: new Path2D("M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0 M12 3v6 M12 15v6"),
    tree: new Path2D("M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z"),
    blob: new Path2D("M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8"),
    tag: new Path2D("M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.828 8.828a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828z M7.5 7.5h.01")
  }), [])

  // 1. Calculate Initial Layout
  const defaultPositions = useMemo(() => {
    const positionMap = new Map<string, NodePosition>()
    const objectMap = new Map(objects.map((o) => [o.hash, o]))
    const rowToY = (row: number): number => row * ROW_HEIGHT + NODE_TO_LABELS_GAP

    const commitNodes = objects
      .filter((o) => o.type === 'commit')
      .map((o) => o as CommitObject)

    const commitByHash = new Map(commitNodes.map((c) => [c.hash, c]))
    const childCount = new Map<string, number>(commitNodes.map((c) => [c.hash, 0]))
    for (const c of commitNodes) {
      for (const p of c.parent ?? []) {
        if (childCount.has(p)) {
          childCount.set(p, (childCount.get(p) ?? 0) + 1)
        }
      }
    }
    const compareCommits = (a: CommitObject, b: CommitObject): number => {
      const ta = Number(a.timestamp ?? 0)
      const tb = Number(b.timestamp ?? 0)
      if (ta !== tb) return tb - ta
      return a.hash.localeCompare(b.hash)
    }
    // technically no need to stable sort since current branch handling ensures the commit history is linear, but just be safe
    const enqueueSorted = (arr: CommitObject[], item: CommitObject): void => {
      let i = 0
      while (i < arr.length && compareCommits(arr[i], item) <= 0) i++
      arr.splice(i, 0, item)
    }
    const queue = commitNodes.filter((c) => (childCount.get(c.hash) ?? 0) === 0)
    const commits: CommitObject[] = []
    const seen = new Set<string>()
    let queueIndex = 0
    while (queueIndex < queue.length) {
      const current = queue[queueIndex++]!
      if (seen.has(current.hash)) continue
      seen.add(current.hash)
      commits.push(current)

      for (const p of current.parent ?? []) {
        if (!childCount.has(p)) continue
        const nextCount = (childCount.get(p) ?? 0) - 1
        childCount.set(p, nextCount)
        if (nextCount === 0) {
          const parentCommit = commitByHash.get(p)
          if (parentCommit) enqueueSorted(queue, parentCommit)
        }
      }
    }

    // fallback in case of disconnected/corrupt commit links
    const remaining = commitNodes.filter((c) => !seen.has(c.hash)).sort(compareCommits)
    for (const c of remaining) commits.push(c)

    const treeReachableCache = new Map<string, Set<string>>()
    const getReachableFromTree = (rootTreeHash: string): Set<string> => {
      if (treeReachableCache.has(rootTreeHash)) {
        return treeReachableCache.get(rootTreeHash)!
      }

      const seen = new Set<string>()
      const queue: string[] = [rootTreeHash]
      let i = 0

      while (i < queue.length) {
        const current = queue[i++]
        if (!current || seen.has(current)) continue
        seen.add(current)

        const obj = objectMap.get(current)
        if (obj?.type === 'tree') {
          const tree = obj as TreeObject
          for (const entry of tree.entries) {
            const childHash = entry.hash
            const childObj = objectMap.get(childHash)
            if (childObj?.type === 'tree') {
              const childCached = treeReachableCache.get(childHash)
              if (childCached) {
                for (const h of childCached) {
                  if (!seen.has(h)) {
                    seen.add(h)
                  }
                }
                continue
              }
            }
            queue.push(childHash)
          }
        }
      }

      // Store the computed set in the cache
      treeReachableCache.set(rootTreeHash, seen)
      return seen
    }

    const reachableByCommit = new Map<string, Set<string>>()
    for (const c of commits) {
      reachableByCommit.set(c.hash, c.tree ? getReachableFromTree(c.tree) : new Set())
    }

    const ownerCommitByNode = new Map<string, string>()
    for (let i = commits.length - 1; i >= 0; i--) {
      const c = commits[i]
      const reachable = reachableByCommit.get(c.hash) ?? new Set<string>()
      for (const h of reachable) {
        if (!ownerCommitByNode.has(h)) ownerCommitByNode.set(h, c.hash)
      }
    }

    const getNodeLabel = (obj: GitObject | CommitObject | BlobObject | TreeObject | TagObject): string => {
      if (obj.type === 'tree') return (obj as TreeObject).names?.[0] ?? obj.hash.slice(0, 6)
      if (obj.type === 'blob') return (obj as BlobObject).names?.[0] ?? obj.hash.slice(0, 6)
      if (obj.type === 'commit') return (obj as CommitObject).message
      return obj.hash.slice(0, 6)
    }

    const getOwnedChildren = (treeHash: string, commitHash: string): string[] => {
      const obj = objectMap.get(treeHash)
      if (!obj || obj.type !== 'tree') return []
      const tree = obj as TreeObject
      return tree.entries
        .map((e) => e.hash)
        .filter((h) => ownerCommitByNode.get(h) === commitHash)
    }

    const nextByDepth = new Map<number, Map<number, number>>()

    const getDepthMap = (depth: number): Map<number, number> => {
      const m = nextByDepth.get(depth)
      if (m) return m
      const created = new Map<number, number>()
      nextByDepth.set(depth, created)
      return created
    }

    const findNextFree = (depth: number, row: number): number => {
      const m = getDepthMap(depth)
      const next = m.get(row)
      if (next === undefined) return row
      const root = findNextFree(depth, next)
      if (root !== next) m.set(row, root)
      return root
    }

    const occupyRow = (depth: number, row: number): void => {
      const m = getDepthMap(depth)
      m.set(row, findNextFree(depth, row + 1))
    }

    const findFreeRow = (depth: number, preferredRow: number): number => {
      return findNextFree(depth, preferredRow)
    }

    const placeOwnedNode = (
      hash: string,
      depth: number,
      preferredRow: number,
      commitHash: string
    ): number => {
      const obj = objectMap.get(hash)
      if (!obj || ownerCommitByNode.get(hash) !== commitHash) {
        return preferredRow
      }

      const row = findFreeRow(depth, preferredRow)
      occupyRow(depth, row)

      positionMap.set(hash, {
        x: COL_START_OBJECTS + depth * DEPTH_INDENT,
        y: rowToY(row),
        hash,
        label: getNodeLabel(obj),
        type: obj.type as 'blob' | 'tag' | 'tree' | 'commit',
        depth
      })

      if (obj.type !== 'tree') {
        return row
      }

      const children = getOwnedChildren(hash, commitHash)
      let lastRow = row

      for (const childHash of children) {
        // Each child prefers the parent's row (left predecessor). If occupied,
        // findFreeRow will move it downward.
        const childRow = placeOwnedNode(childHash, depth + 1, row, commitHash)
        lastRow = Math.max(lastRow, childRow)
      }

      return lastRow
    }

    const commitRows = new Map<string, number>()
    for (let i = 0; i < commits.length; i++) {
      commitRows.set(commits[i].hash, i)
    }

    // Process from bottom commit to top commit so lower commits reserve rows first.
    for (let i = commits.length - 1; i >= 0; i--) {
      const commit = commits[i]
      const commitRow = commitRows.get(commit.hash) ?? i

      positionMap.set(commit.hash, {
        x: COL_WIDTH_COMMIT,
        y: rowToY(commitRow),
        hash: commit.hash,
        label: commit.message,
        type: 'commit',
        depth: -1
      })

      const rootOwned =
        !!commit.tree && ownerCommitByNode.get(commit.tree) === commit.hash && objectMap.has(commit.tree)

      if (rootOwned && commit.tree) {
        placeOwnedNode(commit.tree, 0, commitRow, commit.hash)
      }
    }

    const tags = objects.filter((o) => o.type === 'tag') as TagObject[]
    const tagStack = new Map<string, number>()

    tags.forEach((tag, index) => {
      const targetPos = positionMap.get(tag.objectHash)
      const stackIndex = tagStack.get(tag.objectHash) ?? 0
      tagStack.set(tag.objectHash, stackIndex + 1)

      positionMap.set(tag.hash, {
        x: targetPos ? targetPos.x - 80 : COL_WIDTH_TAG,
        y: targetPos ? targetPos.y + stackIndex * 20 : rowToY(index),
        hash: tag.hash,
        label: tag.hash.substring(0, 6),
        type: 'tag',
        depth: 0
      })
    })

    return positionMap
  }, [objects])
  const nodePositions = useMemo(() => {
    const merged = new Map<string, NodePosition>()

    // Create a set of valid hashes for quick lookup
    const validHashes = new Set(defaultPositions.keys())

    // Filter default positions based on visibility
    defaultPositions.forEach((pos, hash) => {
      if (visibilityMap.get(hash)) {
        merged.set(hash, pos)
      }
    })

    dragOverrides.forEach((pos, hash) => {
      // Only apply override if the object exists in the current dataset and is visible
      if (validHashes.has(hash) && visibilityMap.get(hash)) {
        merged.set(hash, pos)
      }
    })
    return merged
  }, [defaultPositions, dragOverrides, visibilityMap])

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

        // Skip if either object is not visible
        if (fromPos && toPos && visibilityMap.get(commit.hash) && visibilityMap.get(commit.tree)) {
          const isHighlighted = relatedHashes.has(fromPos.hash) && relatedHashes.has(toPos.hash)
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
          if (
            fromPos &&
            parentPos &&
            visibilityMap.get(commit.hash) &&
            visibilityMap.get(pHash)
          ) {
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

    // Tree -> Entry (Tree or Blob)
    objects
      .filter((o) => o.type === 'tree')
      .forEach((treeObj) => {
        const tree = treeObj as TreeObject
        const fromPos = nodePositions.get(tree.hash)

        if (fromPos && tree.entries) {
          tree.entries.forEach((entry) => {
            const toPos = nodePositions.get(entry.hash)
            if (
              toPos &&
              visibilityMap.get(tree.hash) &&
              visibilityMap.get(entry.hash)
            ) {
              const isHighlighted = relatedHashes.has(fromPos.hash) && relatedHashes.has(toPos.hash)
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

    // Tag -> Target Object
    objects
      .filter((o) => o.type === 'tag')
      .forEach((tagObj) => {
        const tag = tagObj as TagObject
        const fromPos = nodePositions.get(tag.hash)
        const toPos = nodePositions.get(tag.objectHash)

        if (
          fromPos &&
          toPos &&
          visibilityMap.get(tag.hash) &&
          visibilityMap.get(tag.objectHash)
        ) {
          const isHighlighted = relatedHashes.has(fromPos.hash) && relatedHashes.has(toPos.hash)
          drawConnection(
            { x: fromPos.x, y: fromPos.y },
            { x: toPos.x, y: toPos.y },
            'rgba(167, 139, 250, 0.5)', // purple tint
            isHighlighted
          )
        }
      })


    // --- Draw Nodes ---
    nodePositions.forEach((pos) => {
      // Skip rendering if the node is not visible
      if (!visibilityMap.get(pos.hash)) return

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

      // Node Label (commit message or object name)
      const labelText =
        pos.label.length > MAX_LABEL_LENGTH
          ? pos.label.substring(0, MAX_LABEL_LENGTH) + '...'
          : pos.label

      const isCommitNode = pos.type === 'commit'

      ctx.fillStyle = '#9ca3af'
      ctx.font = `${NODE_RADIUS * NODE_LABEL_SCALE}px monospace`
      ctx.textAlign = isCommitNode ? 'right' : 'center'
      ctx.textBaseline = isCommitNode ? 'middle' : 'alphabetic'

      const labelX = isCommitNode
        ? pos.x - NODE_RADIUS - COMMIT_LABEL_LEFT_GAP
        : pos.x

      const labelY = isCommitNode
        ? pos.y
        : pos.y + NODE_RADIUS + NODE_LABEL_VERTICAL_GAP

      ctx.fillText(labelText, labelX, labelY)
      // --- Draw Icon ---
      ctx.save()
      // Move to center of node
      ctx.translate(pos.x, pos.y)
      const scale = ICON_SCALE * (NODE_RADIUS * 2) / LUCIDE_ICON_SIZE
      ctx.scale(scale, scale)
      ctx.translate(-LUCIDE_ICON_SIZE / 2, -LUCIDE_ICON_SIZE / 2) // Center the icon

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
        ctx.stroke(ICON_PATHS.tag)
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
  }, [objects, selectedHash, panOffset, nodePositions, containerSize, relatedHashes, ICON_PATHS, visibilityMap])

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
      <Legend />
    </div>
  )
}
