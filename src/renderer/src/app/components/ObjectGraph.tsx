import { useEffect, useRef, useState, useMemo } from 'react';
import type { GitObject, CommitObject, TreeObject } from './ObjectDatabase';

interface ObjectGraphProps {
  objects: Array<GitObject | CommitObject | TreeObject>;
  selectedHash?: string;
  onSelectObject: (hash: string) => void;
}

interface NodePosition {
  x: number;
  y: number;
  hash: string;
  type: 'commit' | 'tree' | 'blob';
  depth: number;
}

export function ObjectGraph({ objects, selectedHash, onSelectObject }: ObjectGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [panOffset, setPanOffset] = useState({ x: 50, y: 50 }); // Start with some padding
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Constants for layout
  const NODE_RADIUS = 18;
  const ROW_HEIGHT = 60; // Fixed height per node -> ensures spacing
  const COL_WIDTH_COMMIT = 100;
  const COL_START_OBJECTS = 250;
  const DEPTH_INDENT = 120; // How far right each subfolder moves

  // 1. Calculate Layout (Memoized to avoid recalc on every render/pan)
  const nodePositions = useMemo(() => {
    const positionMap = new Map<string, NodePosition>();
    const objectMap = new Map(objects.map(o => [o.hash, o]));

    // --- Step A: Determine Depth of Trees/Blobs ---
    const depthMap = new Map<string, number>();
    
    // Initialize traversal from Commits -> Root Trees
    const queue: { hash: string; depth: number }[] = [];
    const visited = new Set<string>();

    const commits = objects.filter(o => o.type === 'commit') as CommitObject[];
    
    commits.forEach(c => {
      // Commits don't have "depth" in this context, but their root tree is depth 0
      if (c.tree) queue.push({ hash: c.tree, depth: 0 });
    });

    // BFS to assign depth
    while (queue.length > 0) {
      const { hash, depth } = queue.shift()!;
      if (visited.has(hash)) continue;
      visited.add(hash);
      
      // Keep the smallest depth found (shortest path from root) -> actually for visual "directory structure", 
      // we usually just want the first valid path found.
      if (!depthMap.has(hash)) {
        depthMap.set(hash, depth);
      }

      const obj = objectMap.get(hash);
      if (obj && obj.type === 'tree') {
        (obj as TreeObject).entries.forEach(entry => {
          queue.push({ hash: entry.hash, depth: depth + 1 });
        });
      }
    }

    // --- Step B: Assign Coordinates ---
    
    // 1. Commits (Left Column)
    commits.forEach((commit, index) => {
      positionMap.set(commit.hash, {
        x: COL_WIDTH_COMMIT,
        y: index * ROW_HEIGHT,
        hash: commit.hash,
        type: 'commit',
        depth: -1
      });
    });

    // 2. Trees (Variable Indentation)
    const trees = objects.filter(o => o.type === 'tree');
    trees.forEach((tree, index) => {
      const depth = depthMap.get(tree.hash) ?? 0; // Default to 0 if orphan
      positionMap.set(tree.hash, {
        x: COL_START_OBJECTS + (depth * DEPTH_INDENT),
        y: index * ROW_HEIGHT,
        hash: tree.hash,
        type: 'tree',
        depth
      });
    });

    // 3. Blobs (Variable Indentation)
    const blobs = objects.filter(o => o.type === 'blob');
    blobs.forEach((blob, index) => {
      // Offset blobs vertically to start after trees, or interleave? 
      // Listing them after trees for now to prevent overlap
      const startY = trees.length * ROW_HEIGHT; 
      const depth = depthMap.get(blob.hash) ?? 1; 
      
      positionMap.set(blob.hash, {
        x: COL_START_OBJECTS + (depth * DEPTH_INDENT),
        y: startY + (index * ROW_HEIGHT),
        hash: blob.hash,
        type: 'blob',
        depth
      });
    });

    return positionMap;
  }, [objects]);
  // Handle Resize
  useEffect(() => {
    if (!canvasRef.current?.parentElement) return;
    
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    observer.observe(canvasRef.current.parentElement);
    return () => observer.disconnect();
  }, []);

  // 2. Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Use containerSize if available, fallback to rect
    // This dependency ensures we re-render when the div resizes
    const displayWidth = containerSize.width || canvas.clientWidth;
    const displayHeight = containerSize.height || canvas.clientHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Handle High DPI
    const dpr = window.devicePixelRatio || 1;
    
    // Explicitly set dimensions based on container to avoid "out of bounds" or stretching
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    
    // CSS style needs to match purely for consistency, though class 'w-full h-full' usually handles it
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    ctx.scale(dpr, dpr);
    
    // Background
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, displayWidth, displayHeight);
    
    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);


    // --- Draw Connections First (so they are behind nodes) ---
    ctx.lineWidth = 1.5;

    // Helper to draw bezier curve
    const drawConnection = (from: {x: number, y: number}, to: {x: number, y: number}, color: string, isHighlighted: boolean) => {
      ctx.strokeStyle = isHighlighted ? '#ffffff' : color;
      ctx.lineWidth = isHighlighted ? 3 : 1.5;
      
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      
      // Bezier curve for smoother connections
      const cp1x = from.x + (to.x - from.x) / 2;
      const cp2x = from.x + (to.x - from.x) / 2;
      ctx.bezierCurveTo(cp1x, from.y, cp2x, to.y, to.x, to.y);
      
      ctx.stroke();
    };

    // Commit -> Tree
    objects.filter(o => o.type === 'commit').forEach(commitObj => {
      const commit = commitObj as CommitObject;
      const fromPos = nodePositions.get(commit.hash);
      const toPos = nodePositions.get(commit.tree);
      
      if (fromPos && toPos) {
        const isHighlighted = fromPos.hash === selectedHash || toPos.hash === selectedHash;
        drawConnection(
           { x: fromPos.x + NODE_RADIUS, y: fromPos.y },
           { x: toPos.x - NODE_RADIUS, y: toPos.y },
           'rgba(100, 100, 100, 0.4)',
           isHighlighted
        );
      }

      // Commit -> Parent Commit
      commit.parent?.forEach(pHash => {
        const parentPos = nodePositions.get(pHash);
        if (fromPos && parentPos) {
          const isHighlighted = fromPos.hash === selectedHash || parentPos.hash === selectedHash;

          // Draw vertical-ish arc for commit parent
          ctx.strokeStyle = isHighlighted ? '#ffffff' : 'rgba(59, 130, 246, 0.3)';
          ctx.lineWidth = isHighlighted ? 3 : 1.5;
          
          ctx.beginPath();
          ctx.moveTo(fromPos.x, fromPos.y - NODE_RADIUS);
          ctx.lineTo(parentPos.x, parentPos.y + NODE_RADIUS);
          ctx.stroke();
        }
      });
    });

    // Tree -> Entry (Tree or Blob)
    objects.filter(o => o.type === 'tree').forEach(treeObj => {
      const tree = treeObj as TreeObject;
      const fromPos = nodePositions.get(tree.hash);
      
      if (fromPos && tree.entries) {
        tree.entries.forEach(entry => {
          const toPos = nodePositions.get(entry.hash);
          if (toPos) {
             const isHighlighted = fromPos.hash === selectedHash || toPos.hash === selectedHash;
             drawConnection(
                { x: fromPos.x + NODE_RADIUS, y: fromPos.y },
                { x: toPos.x - NODE_RADIUS, y: toPos.y },
                'rgba(100, 100, 100, 0.25)',
                isHighlighted
             );
          }
        });
      }
    });

    // --- Draw Nodes ---

    // --- Draw Nodes ---
    nodePositions.forEach((pos) => {
      const isSelected = pos.hash === selectedHash;
      
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, NODE_RADIUS, 0, Math.PI * 2);
      
      if (pos.type === 'commit') {
        ctx.fillStyle = isSelected ? '#3b82f6' : '#2563eb';
      } else if (pos.type === 'tree') {
        ctx.fillStyle = isSelected ? '#10b981' : '#059669';
      } else {
        ctx.fillStyle = isSelected ? '#f59e0b' : '#d97706';
      }
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#fff'; // Highlight ring
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Node Label (Short Hash)
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pos.hash.substring(0, 6), pos.x, pos.y + NODE_RADIUS + 14);

      // Optional: Show filename if available? 
      // (This requires passing filename data which isn't easy in this raw object view, so skipping for now)
    });
    
    // Draw Column Headers (Fixed relative to pan x, but moves with pan y? Or fully fixed?)
    // Let's make them move with the graph so they identify the columns
    ctx.fillStyle = '#9ca3af';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COMMITS', COL_WIDTH_COMMIT, -20);
    ctx.fillText('ROOT TREES', COL_START_OBJECTS, -20);
    ctx.fillText('SUB TREES / FILES', COL_START_OBJECTS + DEPTH_INDENT * 1.5, -20);

    ctx.restore();
    
  }, [objects, selectedHash, panOffset, nodePositions, containerSize]);
  
  // 3. Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;
    
    setPanOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return; // Prevent click after drag
    
    // Calculate click in "World Space"
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    const clickX = e.clientX - rect.left - panOffset.x;
    const clickY = e.clientY - rect.top - panOffset.y;
    
    // Find intersected text
    // Simple heuristic: distance < radius
    let foundHash: string | undefined;

    for (const [hash, pos] of nodePositions.entries()) {
        const dx = clickX - pos.x;
        const dy = clickY - pos.y;
        if (Math.sqrt(dx * dx + dy * dy) <= NODE_RADIUS) {
            foundHash = hash;
            break;
        }
    }

    if (foundHash) {
        onSelectObject(foundHash);
    }
  };
  
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
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
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
        <div className="mt-2 text-[10px] text-gray-500">
           Drag to Pan • Click to Inspect
        </div>
      </div>
    </div>
  );
}