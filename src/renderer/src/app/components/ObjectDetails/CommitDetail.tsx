import type { JSX } from "react"
import { FileText, Hash, FolderTree, ArrowRight, GitCommit, User, Calendar, FileDiff, ChevronDown, ChevronRight } from "lucide-react"
import type { GitObject, BlobObject, TreeObject, CommitObject, TagObject } from "../ObjectDatabase"
import { useState } from "react"
import { useAppDispatch, useAppSelector } from "@renderer/app/store/hooks"
import { updateCommitDiffContent } from "@renderer/app/store/slices/gitSlice"

interface CommitDetailProps {
  commit: CommitObject
  onSelectObject: (hash: string) => void
  getObjectByHash: (hash: string) => GitObject | BlobObject | TreeObject | CommitObject | TagObject | undefined
}

export function CommitDetail({ commit, onSelectObject, getObjectByHash }: CommitDetailProps): JSX.Element {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set())
  const dispatch = useAppDispatch()
  const repoPath = useAppSelector((state) => state.git.repoPath)

  const toggleFileDiff = async (filePath: string): Promise<void> => { // Make async
    // Check if we need to fetch content
    if (repoPath) {
      const diffEntry = commit.diff?.find((d) => d.path === filePath)

      if (diffEntry && !diffEntry.content) {
        try {
          const content = await window.api.getCommitDiff(repoPath, commit.hash, filePath)
          if (content) {
            dispatch(updateCommitDiffContent({
              commitHash: commit.hash,
              filePath,
              content
            }))
          }
        } catch (err) {
          console.error('Failed to fetch diff:', err)
        }
      }
    }

    setExpandedFiles((prev) => {
      const newExpanded = new Set(prev)
      if (newExpanded.has(filePath)) {
        newExpanded.delete(filePath)
      } else {
        newExpanded.add(filePath)
      }
      return newExpanded
    })
  }

  const renderDiffContent = (diff: string): JSX.Element | null => {
    if (!diff) return null
    return (
      <div className="text-[10px] font-mono whitespace-pre overflow-x-auto p-2 bg-black/30 mt-1 rounded border border-white/5">
        {diff.split('\n').map((line, i) => {
          let color = 'text-gray-400'
          if (line.startsWith('+') && !line.startsWith('+++')) color = 'text-green-400'
          else if (line.startsWith('-') && !line.startsWith('---')) color = 'text-red-400'
          else if (line.startsWith('@@')) color = 'text-purple-400'

          return (
            <div key={i} className={color}>
              {line}
            </div>
          )
        })}
      </div>
    )
  }
  const parentObjs = commit.parent?.map((p) => getObjectByHash(p)).filter(Boolean) || []
  // TODO: Move each object type rendering to separate components for better organization
  const getStatusColor = (status: string): string => {
    const baseStatus = status.trim().charAt(0).toUpperCase()
    if (baseStatus === 'A') return 'text-green-400' // Added
    if (baseStatus === 'D') return 'text-red-400' // Deleted
    if (baseStatus === 'M') return 'text-yellow-400' // Modified
    if (baseStatus === 'R') return 'text-purple-400' // Renamed
    return 'text-gray-400'
  }
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
          <p className="text-sm text-gray-300">{new Date(commit.timestamp).toLocaleString()}</p>
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
      {commit.diff && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileDiff className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Changed Files ({commit.diff.length})</span>
          </div>
          <div className="bg-[#252526] rounded p-3 max-h-[400px] overflow-y-auto">
            {commit.diff.length > 0 ? (
              <div className="space-y-2">
                {commit.diff.map((change, idx) => {
                  const isExpanded = expandedFiles.has(change.path)

                  return (
                    <div key={idx} className="flex flex-col">
                      {/* File Change Area */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFileDiff(change.path)}
                          className="p-1 hover:bg-white/10 rounded cursor-pointer text-gray-400"
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>

                        <button
                          onClick={() => {
                            if (change.hash && !change.hash.match(/^0+$/)) onSelectObject(change.hash)
                          }}
                          className="flex-1 flex items-center gap-2 p-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded transition-colors"
                        >
                          <span className={`text-xs font-bold w-4 flex-shrink-0 ${getStatusColor(change.status)}`}>
                            {change.status}
                          </span>
                          <code className="text-xs text-yellow-300 font-mono flex-1 text-left truncate">
                            {change.path}
                          </code>
                        </button>
                      </div>

                      {/* Render Diff Area */}
                      {isExpanded && (
                        <div className="pl-6 mt-1">
                          {change.content ? (
                            renderDiffContent(change.content)
                          ) : (
                            <div className="text-xs text-gray-500 italic p-2">No diff available.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="p-1 text-xs text-gray-500 italic">No file modifications found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}