import { ipcMain } from 'electron'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import { parseAnnotatedTagContent, parseCommitContent, parseTreeBuffer } from './parser'
import { once } from 'events'

const execAsync = promisify(execFile)

type BatchObjectRecord =
  | {
      hash: string
      type: string
      size: number
      content: Buffer
    }
  | {
      hash: string
      missing: true
    }

function parseCatFileBatchOutput(buffer: Buffer): Map<string, BatchObjectRecord> {
  const out = new Map<string, BatchObjectRecord>()
  let cursor = 0

  while (cursor < buffer.length) {
    const headerEnd = buffer.indexOf(0x0a, cursor) // '\n'
    if (headerEnd === -1) break

    const header = buffer.subarray(cursor, headerEnd).toString('utf8')
    cursor = headerEnd + 1

    if (!header) continue

    if (header.endsWith(' missing')) {
      const [hash] = header.split(' ')
      out.set(hash, { hash, missing: true })
      continue
    }

    const [hash, type, sizeStr] = header.split(' ')
    const size = Number(sizeStr)
    if (!hash || !type || !Number.isFinite(size) || size < 0) {
      throw new Error(`Invalid cat-file --batch header: ${header}`)
    }

    const end = cursor + size
    if (end > buffer.length) {
      throw new Error('Truncated cat-file --batch payload')
    }

    const content = buffer.subarray(cursor, end)
    cursor = end

    // Each payload is followed by one '\n'
    if (cursor < buffer.length && buffer[cursor] === 0x0a) cursor += 1

    out.set(hash, { hash, type, size, content })
  }

  return out
}

async function runCatFileBatch(
  repoPath: string,
  hashes: string[]
): Promise<Map<string, BatchObjectRecord>> {
  if (hashes.length === 0) return new Map()

  const proc = spawn('git', ['cat-file', '--batch'], {
    cwd: repoPath,
    stdio: ['pipe', 'pipe', 'pipe']
  })

  const stdoutChunks: Buffer[] = []
  const stderrChunks: Buffer[] = []
  let totalStdout = 0
  const maxStdoutBytes = 200 * 1024 * 1024 // safety cap

  proc.stdout.on('data', (chunk: Buffer) => {
    totalStdout += chunk.length
    if (totalStdout > maxStdoutBytes) {
      proc.kill()
      return
    }
    stdoutChunks.push(chunk)
  })

  proc.stderr.on('data', (chunk: Buffer) => {
    stderrChunks.push(chunk)
  })

  // Feed all requested hashes in one stream.
  proc.stdin.write(hashes.join('\n') + '\n')
  proc.stdin.end()

  const [code] = (await once(proc, 'close')) as [number | null]

  if (code !== 0) {
    const stderr = Buffer.concat(stderrChunks).toString('utf8')
    throw new Error(`git cat-file --batch failed (code ${code ?? 'null'}): ${stderr}`)
  }

  if (totalStdout > maxStdoutBytes) {
    throw new Error('Repository is too large to load with current buffer limits.')
  }

  return parseCatFileBatchOutput(Buffer.concat(stdoutChunks))
}

function isMaxBufferExceeded(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; message?: string }
  return (
    e.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER' ||
    /maxBuffer|stdout maxBuffer|stderr maxBuffer/i.test(e.message ?? '')
  )
}

export function registerGetObjectsHandler(): void {
  ipcMain.handle('git:get-objects', async (_event, repoPath: string) => {
    const rootFolderName = repoPath.split(/[\\/]/).pop() || 'repository'
    // map to store diffs for commits: commitHash -> FileChange[]
    const commitDiffMap = new Map<
      string,
      { status: string; path: string; hash: string; content: string }[]
    >()

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
        'git',
        ['log', '--all', '--raw', '--no-abbrev', '--pretty=format:COMMIT:%H'],
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
      if (isMaxBufferExceeded(error)) {
        throw new Error('Repository is too large to load with current buffer limits.')
      }
      console.warn('Failed to load commit diffs via git cli:', error)
    }
    const resultObjects: {
      hash: string
      type: string
      size: number
      names?: string[]
      objectHash?: string
      tagName?: string
      objectType?: 'commit' | 'tree' | 'blob' | 'tag'
      tagger?: string
      message?: string
      timestamp?: number
      references?: string[]
      referencedBy: string[]
      object?: string
      content?: string
      entries?: { mode: string; name: string; hash: string; type: string }[]
      tree?: string
      parent?: string[]
      diff?: { status: string; path: string; hash: string; content: string }[]
    }[] = []

    // 1. Discover objects via git plumbing (includes loose objects, packs, and alternates)
    try {
      const { stdout: allObjectsStdout } = await execAsync(
        'git',
        [
          'cat-file',
          '--batch-all-objects',
          '--batch-check=%(objectname) %(objecttype) %(objectsize)',
          '--unordered'
        ],
        { cwd: repoPath, maxBuffer: 100 * 1024 * 1024 }
      )

      const objectMetaLines = allObjectsStdout
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      const batchHashes = objectMetaLines
        .map((line) => {
          const [hash, type, sizeStr] = line.split(' ')
          const size = Number(sizeStr)
          if (!hash || !type || !Number.isFinite(size)) return null

          // Skip large blobs in initial load (same behavior as current code).
          if (type === 'blob' && size >= 10000) return null

          if (type === 'blob' || type === 'tree' || type === 'commit' || type === 'tag') {
            return hash
          }
          return null
        })
        .filter((h): h is string => Boolean(h))

      const batchMap = await runCatFileBatch(repoPath, batchHashes)

      for (const line of objectMetaLines) {
        const [hash, type, sizeStr] = line.split(' ')
        const size = Number(sizeStr)
        if (!hash || !type || !Number.isFinite(size)) continue

        let parsedContent: {
          names?: string[]
          content?: string
          entries?: { mode: string; name: string; hash: string; type: string }[]
          tree?: string
          parent?: string[]
          objectHash?: string
        } = {}
        let references: string[] = []

        try {
          if (type === 'blob') {
            parsedContent = { names: [] }
            if (size >= 10000) {
              parsedContent.content = '(Binary or too large)'
            } else {
              const batchEntry = batchMap.get(hash)
              if (!batchEntry || 'missing' in batchEntry) continue
              parsedContent.content = batchEntry.content.toString('utf8')
            }
          } else if (type === 'tree') {
            const batchEntry = batchMap.get(hash)
            if (!batchEntry || 'missing' in batchEntry) continue
            const entries = parseTreeBuffer(batchEntry.content)
            parsedContent = { names: [], entries }
            references = entries.map((entry) => entry.hash)
          } else if (type === 'commit') {
            const batchEntry = batchMap.get(hash)
            if (!batchEntry || 'missing' in batchEntry) continue
            parsedContent = parseCommitContent(batchEntry.content.toString('utf8'))
            if (parsedContent.tree) references.push(parsedContent.tree)
            if (parsedContent.parent) references.push(...parsedContent.parent)
          } else if (type === 'tag') {
            const batchEntry = batchMap.get(hash)
            if (!batchEntry || 'missing' in batchEntry) continue
            parsedContent = parseAnnotatedTagContent(batchEntry.content.toString('utf8'))
            if (parsedContent.objectHash) references.push(parsedContent.objectHash)
          } else {
            continue
          }

          resultObjects.push({
            hash,
            type,
            size,
            references,
            referencedBy: [], // Will fill later
            ...parsedContent,
            ...(type === 'commit' ? { diff: commitDiffMap.get(hash) || [] } : {})
          })
        } catch (err) {
          console.warn(`Failed to parse object ${hash}`, err)
        }
      }

      // Handling lightweight tags
      try {
        const { stdout: tagRefsStdout } = await execAsync(
          'git',
          [
            'for-each-ref',
            '--format=%(refname:short)%00%(objectname)%00%(objecttype)',
            'refs/tags'
          ],
          { cwd: repoPath, maxBuffer: 20 * 1024 * 1024 }
        )

        const tagRefLines = tagRefsStdout.split('\n').filter(Boolean)

        for (const line of tagRefLines) {
          const [tagName, objectHash, objectTypeRaw] = line.split('\0')

          if (!tagName || !objectHash) continue
          if (objectTypeRaw === 'tag') continue // annotated tags already included as real tag objects

          if (objectTypeRaw !== 'commit' && objectTypeRaw !== 'tree' && objectTypeRaw !== 'blob') {
            continue
          }
          resultObjects.push({
            hash: tagName,
            type: 'tag',
            size: 0,
            tagName,
            objectHash,
            objectType: objectTypeRaw,
            references: [objectHash],
            referencedBy: []
          })
        }
      } catch (error) {
        if (isMaxBufferExceeded(error)) {
          throw new Error('Repository is too large to load with current buffer limits.')
        }
        console.warn('Failed to load lightweight tags via git cli:', error)
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
      return resultObjects
    } catch (error) {
      if (isMaxBufferExceeded(error)) {
        throw new Error('Repository is too large to load with current buffer limits.')
      }
      console.error('Error scanning Git objects:', error)
      return []
    }
  })
}
