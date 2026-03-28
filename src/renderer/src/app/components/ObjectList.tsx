import { ArrowRight } from 'lucide-react'
import type { JSX } from 'react'
import type { GitObject } from './ObjectTypes'

interface ObjectListProps {
  objects: GitObject[]
  selectedHash?: string
  onSelectObject: (obj: GitObject) => void
  getTypeColor: (type: string) => string
  getTypeIcon: (type: string) => JSX.Element
}

export function ObjectList({ objects, selectedHash, onSelectObject, getTypeColor, getTypeIcon }: ObjectListProps): JSX.Element {
  if (objects.length === 0) {
    return (
      <div className="text-center text-gray-500 text-sm mt-10">
        No objects match the selected filters.
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {objects.map((obj) => (
        <div
          key={obj.hash}
          onClick={() => onSelectObject(obj)}
          className={`flex items-center gap-2 p-2 rounded transition-colors cursor-pointer ${
            selectedHash === obj.hash
              ? 'bg-blue-500/20 border border-blue-500/30'
              : 'hover:bg-white/5'
          }`}
        >
          {getTypeIcon(obj.type)}
          <code className="text-xs text-gray-400 font-mono flex-1 truncate">{obj.hash}</code>
          <span className={`text-xs px-2 py-0.5 rounded border ${getTypeColor(obj.type)}`}>
            {obj.type}
          </span>
          {selectedHash === obj.hash && <ArrowRight className="w-3 h-3 text-blue-400" />}
        </div>
      ))}
    </div>
  )
}