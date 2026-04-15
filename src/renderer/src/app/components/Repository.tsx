import { useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@renderer/app/store/hooks'
import { setBranches, updateCommitDiffContent } from '@renderer/app/store/slices/gitSlice'
import { CommitObject, TagObject } from '@renderer/app/components/ObjectTypes'
import {
  setRepository,
  closeRepository,
  setObjects,
  setHeadPointer,
  setIsRefreshing
} from '@renderer/app/store/slices/gitSlice'
import { toast } from 'sonner'
import {
  FolderOpen,
  HardDrive,
  Clock,
  GitCommit,
  AlertCircle,
  Loader2,
  RefreshCw,
  Check,
  Download
} from 'lucide-react'
import { AppButton } from './ui/buttons'

export function Repository(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const { repoPath, repoName, isRepoLoaded, objects, isRefreshing, branches } = useAppSelector(
    (state) => state.git
  )
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleExportJson = async (): Promise<void> => {
    setIsExporting(true)
    try {
      // Create a deep copy of objects to modify for export
      // The `objects` from useAppSelector will not update immediately in this closure
      const objectsCopy = JSON.parse(JSON.stringify(objects)) as typeof objects

      if (repoPath) {
        // 1. Identify missing diffs in the copy
        const missingDiffs: { commitHash: string; filePath: string }[] = []

        objectsCopy.forEach((obj) => {
          if (obj.type === 'commit') {
            // We need to assert type or check properties safely since JSON.parse returns `any` structure
            // But we cast it above so TS should be happy-ish.
            // If the structure is complex, we might need better type guards, but for now:
            const commit = obj as CommitObject
            if (commit.diff) {
              commit.diff.forEach((d) => {
                if (!d.content) {
                  missingDiffs.push({ commitHash: commit.hash, filePath: d.path })
                }
              })
            }
          }
        })

        // 2. Batch fetch if needed
        if (missingDiffs.length > 0) {
          const toastId = toast.loading(`Fetching ${missingDiffs.length} diffs for export...`)
          const results = await window.api.getBatchCommitDiffs(repoPath, missingDiffs)
          results.forEach((res) => {
            if (res.content) {
              // Update the store so the UI reflects the changes
              dispatch(updateCommitDiffContent({ ...res, content: res.content }))

              // Update the local copy for export
              const commit = objectsCopy.find((o) => o.hash === res.commitHash) as CommitObject | undefined
              if (commit && commit.diff) {
                const diffEntry = commit.diff.find((d) => d.path === res.filePath)
                if (diffEntry) {
                  diffEntry.content = res.content
                }
              }
            }
          })

          toast.dismiss(toastId)
        }
      }

      const dataToExport = {
        repositoryName: repoName,
        repositoryPath: repoPath,
        exportDate: new Date().toISOString(),
        totalObjects: objectsCopy.length,
        branches: branches,
        objects: objectsCopy // Use the updated copy
      }

      const jsonString = JSON.stringify(dataToExport, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const link = document.createElement('a')
      link.href = url
      link.download = repoName ? `${repoName.replace(/\s+/g, '_')}_git_objects.json` : 'git_objects.json'
      document.body.appendChild(link)
      link.click()

      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 0)

      toast.success('Git objects exported to JSON successfully')
    } catch (err) {
      console.error('Export failed', err)
      toast.error('Failed to export JSON')
    } finally {
      setIsExporting(false)
    }
  }

  const handleRefresh = async (): Promise<void> => {
    if (!repoPath) return

    setShowSuccess(false)
    dispatch(setIsRefreshing(true))
    const toastId = toast.loading('Refreshing repository...')

    try {
      // Re-fetch objects, head, and branches to keep branch-scoped graph in sync
      const [gitObjects, head, refreshedBranches] = await Promise.all([
        window.api.getGitObjects(repoPath),
        window.api.getGitHead(repoPath),
        window.api.getGitBranches(repoPath)
      ])

      if (gitObjects) {
        dispatch(setObjects(gitObjects))
        dispatch(setHeadPointer(head))
        dispatch(setBranches(refreshedBranches))
        toast.success('Repository refreshed', { id: toastId })
        // Show success state on the button
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        toast.error('Failed to read repository', { id: toastId })
      }
    } catch (error) {
      console.error('Refresh error:', error)
      const message =
        error instanceof Error && /too large|buffer/i.test(error.message)
          ? error.message
          : 'Error refreshing repository'
      toast.error(message, { id: toastId })
    } finally {
      dispatch(setIsRefreshing(false))
    }
  }

  const handleSelectDirectory = async (): Promise<void> => {
    setError(null)
    setShowSuccess(false)

    // 1. Get the absolute path from the system dialog
    const path = await window.api.selectDirectory()
    if (!path) return // User cancelled the dialog

    setIsLoading(true)

    try {
      // 2. Validate and Load
      // Attempts to read .git/objects. If .git is missing, this throws an error immediately.
      const loadedObjects = await window.api.getGitObjects(path)
      const headRef = await window.api.getGitHead(path)
      dispatch(setHeadPointer(headRef))

      // 3. If we reach here, the .git folder exists and is valid
      const folderName = path.split(/[\\/]/).pop()

      dispatch(
        setRepository({
          path: path,
          name: folderName || 'Untitled Repo'
        })
      )
      if (path) {
        const branches = await window.api.getGitBranches(path)
        dispatch(setBranches(branches))
      } else {
        setError('Repository loaded but failed to read branches.')
      }

      if (loadedObjects && loadedObjects.length > 0) {
        dispatch(setObjects(loadedObjects))
      } else {
        setError('Repository loaded but no loose objects found (they might be packed).')
      }
    } catch (err: unknown) {
      console.error(err)
      // 4. Handle Missing .git Error
      if (err instanceof Error && /too large|buffer/i.test(err.message)) {
        setError(err.message)
      } else if (err instanceof Error && err.message.includes('No .git')) {
        setError('The selected folder is not a valid git repository (missing .git folder)')
      } else {
        setError('Failed to load repository. Ensure you have read permissions.')
      }
      dispatch(closeRepository())
    } finally {
      setIsLoading(false)
    }
  }

  const commitStats = useMemo(() => {
    const allCommits = objects.filter((o) => o.type === 'commit') as CommitObject[]
    const objectMap = new Map(objects.map((obj) => [obj.hash, obj]))
    const reachableCommits = new Set<string>()
    const stack: string[] = []

    for (const branch of branches) {
      if (branch.commitHash) {
        stack.push(branch.commitHash)
      }
    }

    for (const obj of objects) {
      if (obj.type !== 'tag') continue

      let currentHash = (obj as TagObject).objectHash
      const seen = new Set<string>()

      // Follow nested tags until we hit the underlying object.
      while (currentHash && !seen.has(currentHash)) {
        seen.add(currentHash)
        const target = objectMap.get(currentHash)

        if (!target) break
        if (target.type === 'commit') {
          stack.push(target.hash)
          break
        }
        if (target.type === 'tag') {
          currentHash = (target as TagObject).objectHash
          continue
        }

        break
      }
    }

    while (stack.length > 0) {
      const hash = stack.pop()
      if (!hash || reachableCommits.has(hash)) continue

      const obj = objectMap.get(hash)
      if (!obj || obj.type !== 'commit') continue

      const commit = obj as CommitObject
      reachableCommits.add(commit.hash)
      for (const parentHash of commit.parent ?? []) {
        stack.push(parentHash)
      }
    }

    const total = allCommits.length
    const reachable = reachableCommits.size
    const dangling = Math.max(total - reachable, 0)

    return { total, reachable, dangling }
  }, [objects, branches])

  const lastCommit = objects
    .filter((o) => o.type === 'commit')
    .sort((a, b) => {
      const aCommit = a as CommitObject
      const bCommit = b as CommitObject
      return bCommit.timestamp - aCommit.timestamp
    })[0] as CommitObject | undefined

  if (!isRepoLoaded) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#1e1e1e] p-8 text-center">
        <div className="bg-[#252526] p-8 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="w-8 h-8 text-blue-400" />
          </div>

          <h2 className="text-xl font-semibold text-white mb-2">Open a Repository</h2>
          <p className="text-gray-400 text-sm mb-8">
            Select a local folder containing a .git repository to visualize its history and objects.
          </p>

          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-3 text-red-400 text-sm text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <AppButton
            onClick={handleSelectDirectory}
            disabled={isLoading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <HardDrive className="w-4 h-4" />
            )}
            {isLoading ? 'Reading .git folder...' : 'Browse Folders'}
          </AppButton>

          {/* <div className="mt-6 pt-6 border-t border-gray-700 text-left">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">
              Recent
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer group">
                <FolderOpen className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">git-visualiser</p>
                  <p className="text-xs text-gray-600 truncate">
                    d:/Education/CS3281/git-visualiser
                  </p>
                </div>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] p-6 relative">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              {repoName}
              <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                Active
              </span>
            </h2>
            <p className="text-gray-500 text-sm mt-1 font-mono">{repoPath}</p>
          </div>

          <div className="flex gap-2">
            <AppButton
              onClick={handleExportJson}
              disabled={isExporting || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded font-medium text-sm transition-all shadow-sm"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>{isExporting ? 'Exporting...' : 'Export JSON'}</span>
            </AppButton>
            <AppButton
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className={`
              flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-all shadow-sm
              ${
                showSuccess
                  ? 'bg-green-600 text-white border-transparent'
                  : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-100'
              }
            `}
            >
              {isRefreshing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : showSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>
                {isRefreshing ? 'Refreshing...' : showSuccess ? 'Repo Refreshed' : 'Refresh'}
              </span>
            </AppButton>

            <AppButton
              onClick={handleSelectDirectory}
              disabled={isLoading}
              className="px-6 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:opacity-60 text-white rounded font-medium transition-colors flex items-center gap-2 border border-gray-700"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                <HardDrive className="w-4 h-4" />
              )}
            {isLoading ? 'Switching...' : 'Switch Repo'}
            </AppButton>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700 text-left"></div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#252526] p-4 rounded border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded">
              <GitCommit className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-gray-400 text-sm">Total Commits</span>
          </div>
          <p className="text-2xl font-bold text-white pl-1">{commitStats.reachable}</p>
        </div>
        <div className="bg-[#252526] p-4 rounded border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-gray-400 text-sm">Last Commit</span>
          </div>
          <p className="text-lg font-medium text-white pl-1 mt-1">
            {lastCommit ? new Date(lastCommit.timestamp).toLocaleString() : 'No commits'}
          </p>
        </div>
      </div>

      <div className="flex-1 bg-[#252526] rounded border border-gray-700 p-6 flex items-center justify-center text-center">
        <div className="max-w-md">
          <h3 className="text-lg font-medium text-white mb-2">Repository Ready</h3>
          <p className="text-gray-400 text-sm">
            Head over to the <b>Objects</b> or <b>Commits</b> tab to inspect the internal Git
            structure of this repository.
          </p>
        </div>
      </div>
      {isLoading && (
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px] flex items-center justify-center z-10">
        <div className="flex items-center gap-2 px-4 py-2 rounded bg-[#252526] border border-gray-700 text-gray-200 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
            Loading repository...
          </div>
        </div>
      )}
    </div>
  )
}
