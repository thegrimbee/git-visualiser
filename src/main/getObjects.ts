import { ipcMain } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'
import { parseTreeBuffer, parseCommitContent } from './parser'
import * as zlib from 'zlib'

const execAsync = promisify(exec)

export function registerGetObjectsHandler(): void {
  ipcMain.handle('git:get-objects', async (_event, repoPath: string) => {
    const objectsPath = join(repoPath, '.git', 'objects')
    const tagsPath = join(repoPath, '.git', 'refs', 'tags')
    const rootFolderName = repoPath.split(/[\\/]/).pop() || 'repository'
    // map to store diffs for commits: commitHash -> FileChange[]
    const commitDiffMap = new Map<string, { status: string; path: string; hash: string; content: string }[]>()

    // const diffContentPromises: Promise<void>[] = []
    // const diffTasks: { commitHash: string; path: string; diffEntry: { content: string } }[] = []

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
                const diffEntry = { status, path, hash: newSha, content: '' }
                diffs.push(diffEntry)
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
      diff?: { status: string; path: string; hash: string; content: string }[]
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
              objectHash?: string
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
            } else if (type === 'tag') {
              const objectHash = contentBuffer.toString('utf8').split('\n')[0].split(' ')[1]
              parsedContent = { objectHash }
              references = [objectHash]
            }

            resultObjects.push({
              hash: fullHash,
              type,
              size,
              references,
              referencedBy: [], // Will fill later
              ...parsedContent,
              ...(type === 'commit' ? { diff: commitDiffMap.get(fullHash) || [] } : {})
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
}