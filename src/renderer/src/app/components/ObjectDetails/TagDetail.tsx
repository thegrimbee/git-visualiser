import type { JSX } from 'react'
import { Hash, Link, ArrowRight } from 'lucide-react'
import type { TagObject } from '../ObjectDatabase'

interface TagDetailProps {
  tag: TagObject
  onSelectObject: (hash: string) => void
}

export function TagDetail({ tag, onSelectObject }: TagDetailProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="bg-purple-500/5 border border-purple-500/20 rounded p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-200">Tag Object</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          A tag is a reference to a specific commit, often used to mark release points (e.g.,
          v1.0, v2.0).
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Tag Name</span>
          <code className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded font-mono">
            {tag.hash}
          </code>
        </div>

      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Points To</span>
        </div>
        <button
          onClick={() => onSelectObject(tag.objectHash)}
          className="flex items-center gap-2 p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded transition-colors w-full"
        >
          <Link className="w-3 h-3 text-purple-400" />
          <code className="text-xs text-purple-400 font-mono flex-1 text-left">
            {tag.objectHash}
          </code>
          <ArrowRight className="w-3 h-3 text-purple-400" />
        </button>
      </div>
    </div>
  )
}