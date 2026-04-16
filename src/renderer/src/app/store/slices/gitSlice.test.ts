import { describe, expect, it } from 'vitest'
import gitReducer, { loadMoreObjects, toggleVisibleType } from './gitSlice'

describe('gitSlice', () => {
  it('resets displayLimit to 50 when toggling visible type', () => {
    let state = gitReducer(undefined, { type: 'init' })

    state = gitReducer(state, loadMoreObjects())
    expect(state.displayLimit).toBe(100)

    state = gitReducer(state, toggleVisibleType('commit'))
    expect(state.displayLimit).toBe(50)
  })
})