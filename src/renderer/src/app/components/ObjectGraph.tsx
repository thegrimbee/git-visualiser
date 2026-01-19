import { useEffect, useRef } from 'react';
import type { GitObject, CommitObject, TreeObject } from './ObjectDatabase';

interface ObjectGraphProps {
  objects: Array<GitObject | CommitObject | TreeObject>;
  selectedHash?: string;
  onSelectObject: (hash: string) => void;
}

export function ObjectGraph({ objects, selectedHash, onSelectObject }: ObjectGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Create layout
    const commits = objects.filter(o => o.type === 'commit') as CommitObject[];
    const trees = objects.filter(o => o.type === 'tree');
    const blobs = objects.filter(o => o.type === 'blob');
    
    const nodeRadius = 20;
    const padding = 60;
    const columnWidth = rect.width / 4;
    
    // Position commits
    const commitPositions = new Map<string, { x: number; y: number }>();
    commits.forEach((commit, i) => {
      const y = padding + (i * (rect.height - 2 * padding) / Math.max(commits.length - 1, 1));
      commitPositions.set(commit.hash, { x: padding + columnWidth, y });
    });
    
    // Position trees
    const treePositions = new Map<string, { x: number; y: number }>();
    trees.forEach((tree, i) => {
      const y = padding + (i * (rect.height - 2 * padding) / Math.max(trees.length - 1, 1));
      treePositions.set(tree.hash, { x: padding + columnWidth * 2, y });
    });
    
    // Position blobs
    const blobPositions = new Map<string, { x: number; y: number }>();
    blobs.forEach((blob, i) => {
      const y = padding + (i * (rect.height - 2 * padding) / Math.max(blobs.length - 1, 1));
      blobPositions.set(blob.hash, { x: padding + columnWidth * 3, y });
    });
    
    // Draw connections
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.lineWidth = 1.5;
    
    // Commit to tree connections
    commits.forEach(commit => {
      const fromPos = commitPositions.get(commit.hash);
      const toPos = treePositions.get(commit.tree);
      if (fromPos && toPos) {
        ctx.beginPath();
        ctx.moveTo(fromPos.x + nodeRadius, fromPos.y);
        ctx.lineTo(toPos.x - nodeRadius, toPos.y);
        ctx.stroke();
      }
      
      // Parent connections
      commit.parent?.forEach(parentHash => {
        const parentPos = commitPositions.get(parentHash);
        if (fromPos && parentPos) {
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
          ctx.beginPath();
          ctx.moveTo(fromPos.x, fromPos.y - nodeRadius);
          ctx.lineTo(parentPos.x, parentPos.y + nodeRadius);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        }
      });
    });
    
    // Tree to blob/tree connections
    trees.forEach(tree => {
      const treeObj = tree as TreeObject;
      const fromPos = treePositions.get(tree.hash);
      if (fromPos && treeObj.entries) {
        treeObj.entries.forEach(entry => {
          const toPos = entry.type === 'blob' 
            ? blobPositions.get(entry.hash)
            : treePositions.get(entry.hash);
          if (toPos) {
            ctx.beginPath();
            ctx.moveTo(fromPos.x + nodeRadius, fromPos.y);
            ctx.lineTo(toPos.x - nodeRadius, toPos.y);
            ctx.stroke();
          }
        });
      }
    });
    
    // Draw nodes
    const drawNode = (hash: string, x: number, y: number, type: string, label: string) => {
      const isSelected = hash === selectedHash;
      
      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
      
      if (type === 'commit') {
        ctx.fillStyle = isSelected ? '#3b82f6' : '#2563eb';
      } else if (type === 'tree') {
        ctx.fillStyle = isSelected ? '#10b981' : '#059669';
      } else {
        ctx.fillStyle = isSelected ? '#f59e0b' : '#d97706';
      }
      ctx.fill();
      
      if (isSelected) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Label
      ctx.fillStyle = '#fff';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + nodeRadius + 15);
    };
    
    // Draw all nodes
    commitPositions.forEach((pos, hash) => {
      drawNode(hash, pos.x, pos.y, 'commit', hash.substring(0, 7));
    });
    
    treePositions.forEach((pos, hash) => {
      drawNode(hash, pos.x, pos.y, 'tree', hash.substring(0, 7));
    });
    
    blobPositions.forEach((pos, hash) => {
      drawNode(hash, pos.x, pos.y, 'blob', hash.substring(0, 7));
    });
    
    // Draw labels for columns
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COMMITS', padding + columnWidth, 20);
    ctx.fillText('TREES', padding + columnWidth * 2, 20);
    ctx.fillText('BLOBS', padding + columnWidth * 3, 20);
    
  }, [objects, selectedHash]);
  
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const nodeRadius = 20;
    const padding = 60;
    const columnWidth = rect.width / 4;
    
    const commits = objects.filter(o => o.type === 'commit') as CommitObject[];
    const trees = objects.filter(o => o.type === 'tree');
    const blobs = objects.filter(o => o.type === 'blob');
    
    // Check commits
    commits.forEach((commit, i) => {
      const nodeY = padding + (i * (rect.height - 2 * padding) / Math.max(commits.length - 1, 1));
      const nodeX = padding + columnWidth;
      const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
      if (distance <= nodeRadius) {
        onSelectObject(commit.hash);
      }
    });
    
    // Check trees
    trees.forEach((tree, i) => {
      const nodeY = padding + (i * (rect.height - 2 * padding) / Math.max(trees.length - 1, 1));
      const nodeX = padding + columnWidth * 2;
      const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
      if (distance <= nodeRadius) {
        onSelectObject(tree.hash);
      }
    });
    
    // Check blobs
    blobs.forEach((blob, i) => {
      const nodeY = padding + (i * (rect.height - 2 * padding) / Math.max(blobs.length - 1, 1));
      const nodeX = padding + columnWidth * 3;
      const distance = Math.sqrt((x - nodeX) ** 2 + (y - nodeY) ** 2);
      if (distance <= nodeRadius) {
        onSelectObject(blob.hash);
      }
    });
  };
  
  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        className="w-full h-full cursor-pointer"
        style={{ minHeight: '400px' }}
      />
      <div className="absolute bottom-4 left-4 bg-[#252526] border border-gray-700 rounded p-3 text-xs text-gray-400">
        <p className="mb-1">Object Relationships:</p>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-blue-600"></div>
          <span>Commit</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-green-600"></div>
          <span>Tree</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
          <span>Blob</span>
        </div>
      </div>
    </div>
  );
}
