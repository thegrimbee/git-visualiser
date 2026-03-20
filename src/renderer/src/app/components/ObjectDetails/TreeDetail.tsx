import type { JSX } from "react"
import { FileText, Hash, Link, FolderTree, ArrowRight, GitCommit } from "lucide-react"
import type { GitObject, BlobObject, TreeObject, CommitObject, TagObject } from "../ObjectDatabase"

interface TreeDetailProps {
  tree: TreeObject
  onSelectObject: (hash: string) => void
  getObjectByHash: (hash: string) => GitObject | CommitObject | TreeObject | BlobObject | TagObject | undefined
}

export function TreeDetail({
  tree,
  onSelectObject,
  getObjectByHash,
}: TreeDetailProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="bg-green-500/5 border border-green-500/20 rounded p-4">
        <div className="flex items-center gap-2 mb-3">
          <FolderTree className="w-5 h-5 text-green-400" />
          <h3 className="text-sm font-semibold text-gray-200">Tree Object</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          A tree represents a directory. It contains pointers to blobs (files) and other trees
          (subdirectories), along with their names and permissions.
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <Hash className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Object Hash</span>
          <code className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded font-mono">
            {tree.hash}
          </code>
        </div>

      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <FolderTree className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Folder Name{tree.names.length > 1 ? `s (${tree.names.length})` : ''}</span>
          <span className="text-xs text-gray-200 font-medium">
            {tree.names.length > 0 ? tree.names.slice(0, 5).join(', ') : <span className="text-gray-500 italic">No name associated</span>}
          </span>
        </div>

      </div>

      <div>
        <div className="flex items-center gap-2 mb-2">
          <FolderTree className="w-4 h-4 text-gray-400" />
          <span className="text-xs text-gray-400">Tree Entries ({tree.entries.length})</span>
        </div>
        <div className="bg-[#252526] rounded p-3 space-y-2">
          {tree.entries.map((entry) => {
            const entryObj = getObjectByHash(entry.hash)
            return (
              <button
                key={`${entry.mode}-${entry.name}-${entry.hash}`}
                onClick={() => onSelectObject(entry.hash)}
                className={`flex items-center gap-2 p-2 rounded transition-colors w-full ${entry.type === 'blob'
                    ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30'
                    : 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30'
                  }`}
              >
                {entry.type === 'blob' ? (
                  <FileText className="w-3 h-3 text-yellow-400" />
                ) : (
                  <FolderTree className="w-3 h-3 text-green-400" />
                )}
                <div className="flex-1 text-left">
                  <p
                    className={`text-sm font-mono ${entry.type === 'blob' ? 'text-yellow-300' : 'text-green-300'
                      }`}
                  >
                    {entry.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-xs text-gray-500">{entry.mode}</code>
                    <code className="text-xs text-gray-500">
                      {entry.hash.substring(0, 12)}...
                    </code>
                    {entryObj && (
                      <span className="text-xs text-gray-500">{entryObj.size} bytes</span>
                    )}
                  </div>
                </div>
                <ArrowRight
                  className={`w-3 h-3 ${entry.type === 'blob' ? 'text-yellow-400' : 'text-green-400'
                    }`}
                />
              </button>
            )
          })}
        </div>
      </div>

      {tree.referencedBy && tree.referencedBy.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">
              Referenced By ({tree.referencedBy.length})
            </span>
          </div>
          <div className="bg-[#252526] rounded p-3">
            <p className="text-xs text-gray-400 mb-2">This tree is used by:</p>
            <div className="space-y-1">
              {tree.referencedBy.map((hash) => {
                const refObj = getObjectByHash(hash)
                if (!refObj) return null
                return (
                  <button
                    key={hash}
                    onClick={() => onSelectObject(hash)}
                    className={`flex items-center gap-2 p-2 rounded transition-colors w-full text-left ${refObj.type === 'commit'
                        ? 'bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30'
                        : 'bg-green-500/10 hover:bg-green-500/20 border border-green-500/30'
                      }`}
                  >
                    {refObj.type === 'commit' ? (
                      <GitCommit className="w-3 h-3 text-blue-400" />
                    ) : (
                      <FolderTree className="w-3 h-3 text-green-400" />
                    )}
                    <code
                      className={`text-xs font-mono flex-1 ${refObj.type === 'commit' ? 'text-blue-400' : 'text-green-400'
                        }`}
                    >
                      {hash}
                    </code>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${refObj.type === 'commit' ? 'text-blue-400' : 'text-green-400'
                        }`}
                    >
                      {refObj.type}
                    </span>
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