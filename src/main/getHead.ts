import { ipcMain } from 'electron'
import { join } from 'path'
import * as fs from 'fs'

export function registerGetHeadHandler(): void {
  ipcMain.handle('git:get-head', async (_event, repoPath: string) => {
    const headPath = join(repoPath, '.git', 'HEAD')
    if (!fs.existsSync(headPath)) {
      throw new Error('No .git/HEAD found')
    }
    const headContent = await fs.promises.readFile(headPath, 'utf8')
    const refMatch = headContent.match(/ref: refs\/heads\/(.+)\s*/)
    if (refMatch) {
      return refMatch[1]
    } else {
      return null
    }
  })
}