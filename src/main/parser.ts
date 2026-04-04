// Helper to parse a Tree object buffer
// Format: [mode] [name]\0[20-byte-sha]... concatenated
export function parseTreeBuffer(
  buffer: Buffer
): { mode: string; name: string; hash: string; type: 'tree' | 'blob' }[] {
  const entries: { mode: string; name: string; hash: string; type: 'tree' | 'blob' }[] = []
  let cursor = 0
  while (cursor < buffer.length) {
    const spaceIndex = buffer.indexOf(32, cursor) // space
    if (spaceIndex === -1) break
    const nullIndex = buffer.indexOf(0, spaceIndex) // null byte
    if (nullIndex === -1) break
    const mode = buffer.subarray(cursor, spaceIndex).toString('utf8')
    const name = buffer.subarray(spaceIndex + 1, nullIndex).toString('utf8')

    // SHA is the next 20 bytes
    const shaStart = nullIndex + 1
    const shaEnd = shaStart + 20
    if (shaEnd > buffer.length) break

    const shaBuffer = buffer.subarray(shaStart, shaEnd)
    const hash = shaBuffer.toString('hex')

    entries.push({
      mode,
      name,
      hash,
      type: mode.startsWith('04') || mode.startsWith('40') ? 'tree' : 'blob'
    })

    cursor = shaEnd
  }
  return entries
}

// Helper to parse Commit content text
export function parseCommitContent(content: string): {
  tree?: string
  parent: string[]
  author?: string
  committer?: string
  timestamp: number
  message: string
} {
  const lines = content.split('\n')
  const metadata: { tree?: string; parent: string[]; author?: string; committer?: string; timestamp: number } = {
    parent: [],
    timestamp: 0
  }
  let messageStart = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === '') {
      messageStart = i + 1
      break
    }
    const [key, ...rest] = line.split(' ')
    const value = rest.join(' ')

    if (key === 'tree') metadata.tree = value
    else if (key === 'parent') metadata.parent.push(value)
    else if (key === 'author') {
      const authorParts = value.split(' ')
      authorParts.pop() // timezone
      const timestampToken = authorParts.pop() // second last part is Unix timestamp (seconds since epoch)
      const timestampNumber = Number(timestampToken)
      if (Number.isFinite(timestampNumber)) {
        metadata.timestamp = timestampNumber * 1000 // convert to ms
      }
      metadata.author = authorParts.join(' ')
    } else if (key === 'committer') {
      const committerParts = value.split(' ')
      committerParts.pop()
      committerParts.pop()
      metadata.committer = committerParts.join(' ')
    }
  }

  return {
    ...metadata,
    message: lines.slice(messageStart).join('\n').trim()
  }
}

export function parseAnnotatedTagContent(content: string): {
  objectHash: string
  tagName: string
  objectType?: 'commit' | 'tree' | 'blob'
  tagger?: string
  message?: string
  timestamp?: number
} {
  const lines = content.split('\n')
  const metadata: {
    objectHash: string
    tagName: string
    objectType?: 'commit' | 'tree' | 'blob'
    tagger?: string
    message?: string
    timestamp?: number
  } = {
    objectHash: '',
    tagName: ''
  }
  let messageStart = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line === '') {
      messageStart = i + 1
      break
    }
    const [key, ...rest] = line.split(' ')
    if (key === 'object') metadata.objectHash = rest[0]
    else if (key === 'type') {
      const typeValue = rest[0]
      if (typeValue === 'commit' || typeValue === 'tree' || typeValue === 'blob') {
        metadata.objectType = typeValue
      }
    } else if (key === 'tag') metadata.tagName = rest.join(' ')
    else if (key === 'tagger') {
      const value = rest.join(' ')
      const authorParts = value.split(' ')
      authorParts.pop() // timezone
      const timestampToken = authorParts.pop() // second last part is Unix timestamp (seconds since epoch)
      const timestampNumber = Number(timestampToken)
      if (Number.isFinite(timestampNumber)) {
        metadata.timestamp = timestampNumber * 1000 // convert to ms
      }
      metadata.tagger = authorParts.join(' ')
    }
  }
  return {
    ...metadata,
    message: lines.slice(messageStart).join('\n').trim()
  }
}
