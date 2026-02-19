import {
  FileText,
  GitCommit,
  FolderTree,
  ArrowRight,
  User,
  Calendar,
  Hash,
  Link
} from 'lucide-react'
import type { GitObject, CommitObject, TreeObject, BlobObject, TagObject } from './ObjectDatabase'
import type { JSX } from 'react'

interface ObjectDetailProps {
  object: GitObject | CommitObject | TreeObject | BlobObject | TagObject
  allObjects: Array<GitObject | CommitObject | TreeObject | BlobObject | TagObject>
  onSelectObject: (hash: string) => void
}

export function ObjectDetail({
  object,
  allObjects,
  onSelectObject
}: ObjectDetailProps): JSX.Element {
  const getObjectByHash = (
    hash: string
  ): GitObject | CommitObject | TreeObject | BlobObject | TagObject | undefined => {
    return allObjects.find((o) => o.hash === hash)
  }

  const renderCommitDetail = (commit: CommitObject): JSX.Element => {
    const parentObjs = commit.parent?.map((p) => getObjectByHash(p)).filter(Boolean) || []
    // TODO: Move each object type rendering to separate components for better organization
    return (
      <div className="space-y-4">
        <div className="bg-blue-500/5 border border-blue-500/20 rounded p-4">
          <div className="flex items-center gap-2 mb-3">
            <GitCommit className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-gray-200">Commit Object</h3>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            A commit is a snapshot of your project. It contains a pointer to a tree object (the file
            structure), parent commit(s), author info, and a message.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Object Hash</span>
            </div>
            <code className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded font-mono">
              {commit.hash}
            </code>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Author</span>
            </div>
            <p className="text-sm text-gray-300">{commit.author}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Timestamp</span>
            </div>
            <p className="text-sm text-gray-300">{commit.timestamp}</p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-400">Message</span>
            </div>
            <p className="text-sm text-gray-300 bg-white/5 p-2 rounded">{commit.message}</p>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <FolderTree className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Tree Reference</span>
          </div>
          <div className="bg-[#252526] rounded p-3">
            <p className="text-xs text-gray-400 mb-2">This commit points to a tree object:</p>
            <button
              onClick={() => onSelectObject(commit.tree)}
              className="flex items-center gap-2 p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded transition-colors w-full"
            >
              <FolderTree className="w-3 h-3 text-green-400" />
              <code className="text-xs text-green-400 font-mono flex-1 text-left">
                {commit.tree}
              </code>
              <ArrowRight className="w-3 h-3 text-green-400" />
            </button>
          </div>
        </div>

        {parentObjs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GitCommit className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">Parent Commit(s)</span>
            </div>
            <div className="bg-[#252526] rounded p-3 space-y-2">
              <p className="text-xs text-gray-400 mb-2">Previous commit(s) in history:</p>
              {parentObjs.map(
                (parent) =>
                  parent && (
                    <button
                      key={parent.hash}
                      onClick={() => onSelectObject(parent.hash)}
                      className="flex items-center gap-2 p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded transition-colors w-full"
                    >
                      <GitCommit className="w-3 h-3 text-blue-400" />
                      <code className="text-xs text-blue-400 font-mono flex-1 text-left">
                        {parent.hash}
                      </code>
                      <ArrowRight className="w-3 h-3 text-blue-400" />
                    </button>
                  )
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  const renderTreeDetail = (tree: TreeObject): JSX.Element => {
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
          </div>
          <code className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded font-mono">
            {tree.hash}
          </code>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <FolderTree className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Folder Name{tree.names.length > 1 ? `s (${tree.names.length})` : ''}</span>
          </div>
          <p className="text-sm text-gray-200 font-medium">
            {tree.names.length > 0 ? tree.names.slice(0, 5).join(', ') : <span className="text-gray-500 italic">No name associated</span>}
          </p>
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
                  key={entry.hash}
                  onClick={() => onSelectObject(entry.hash)}
                  className={`flex items-center gap-2 p-2 rounded transition-colors w-full ${
                    entry.type === 'blob'
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
                      className={`text-sm font-mono ${
                        entry.type === 'blob' ? 'text-yellow-300' : 'text-green-300'
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
                    className={`w-3 h-3 ${
                      entry.type === 'blob' ? 'text-yellow-400' : 'text-green-400'
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
                      className={`flex items-center gap-2 p-2 rounded transition-colors w-full text-left ${
                        refObj.type === 'commit'
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
                        className={`text-xs font-mono flex-1 ${
                          refObj.type === 'commit' ? 'text-blue-400' : 'text-green-400'
                        }`}
                      >
                        {hash}
                      </code>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded ${
                          refObj.type === 'commit' ? 'text-blue-400' : 'text-green-400'
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

  const renderBlobDetail = (blob: BlobObject): JSX.Element => {
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
          </div>
          <code className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded font-mono">
            {blob.hash}
          </code>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">File Name{blob.names.length > 1 ? `s (${blob.names.length})` : ''}</span>
          </div>
          <p className="text-sm text-gray-200 font-medium">
            {blob.names.length > 0 ? blob.names.slice(0, 5).join(', ') : <span className="text-gray-500 italic">No name associated</span>}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Size</span>
          </div>
          <p className="text-sm text-gray-300">{blob.size} bytes</p>
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
                  const refObj = getObjectByHash(hash) as TreeObject | undefined
                  if (!refObj) return null
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

  const renderTagDetail = (tag: TagObject): JSX.Element => {
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
          </div>
          <code className="text-xs text-purple-400 bg-purple-400/10 px-2 py-1 rounded font-mono">
            {tag.hash}
          </code>
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
            <GitCommit className="w-3 h-3 text-purple-400" />
            <code className="text-xs text-purple-400 font-mono flex-1 text-left">
              {tag.objectHash}
            </code>
            <ArrowRight className="w-3 h-3 text-purple-400" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {object.type === 'commit' && renderCommitDetail(object as CommitObject)}
      {object.type === 'tree' && renderTreeDetail(object as TreeObject)}
      {object.type === 'blob' && renderBlobDetail(object as BlobObject)}
      {object.type === 'tag' && renderTagDetail(object as TagObject)}
    </div>
  )
}
