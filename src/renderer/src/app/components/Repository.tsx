import { useState } from 'react'
import { useAppDispatch, useAppSelector } from '@renderer/app/store/hooks'
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
  GitBranch,
  GitCommit,
  AlertCircle,
  Loader2,
  RefreshCw,
  Check
} from 'lucide-react'

export function Repository(): React.JSX.Element {
  const dispatch = useAppDispatch()
  const { repoPath, repoName, isRepoLoaded, objects, isRefreshing } = useAppSelector(
    (state) => state.git
  )
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const handleRefresh = async (): Promise<void> => {
    if (!repoPath) return

    setShowSuccess(false)
    dispatch(setIsRefreshing(true))
    const toastId = toast.loading('Refreshing repository...')

    try {
      // Re-fetch objects and head
      const gitObjects = await window.api.getGitObjects(repoPath)
      const head = await window.api.getGitHead(repoPath)

      if (gitObjects) {
        dispatch(setObjects(gitObjects))
        dispatch(setHeadPointer(head))
        toast.success('Repository refreshed', { id: toastId })
        
        // Show success state on the button
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        toast.error('Failed to read repository', { id: toastId })
      }
    } catch (error) {
      console.error('Refresh error:', error)
      toast.error('Error refreshing repository', { id: toastId })
    } finally {
      dispatch(setIsRefreshing(false))
    }
  }

  const handleSelectDirectory = async (): Promise<void> => {
    setError(null)

    // 1. Get the absolute path from the system dialog
    const path = await window.api.selectDirectory()
    console.log('Selected path:', path)
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

      if (loadedObjects && loadedObjects.length > 0) {
        dispatch(setObjects(loadedObjects))
      } else {
        setError('Repository loaded but no loose objects found (they might be packed).')
      }
    } catch (err: unknown) {
      console.error(err)
      // 4. Handle Missing .git Error
      // The Main process throws "No .git/objects found" which we catch here
      if (err instanceof Error && err.message.includes('No .git')) {
        setError('The selected folder is not a valid git repository (missing .git folder)')
      } else {
        setError('Failed to load repository. Ensure you have read permissions.')
      }
      dispatch(closeRepository())
    } finally {
      setIsLoading(false)
    }
  }

  const commitCount = objects.filter((o) => o.type === 'commit').length

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

          <button
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
          </button>

          <div className="mt-6 pt-6 border-t border-gray-700 text-left">
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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] p-6">
      <div className="flex items-center justify-between mb-8">
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
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
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
          </button>

          <button
            onClick={handleSelectDirectory}
            disabled={isLoading}
            className="px-6 py-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-white rounded font-medium transition-colors flex items-center gap-2 border border-gray-700"
          >
            <HardDrive className="w-4 h-4" />
            Switch Repo
          </button>
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
          <p className="text-2xl font-bold text-white pl-1">{commitCount}</p>
        </div>

        <div className="bg-[#252526] p-4 rounded border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded">
              <GitBranch className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-gray-400 text-sm">Branches</span>
          </div>
          <p className="text-2xl font-bold text-white pl-1">3</p>
        </div>

        <div className="bg-[#252526] p-4 rounded border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-gray-400 text-sm">Last Modified</span>
          </div>
          <p className="text-lg font-medium text-white pl-1 mt-1">Just now</p>
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
    </div>
  )
}
