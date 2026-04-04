export interface BranchInfo {
  name: string
  commitHash: string
  current: boolean
}

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
  timestamp: number
  committer?: string
  diff?: { status: string; path: string; hash: string; content: string | null}[]
}

export interface TreeObject extends GitObject {
  type: 'tree'
  names: string[]
  entries: Array<{
    mode: string
    type: 'blob' | 'tree'
    hash: string
    name: string
  }>
}

export interface BlobObject extends GitObject {
  type: 'blob'
  names: string[]
  content: string
}

// Can be lightweight tag or annotated tag
export interface TagObject extends GitObject {
  type: 'tag'
  objectHash: string
  tagName: string
  objectType?: 'commit' | 'tree' | 'blob' | 'tag'
  tagger?: string
  message?: string
  timestamp?: number
}