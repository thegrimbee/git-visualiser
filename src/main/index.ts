import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import * as zlib from 'zlib'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

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
function parseTreeBuffer(buffer: Buffer) {
  const entries: any[] = []
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
function parseCommitContent(content: string) {
  const lines = content.split('\n')
  const metadata: any = { parent: [] }
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
ipcMain.handle('git:load-repo', async (_event, repoPath: string) => {
  const objectsPath = join(repoPath, '.git', 'objects')
  if (!fs.existsSync(objectsPath)) {
    throw new Error('No .git/objects found')
  }

  const resultObjects: any[] = []
  
  // 1. Scan for loose object files (folders 00-ff)
  // Note: This does not read packed objects (.git/objects/pack), wrapped in try-catch for safety
  try {
    const objectDirs = await fs.promises.readdir(objectsPath)
    
    for (const dir of objectDirs) {
        if (dir.length !== 2 || dir === 'in' || dir === 'pa') continue // skip info/pack folders

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
                
                let parsedContent: any = {}
                let references: string[] = []

                if (type === 'blob') {
                    // Start of file logic, limit size for UI performance
                    parsedContent = { 
                      content: size < 10000 ? contentBuffer.toString('utf8') : '(Binary or too large)' 
                    }
                } else if (type === 'tree') {
                    const entries = parseTreeBuffer(contentBuffer)
                    parsedContent = { entries }
                    references = entries.map(e => e.hash)
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
                    ...parsedContent
                })

            } catch (err) {
                console.warn(`Failed to parse object ${fullHash}`, err)
            }
        }
    }

    // 2. Second pass: Calculate referencedBy (Backlinks)
    const hashToObjMap = new Map(resultObjects.map(o => [o.hash, o]))
    
    resultObjects.forEach(obj => {
        if (obj.references && obj.references.length > 0) {
            obj.references.forEach(refHash => {
                const target = hashToObjMap.get(refHash)
                if (target) {
                    target.referencedBy.push(obj.hash)
                }
            })
        }
    })
    console.log(resultObjects)
    return resultObjects

  } catch (error) {
    console.error('Error scanning Git objects:', error)
    return []
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
