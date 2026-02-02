import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      loadGitRepository: (path: string) => Promise<any[]>
      selectDirectory: () => Promise<string | null>
    }
  }
}