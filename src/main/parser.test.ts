import { describe, expect, it } from 'vitest'
import { parseCommitContent } from './parser'

describe('parseCommitContent', () => {
  it('parses tree, parent, author timestamp, and message', () => {
    const content = [
      'tree 1111111111111111111111111111111111111111',
      'parent 2222222222222222222222222222222222222222',
      'author Jane Doe jane@example.com 1710000000 +0800',
      'committer Jane Doe jane@example.com 1710000001 +0800',
      '',
      'feat: add parser tests',
      '',
      'with body line'
    ].join('\n')

    const result = parseCommitContent(content)

    expect(result.tree).toBe('1111111111111111111111111111111111111111')
    expect(result.parent).toEqual(['2222222222222222222222222222222222222222'])
    expect(result.author).toBe('Jane Doe jane@example.com')
    expect(result.timestamp).toBe(1710000000 * 1000)
    expect(result.message).toBe('feat: add parser tests\n\nwith body line')
  })
})