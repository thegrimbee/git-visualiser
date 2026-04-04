import {
  Database,
  Info,
  Check,
  GitCommit,
  FolderTree,
  FileText,
  Package,
} from 'lucide-react'
import type { CommitObject, TreeObject, TagObject } from './ObjectTypes'
import { ObjectDetail } from './ObjectDetail'
import { ObjectGraph } from './ObjectGraph'
import { ObjectList } from './ObjectList'
import { GitObjectsGuide } from './GitObjectsGuide'
import { useAppDispatch, useAppSelector } from '@renderer/app/store/hooks'
import { setSelectedObject, setView, toggleVisibleType } from '@renderer/app/store/slices/gitSlice'
import { useMemo } from 'react'
import type { JSX } from 'react'

function getTypeColor(type: string): string {
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

function getTypeIcon(type: string): React.JSX.Element {
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


export function ObjectDatabase(): JSX.Element {
  const dispatch = useAppDispatch()
  const selectedObject = useAppSelector((state) => state.git.selectedObject)
  const view = useAppSelector((state) => state.git.view)
  const showGuide = useAppSelector((state) => state.git.showGuide)
  const objects = useAppSelector((state) => state.git.objects)
  const visibleTypes = useAppSelector((state) => state.git.visibleTypes)
  const displayLimit = useAppSelector((state) => state.git.displayLimit)
  const branches = useAppSelector((state) => state.git.branches)
  const selectedBranch = useAppSelector((state) => state.git.selectedBranch)

  const branchScopedObjects = useMemo(() => {
    if (!selectedBranch) return objects

    const selected = branches.find((b) => b.name === selectedBranch)
    if (!selected) return objects

    const objectMap = new Map(objects.map((o) => [o.hash, o]))
    const included = new Set<string>()

    const includeTree = (rootTreeHash: string): void => {
      const queue: string[] = [rootTreeHash]
      let i = 0
      while (i < queue.length) {
        const hash = queue[i++]
        if (!hash || included.has(hash)) continue
        included.add(hash)

        const obj = objectMap.get(hash)
        if (obj?.type === 'tree') {
          const tree = obj as TreeObject
          for (const entry of tree.entries) {
            queue.push(entry.hash)
          }
        }
      }
    }

    // Walk commit ancestry from selected branch tip
    const stack: string[] = [selected.commitHash]
    while (stack.length > 0) {
      const hash = stack.pop()
      if (!hash || included.has(hash)) continue

      const obj = objectMap.get(hash)
      if (!obj || obj.type !== 'commit') continue

      const commit = obj as CommitObject
      included.add(commit.hash)

      if (commit.tree) includeTree(commit.tree)
      for (const parentHash of commit.parent ?? []) {
        stack.push(parentHash)
      }
    }

    // Keep tags that point to included objects
    for (const obj of objects) {
      if (obj.type === 'tag') {
        const tagObj = obj as TagObject
        if (included.has(tagObj.objectHash)) {
          included.add(tagObj.hash)
        }
      }
    }

    return objects.filter((o) => included.has(o.hash))
  }, [objects, branches, selectedBranch])

  const visibilityMap = useMemo(() => {
    const map: Map<string, boolean> = new Map()
    for (const obj of branchScopedObjects) {
      map.set(obj.hash, visibleTypes.includes(obj.type))
    }
    return map
  }, [branchScopedObjects, visibleTypes])

  // derived paginated list for the sidebar
  const visibleListObjects = useMemo(() => {
    return branchScopedObjects.filter((obj) => visibilityMap.get(obj.hash)).slice(0, displayLimit)
  }, [branchScopedObjects, visibilityMap, displayLimit])

  // Helper just for checking inclusion in local rendering
  const isTypeVisible = (type: string): boolean => visibleTypes.includes(type)
  const objectCounts = useMemo(() => {
    return branchScopedObjects.reduce((acc, obj) => {
      acc[obj.type] = (acc[obj.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }, [branchScopedObjects])
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

          {showGuide && <GitObjectsGuide />} {/* Disabled for now*/}

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
        </div>
        <div className="flex-1 relative">
          <div
            className={`absolute inset-0 ${view === 'list' ? 'overflow-auto p-4' : 'overflow-hidden p-0'}`}
          >
            {view === 'list' ? (
              <ObjectList
                objects={visibleListObjects}
                selectedHash={selectedObject?.hash}
                onSelectObject={(obj) => dispatch(setSelectedObject(obj))}
                getTypeColor={getTypeColor}
                getTypeIcon={getTypeIcon}
              />
            ) : (
              <ObjectGraph
                objects={branchScopedObjects}
                selectedHash={selectedObject?.hash}
                onSelectObject={(hash) => {
                  const obj = objects.find((o) => o.hash === hash)
                  if (obj) dispatch(setSelectedObject(obj))
                }}
                visibilityMap={visibilityMap}
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
