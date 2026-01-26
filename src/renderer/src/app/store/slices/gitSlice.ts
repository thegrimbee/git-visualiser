import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { mockObjects, GitObject, CommitObject, TreeObject, BlobObject } from '@renderer/app/components/ObjectDatabase';

export interface GitState {
  selectedObject: GitObject | CommitObject | TreeObject | BlobObject | null;
  view: 'list' | 'graph';
  showGuide: boolean;
  objects: Array<CommitObject | TreeObject | BlobObject | GitObject>;
  visibleTypes: string[];
  displayLimit: number;
}

const initialState: GitState = {
  selectedObject: null,
  view: 'list',
  showGuide: false,
  objects: mockObjects,
  visibleTypes: ['commit', 'tree', 'blob', 'tag'],
  displayLimit: 50,
};

const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    setSelectedObject: (state, action: PayloadAction<GitObject | CommitObject | TreeObject | BlobObject | null>) => {
      state.selectedObject = action.payload;
    },
    setView: (state, action: PayloadAction<'list' | 'graph'>) => {
      state.view = action.payload;
    },
    setShowGuide: (state, action: PayloadAction<boolean>) => {
      state.showGuide = action.payload;
    },
    toggleVisibleType: (state, action: PayloadAction<string>) => {
      const type = action.payload;
      if (state.visibleTypes.includes(type)) {
        state.visibleTypes = state.visibleTypes.filter((t) => t !== type);
      } else {
        state.visibleTypes.push(type);
      }
      // Reset limit when filters change to ensure consistent UX
      state.displayLimit = 50;
    },
    loadMoreObjects: (state) => {
      state.displayLimit += 50;
    },
  },
});

export const { setSelectedObject, setView, setShowGuide, toggleVisibleType, loadMoreObjects } = gitSlice.actions;
export default gitSlice.reducer;
