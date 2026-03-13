import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  GitObject,
  CommitObject,
  TreeObject,
  BlobObject
} from '@renderer/app/components/ObjectDatabase'

export interface GitState {
  selectedObject: GitObject | CommitObject | TreeObject | BlobObject | null
  view: 'list' | 'graph'
  showGuide: boolean
  objects: Array<CommitObject | TreeObject | BlobObject | GitObject>
  visibleTypes: string[]
  displayLimit: number
  repoPath: string | null
  repoName: string | null
  isRepoLoaded: boolean
  headPointer: string | null
  isRefreshing: boolean
}

const initialState: GitState = {
  selectedObject: null,
  view: 'list',
  showGuide: false,
  objects: [],
  visibleTypes: ['commit', 'tree', 'blob', 'tag'],
  displayLimit: 50,
  repoPath: null,
  repoName: null,
  isRepoLoaded: false,
  headPointer: null,
  isRefreshing: false
}

const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    setRepository: (state, action: PayloadAction<{ path: string; name: string }>) => {
      state.repoPath = action.payload.path
      state.repoName = action.payload.name
      state.isRepoLoaded = true
    },
    setHeadPointer: (state, action: PayloadAction<string | null>) => {
      state.headPointer = action.payload
    },
    setIsRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload
    },
    setObjects: (
      state,
      action: PayloadAction<Array<CommitObject | TreeObject | BlobObject | GitObject>>
    ) => {
      state.objects = action.payload
    },
    closeRepository: (state) => {
      state.repoPath = null
      state.repoName = null
      state.isRepoLoaded = false
      // Optional: clear objects or reset view
      state.objects = []
      state.selectedObject = null
    },
    setSelectedObject: (
      state,
      action: PayloadAction<GitObject | CommitObject | TreeObject | BlobObject | null>
    ) => {
      state.selectedObject = action.payload
    },
    setView: (state, action: PayloadAction<'list' | 'graph'>) => {
      state.view = action.payload
    },
    setShowGuide: (state, action: PayloadAction<boolean>) => {
      state.showGuide = action.payload
    },
    toggleVisibleType: (state, action: PayloadAction<string>) => {
      const type = action.payload
      if (state.visibleTypes.includes(type)) {
        state.visibleTypes = state.visibleTypes.filter((t) => t !== type)
      } else {
        state.visibleTypes.push(type)
      }
      // Reset limit when filters change to ensure consistent UX
      state.displayLimit = 50
    },
    loadMoreObjects: (state) => {
      state.displayLimit += 50
    },
    updateCommitDiffContent: (
      state,
      action: PayloadAction<{ commitHash: string; filePath: string; content: string }>
    ) => {
      const { commitHash, filePath, content } = action.payload

      const commit = state.objects.find(
        (obj) => obj.type === 'commit' && obj.hash === commitHash
      ) as CommitObject | undefined

      if (commit && commit.diff) {
        const diffEntry = commit.diff.find((d) => d.path === filePath)
        if (diffEntry) {
          diffEntry.content = content
        }
      }

      // Keep selectedObject in sync so ObjectDetail re-renders immediately
      if (commit && state.selectedObject?.type === 'commit' && state.selectedObject.hash === commitHash) {
        state.selectedObject = commit
      }
    },
  }
})

export const {
  setSelectedObject,
  setView,
  setShowGuide,
  toggleVisibleType,
  loadMoreObjects,
  setRepository,
  closeRepository,
  setObjects,
  setHeadPointer,
  setIsRefreshing,
  updateCommitDiffContent
} = gitSlice.actions

export default gitSlice.reducer
