import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      loadGitRepository: (path: string) => Promise<
        Array<{
          hash: string
          // Only allow specific git types, as expected by renderer
          type: 'commit' | 'tree' | 'blob' | 'tag'
          size: number
          // Main process returns string (utf8) or placeholder, not Buffer
          content?: string
          references?: string[]
          referencedBy?: string[]
          // Tree object fields
          entries?: Array<{
            mode: string
            name: string
            hash: string
            type: 'tree' | 'blob'
          }>
          // Commit object fields
          tree?: string
          parent?: string[]
          author?: string
          committer?: string
          message?: string
          timestamp?: string
        }>
      >
      selectDirectory: () => Promise<string | null>
    }
  }
}