import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import * as fs from 'fs'
import * as zlib from 'zlib'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const execAsync = promisify(exec)

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Helper to parse a Tree object buffer
// Format: [mode] [name]\0[20-byte-sha]... concatenated
function parseTreeBuffer(
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
function parseCommitContent(content: string): {
  tree?: string
  parent: string[]
  author?: string
  committer?: string
  message: string
} {
  const lines = content.split('\n')
  const metadata: { tree?: string; parent: string[]; author?: string; committer?: string } = {
    parent: []
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
    else if (key === 'author') metadata.author = value
    else if (key === 'committer') metadata.committer = value
  }

  return {
    ...metadata,
    message: lines.slice(messageStart).join('\n').trim()
  }
}

// IPC Handler to load repository data
ipcMain.handle('git:get-objects', async (_event, repoPath: string) => {
  const objectsPath = join(repoPath, '.git', 'objects')
  const tagsPath = join(repoPath, '.git', 'refs', 'tags')
  const rootFolderName = repoPath.split(/[\\/]/).pop() || 'repository'
  // map to store diffs for commits: commitHash -> FileChange[]
  const commitDiffMap = new Map<string, { status: string; path: string; hash: string }[]>()
  try {
    // Execute git log to get all file changes for all commits
    // Format: "COMMIT:<HASH>" followed by raw diff lines
    // --raw gives us detailed lines with modes, object IDs and status, e.g.:
    //   :100644 100644 <old_sha> <new_sha> M	src/index.ts
    // --all ensures we see all branches (optional, depending on if you want reachable only)
    // --pretty=format:"COMMIT:%H" acts as a delimiter
    const { stdout } = await execAsync(
      `git log --all --raw --no-abbrev --pretty=format:"COMMIT:%H"`, 
      { cwd: repoPath, maxBuffer: 10 * 1024 * 1024 } // 10MB buffer for large logs
    )

    const lines = stdout.split('\n')
    let currentCommitHash: string | null = null

    for (const line of lines) {
      if (line.startsWith('COMMIT:')) {
        currentCommitHash = line.substring(7)
        commitDiffMap.set(currentCommitHash, [])
      } else if (currentCommitHash && line.trim()) {
        // Raw line example: :100644 100644 5716ca5... a012c34... M src/index.ts
        // Raw line example (regular): :100644 100644 5716ca5... a012c34... M	src/index.ts
        // Raw line example (rename):  :100644 100644 5716ca5... a012c34... R100	old/path.ts	new/path.ts
        if (line.startsWith(':')) {
          const parts = line.split('\t')
          const metaPart = parts[0] // :oldmode newmode old_sha new_sha status
          const pathParts = parts.slice(1) // one or more paths, depending on status
          const metaArr = metaPart.split(' ').filter(Boolean)
          // metaArr usually: [':oldmode', 'newmode', 'oldsha', 'newsha', 'status']
          if (metaArr.length >= 5) {
            const newSha = metaArr[3]
            console.log(newSha)
            const rawStatus = metaArr[4]
            // Normalize status to its leading letter (e.g. R100 -> R) while preserving semantics
            const status = rawStatus.charAt(0)
            let path: string | undefined
            if ((status === 'R' || status === 'C') && pathParts.length >= 2) {
              // Renames / copies have old and new paths: [oldPath, newPath]
              // const oldPath = pathParts[0]
              const newPath = pathParts[1]
              // For our purposes, track the new path as the current location
              path = newPath
              // If needed in the future, oldPath can be included in the diff structure
            } else if (pathParts.length >= 1) {
              // All other statuses have a single path (may still contain tabs inside the name)
              path = pathParts.join('\t')
            }
            // For deletions, newSha is 0000...; we still record the diff but consumers can ignore hash if needed.
            const diffs = commitDiffMap.get(currentCommitHash)
            if (diffs && path) {
              diffs.push({ status, path, hash: newSha })
            }
          }
        }
      }
    }
  } catch (error) {
    console.warn('Failed to load commit diffs via git cli:', error)
    // Continue without diffs if git command fails (e.g. empty repo)
  }
  if (!fs.existsSync(objectsPath)) {
    throw new Error('No .git/objects found')
  }

  const resultObjects: {
    hash: string
    type: string
    size: number
    names?: string[]
    objectHash?: string
    references?: string[]
    referencedBy: string[]
    object?: string
    content?: string
    entries?: { mode: string; name: string; hash: string; type: string }[]
    tree?: string
    parent?: string[]
    diff?: { status: string; path: string; hash: string }[]
  }[] = []

  // 1. Scan for loose object files (folders 00-ff)
  // Note: This does not read packed objects (.git/objects/pack), wrapped in try-catch for safety
  // TODO: In the future, implement reading from packfiles for a complete view of the repository objects
  try {
    // Read tags
    if (fs.existsSync(tagsPath)) {
      const tagFiles = await fs.promises.readdir(tagsPath)
      for (const file of tagFiles) {
        const filePath = join(tagsPath, file)
        try {
          const content = await fs.promises.readFile(filePath, 'utf8')
          const object = content.trim()
          resultObjects.push({
            hash: file,
            type: 'tag',
            size: 0,
            objectHash: object,
            references: [object],
            referencedBy: []
          })
        } catch (err) {
          console.warn(`Failed to read tag file ${file}`, err)
        }
      }
    }
    // Read objects
    const objectDirs = await fs.promises.readdir(objectsPath)

    for (const dir of objectDirs) {
      if (dir.length !== 2 || dir === 'in' || dir === 'pa') continue // skip info/pack folders TODO: read packed objects later

      const dirPath = join(objectsPath, dir)
      const files = await fs.promises.readdir(dirPath)

      for (const file of files) {
        const fullHash = dir + file
        const filePath = join(dirPath, file)

        try {
          const fileBuffer = await fs.promises.readFile(filePath)
          const inflated = zlib.inflateSync(fileBuffer)

          // Split header "type size\0" from content
          const nullIndex = inflated.indexOf(0)
          const header = inflated.subarray(0, nullIndex).toString('utf8')
          const [type, sizeStr] = header.split(' ')
          const size = parseInt(sizeStr)
          const contentBuffer = inflated.subarray(nullIndex + 1)
          let parsedContent: {
            names?: string[]
            content?: string
            entries?: { mode: string; name: string; hash: string; type: string }[]
            tree?: string
            parent?: string[]
          } = {}
          let references: string[] = []

          if (type === 'blob') {
            // Start of file logic, limit size for UI performance
            parsedContent = {
              names: [],
              content: size < 10000 ? contentBuffer.toString('utf8') : '(Binary or too large)'
            }
          } else if (type === 'tree') {
            const entries = parseTreeBuffer(contentBuffer)
            parsedContent = { 
              names: [],
              entries: entries 
            }
            references = entries.map((e) => e.hash)
          } else if (type === 'commit') {
            parsedContent = parseCommitContent(contentBuffer.toString('utf8'))
            if (parsedContent.tree) references.push(parsedContent.tree)
            if (parsedContent.parent) references.push(...parsedContent.parent)
          }

          resultObjects.push({
            hash: fullHash,
            type,
            size,
            references,
            referencedBy: [], // Will fill later
            diff: type === 'commit' ? (commitDiffMap.get(fullHash) || []) : undefined, 
            ...parsedContent
          })
        } catch (err) {
          console.warn(`Failed to parse object ${fullHash}`, err)
        }
      }
    }

    // 2. Second pass: Calculate referencedBy (Backlinks)
    const hashToObjMap = new Map(resultObjects.map((o) => [o.hash, o]))

    resultObjects.forEach((obj) => {
      // Handle references for backlinks
      if (obj.references && obj.references.length > 0) {
        obj.references.forEach((refHash) => {
          const target = hashToObjMap.get(refHash)
          if (target) {
            target.referencedBy.push(obj.hash)
          }
        })
      }

      // Populate blob names from tree entries
      if (obj.type === 'tree' && obj.entries) {
        obj.entries.forEach((entry) => {
          if (entry.type === 'blob' || entry.type === 'tree') {
            const targetObj = hashToObjMap.get(entry.hash)
            if (targetObj && targetObj.names) {
              // Avoid duplicates if multiple trees point to the same blob with the same name
              if (!targetObj.names.includes(entry.name)) {
                targetObj.names.push(entry.name)
              }
            }
          }
        })
      }
    })

    resultObjects.forEach((obj) => {
      // If tree has no names, means it is root tree, so we assign the root folder name
      if (obj.type === 'tree' && obj.names && obj.names.length === 0) {
        obj.names.push(rootFolderName)
      }
    })
    console.log(resultObjects)
    return resultObjects
  } catch (error) {
    console.error('Error scanning Git objects:', error)
    return []
  }
})

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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

ipcMain.handle('dialog:openDirectory', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory']
  })
  if (canceled) {
    return null
  } else {
    return filePaths[0]
  }
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
