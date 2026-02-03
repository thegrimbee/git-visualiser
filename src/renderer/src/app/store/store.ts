import { configureStore } from '@reduxjs/toolkit'
import appReducer from './slices/appSlice'
import gitReducer from './slices/gitSlice'

export const store = configureStore({
  reducer: {
    app: appReducer,
    git: gitReducer
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
