import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { mockObjects, GitObject, CommitObject, TreeObject, BlobObject } from '@renderer/app/components/ObjectDatabase';

export interface GitState {
  selectedObject: GitObject | CommitObject | TreeObject | BlobObject | null;
  view: 'list' | 'graph';
  showGuide: boolean;
  objects: Array<CommitObject | TreeObject | BlobObject | GitObject>;
}

const initialState: GitState = {
  selectedObject: null,
  view: 'list',
  showGuide: false,
  objects: mockObjects,
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
  },
});

export const { setSelectedObject, setView, setShowGuide } = gitSlice.actions;
export default gitSlice.reducer;
