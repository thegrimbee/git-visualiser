import type { JSX } from "react"
import { FileText, Hash, Link, FolderTree, ArrowRight } from "lucide-react"
import type { GitObject, BlobObject, TreeObject, CommitObject, TagObject } from "../ObjectDatabase"

interface BlobDetailProps {
  blob: BlobObject
  onSelectObject: (hash: string) => void
  getObjectByHash: (hash: string) => GitObject | CommitObject | TreeObject | BlobObject | TagObject | undefined
}

export function BlobDetail({
  blob,
  onSelectObject,
  getObjectByHash,
}: BlobDetailProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="bg-yellow-500/5 border border-yellow-500/20 rounded p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-semibold text-gray-200">Blob Object</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          A blob stores the contents of a file. Git compresses and stores each version of each
          file as a separate blob. Multiple files with identical content share the same blob.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Object Hash</span>
          <code className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded font-mono">
            {blob.hash}
          </code>
        </div>

      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">File Name{blob.names.length > 1 ? `s (${blob.names.length})` : ''}:</span>
          <span className="text-xs text-gray-200 font-medium">
            {blob.names.length > 0 ? blob.names.slice(0, 5).join(', ') : <span className="text-gray-500 italic">No name associated</span>}
          </span>
        </div>

      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Size:</span>
          <span className="text-xs text-gray-300">{blob.size} bytes</span>
        </div>

      </div>

      {blob.content && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">File Content</span>
          </div>
          <div className="bg-[#1e1e1e] rounded border border-gray-700">
            <div className="bg-[#252526] px-3 py-2 border-b border-gray-700 flex items-center justify-between">
              <span className="text-xs text-gray-500">{blob.size} bytes</span>
            </div>
            <pre className="p-3 text-xs overflow-auto max-h-96">
              <code className="text-gray-300 font-mono leading-relaxed">{blob.content}</code>
            </pre>
          </div>
        </div>
      )}

      {blob.referencedBy && blob.referencedBy.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">
              Referenced By ({blob.referencedBy.length})
            </span>
          </div>
          <div className="bg-[#252526] rounded p-3">
            <p className="text-xs text-gray-400 mb-2">This blob is referenced by these trees:</p>
            <div className="space-y-1">
              {blob.referencedBy.map((hash) => {
                const refObj = getObjectByHash(hash)
                if (!refObj || refObj.type !== "tree") return null
                const entry = (refObj as TreeObject).entries?.find((e) => e.hash === blob.hash)
                return (
                  <button
                    key={hash}
                    onClick={() => onSelectObject(hash)}
                    className="flex items-center gap-2 p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded transition-colors w-full text-left"
                  >
                    <FolderTree className="w-3 h-3 text-green-400" />
                    <div className="flex-1">
                      <code className="text-xs font-mono text-green-400 block">{hash}</code>
                      {entry && <span className="text-xs text-gray-500">as {entry.name}</span>}
                    </div>
                    <ArrowRight className="w-3 h-3 text-green-400" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}