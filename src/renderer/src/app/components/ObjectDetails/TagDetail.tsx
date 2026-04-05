import type { JSX } from 'react'
import { Hash, Link, ArrowRight } from 'lucide-react'
import type { TagObject } from '../ObjectTypes'
import { AppButton } from '../ui/buttons'

interface TagDetailProps {
  tag: TagObject
  onSelectObject: (hash: string) => void
}

export function TagDetail({ tag, onSelectObject }: TagDetailProps): JSX.Element {
  const displayTagName = tag.tagName || tag.hash
  const isAnnotated = Boolean(
    tag.tagger || tag.message || tag.timestamp || tag.hash !== displayTagName
  )

  const formattedTimestamp =
    typeof tag.timestamp === 'number' && Number.isFinite(tag.timestamp)
      ? new Date(tag.timestamp).toLocaleString()
      : null

  return (
    <div className="space-y-4">
      <div className="bg-purple-500/5 border border-purple-500/20 rounded p-4">
        <div className="flex items-center gap-2 mb-3">
          <Link className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-200">
            {isAnnotated ? 'Annotated Tag' : 'Lightweight Tag'}
          </h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          {isAnnotated
            ? 'Annotated tags are full Git objects with metadata such as tagger, message, and timestamp.'
            : 'Lightweight tags are simple named references that point directly to another object.'}
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Hash className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Tag Name</span>
          <code className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded font-mono">
            {displayTagName}
          </code>
        </div>

        {isAnnotated && (
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Tag Object Hash</span>
            <code className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded font-mono break-all">
              {tag.hash}
            </code>
          </div>
        )}

        {tag.objectType && (
          <div className="text-xs text-gray-400">
            Target Type: <span className="text-gray-200">{tag.objectType}</span>
          </div>
        )}

        {tag.tagger && (
          <div className="text-xs text-gray-400">
            Tagger: <span className="text-gray-200">{tag.tagger}</span>
          </div>
        )}

        {formattedTimestamp && (
          <div className="text-xs text-gray-400">
            Tagged At: <span className="text-gray-200">{formattedTimestamp}</span>
          </div>
        )}

        {tag.message && (
          <div className="text-xs text-gray-400">
            Message:
            <div className="mt-1 p-2 rounded bg-[#252526] border border-gray-700 text-gray-200 whitespace-pre-wrap break-words">
              {tag.message}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Link className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Points To</span>
        </div>
        <AppButton
          onClick={() => onSelectObject(tag.objectHash)}
          className="flex items-center gap-2 p-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded transition-colors w-full"
        >
          <Link className="w-3 h-3 text-purple-400" />
          <code className="text-xs text-purple-400 font-mono flex-1 text-left break-all">
            {tag.objectHash}
          </code>
          <ArrowRight className="w-3 h-3 text-purple-400" />
        </AppButton>
      </div>
    </div>
  )
}