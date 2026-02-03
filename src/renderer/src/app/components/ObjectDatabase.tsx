import {
  Database,
  Package,
  FileText,
  GitCommit,
  FolderTree,
  ArrowRight,
  Info,
  Check
} from 'lucide-react'
import { ObjectDetail } from './ObjectDetail'
import { ObjectGraph } from './ObjectGraph'
import { GitObjectsGuide } from './GitObjectsGuide'
import { useAppDispatch, useAppSelector } from '@renderer/app/store/hooks'
import { setSelectedObject, setView, toggleVisibleType } from '@renderer/app/store/slices/gitSlice'
import { JSX, useMemo } from 'react'

export interface GitObject {
  hash: string
  type: 'commit' | 'tree' | 'blob' | 'tag'
  size: number
  content?: string
  references?: string[]
  referencedBy?: string[]
}

export interface CommitObject extends GitObject {
  type: 'commit'
  tree: string
  parent?: string[]
  author: string
  message: string
  timestamp: string
}

export interface TreeObject extends GitObject {
  type: 'tree'
  entries: Array<{
    mode: string
    type: 'blob' | 'tree'
    hash: string
    name: string
  }>
}

export interface BlobObject extends GitObject {
  type: 'blob'
  content: string
}

export function ObjectDatabase(): JSX.Element {
  const dispatch = useAppDispatch()
  const selectedObject = useAppSelector((state) => state.git.selectedObject)
  const view = useAppSelector((state) => state.git.view)
  const showGuide = useAppSelector((state) => state.git.showGuide)
  const objects = useAppSelector((state) => state.git.objects)
  const visibleTypes = useAppSelector((state) => state.git.visibleTypes)
  const displayLimit = useAppSelector((state) => state.git.displayLimit)
  const getTypeIcon = (type: string): React.JSX.Element => {
    switch (type) {
      case 'commit':
        return <GitCommit className="w-3 h-3 text-blue-400" />
      case 'tree':
        return <FolderTree className="w-3 h-3 text-green-400" />
      case 'blob':
        return <FileText className="w-3 h-3 text-yellow-400" />
      case 'tag':
        return <Package className="w-3 h-3 text-purple-400" />
      default:
        return <Database className="w-3 h-3 text-gray-400" />
    }
  }

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'commit':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'tree':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'blob':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'tag':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const objectCounts = objects.reduce(
    (acc, obj) => {
      acc[obj.type] = (acc[obj.type] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  // derived filtered list
  const filteredObjects = useMemo(() => {
    return objects.filter((obj) => visibleTypes.includes(obj.type))
  }, [objects, visibleTypes])

  // derived paginated list for the sidebar
  const visibleListObjects = useMemo(() => {
    return filteredObjects.slice(0, displayLimit)
  }, [filteredObjects, displayLimit])

  // Helper just for checking inclusion in local rendering
  const isTypeVisible = (type: string): boolean => visibleTypes.includes(type)

  return (
    <div className="flex-1 flex bg-[#1e1e1e] overflow-hidden h-full">
      <div className="flex-1 border-r border-gray-700 flex flex-col overflow-hidden relative">
        <div className="p-4 border-b border-gray-700 flex-shrink-0 max-h-[50vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-semibold text-gray-200">Git Objects</h2>
            </div>

            <div className="flex items-center gap-1 bg-[#252526] rounded p-0.5">
              <button
                onClick={() => dispatch(setView('list'))}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  view === 'list'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                List
              </button>
              <button
                onClick={() => dispatch(setView('graph'))}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  view === 'graph'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Graph
              </button>
            </div>
          </div>

          {showGuide && <GitObjectsGuide />}

          <div className="bg-blue-500/5 border border-blue-500/20 rounded p-3 mb-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-300 leading-relaxed">
                Git stores everything as objects. Click on any object to explore how they reference
                each other.
              </p>
            </div>
          </div>

          <div className="mb-2">
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
              Filter Objects
            </h3>
            <div className="flex flex-wrap gap-2">
              {['commit', 'tree', 'blob', 'tag'].map((type) => (
                <button
                  key={type}
                  onClick={() => dispatch(toggleVisibleType(type))}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-all ${
                    isTypeVisible(type)
                      ? getTypeColor(type)
                      : 'bg-[#252526] border-gray-700 text-gray-500 hover:border-gray-600 opacity-60'
                  }`}
                >
                  {isTypeVisible(type) ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <div className="w-3 h-3" />
                  )}
                  <span className="capitalize">{type}s</span>
                  <span className="opacity-50 ml-1 text-[10px] bg-black/20 px-1 rounded-full">
                    {objectCounts[type] || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <GitCommit className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-gray-400">Commits</span>
              </div>
              <span className="text-lg font-semibold text-blue-300">{objectCounts.commit || 0}</span>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <FolderTree className="w-3 h-3 text-green-400" />
                <span className="text-xs text-gray-400">Trees</span>
              </div>
              <span className="text-lg font-semibold text-green-300">{objectCounts.tree || 0}</span>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-gray-400">Blobs</span>
              </div>
              <span className="text-lg font-semibold text-yellow-300">{objectCounts.blob || 0}</span>
            </div>
            
            <div className="bg-purple-500/10 border border-purple-500/20 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <Package className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-gray-400">Tags</span>
              </div>
              <span className="text-lg font-semibold text-purple-300">{objectCounts.tag || 0}</span>
            </div>
          </div> */}
        </div>

        <div className="flex-1 relative">
          <div
            className={`absolute inset-0 ${view === 'list' ? 'overflow-auto p-4' : 'overflow-hidden p-0'}`}
          >
            {view === 'list' ? (
              <div className="space-y-1">
                {visibleListObjects.length > 0 ? (
                  visibleListObjects.map((obj) => (
                    <div
                      key={obj.hash}
                      onClick={() => dispatch(setSelectedObject(obj))}
                      className={`flex items-center gap-2 p-2 rounded transition-colors cursor-pointer ${
                        selectedObject?.hash === obj.hash
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      {getTypeIcon(obj.type)}
                      <code className="text-xs text-gray-400 font-mono flex-1 truncate">
                        {obj.hash}
                      </code>
                      <span
                        className={`text-xs px-2 py-0.5 rounded border ${getTypeColor(obj.type)}`}
                      >
                        {obj.type}
                      </span>
                      {selectedObject?.hash === obj.hash && (
                        <ArrowRight className="w-3 h-3 text-blue-400" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 text-sm mt-10">
                    No objects match the selected filters.
                  </div>
                )}
              </div>
            ) : (
              <ObjectGraph
                objects={filteredObjects}
                selectedHash={selectedObject?.hash}
                onSelectObject={(hash) => {
                  const obj = objects.find((o) => o.hash === hash)
                  if (obj) dispatch(setSelectedObject(obj))
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 border-l border-gray-700 bg-[#1e1e1e] relative">
        <div className="absolute inset-0 overflow-auto">
          {selectedObject ? (
            <ObjectDetail
              object={selectedObject}
              allObjects={objects}
              onSelectObject={(hash) => {
                const obj = objects.find((o) => o.hash === hash)
                if (obj) dispatch(setSelectedObject(obj))
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Database className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-400">Select an object to view details</p>
                <p className="text-xs text-gray-500 mt-1">
                  Click on any object in the list to explore
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
