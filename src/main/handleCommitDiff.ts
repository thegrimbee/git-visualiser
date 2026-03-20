import { ipcMain } from 'electron'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

async function processWithConcurrencyLimit<T>(
  items: T[], 
  limit: number, 
  task: (item: T) => Promise<void>
): Promise<void> {
  const total = items.length;
  let currentIndex = 0;
  const workerCount = Math.min(limit, total);
  const workers = Array(workerCount)
    .fill(null)
    .map(async () => {
      while (true) {
        const index = currentIndex++;
        if (index >= total) {
          break;
        }
        const item = items[index];
        if (item) {
          await task(item);
        }
      }
    });
  await Promise.all(workers);
}

async function getCommitDiff(repoPath: string, commitHash: string, filePath: string): Promise<string | null> {
  try {
    // git show --format="" --patch <commit> -- <path> gets the isolated diff for a file
    const { stdout } = await execFileAsync(
      'git',
      ['show', '--format=', '-U0', '--patch', commitHash, '--', filePath],
      { 
        cwd: repoPath, 
        maxBuffer: 50 * 1024 * 1024
      }
    )
    return stdout
  } catch (error) {
    console.warn('Failed to get diff:', error)
    return null
  }
}

export function registerGetCommitDiffHandler(): void {
  ipcMain.handle('git:get-commit-diff', async (_event, repoPath: string, commitHash: string, filePath: string) => {
    return await getCommitDiff(repoPath, commitHash, filePath)
  })
}

export function registerGetBatchCommitDiffsHandler(): void {
  ipcMain.handle('git:get-batch-commit-diffs', async (_event, repoPath: string, requests: { commitHash: string; filePath: string }[]) => {
    const results: {
      commitHash: string;
      filePath: string;
      content: string | null
    }[] = new Array(requests.length)
    const indexedRequests = requests.map((req, index) => ({ req, index }))
    await processWithConcurrencyLimit(indexedRequests, 10, async ({ req, index }) => {
      try {
        const content = await getCommitDiff(repoPath, req.commitHash, req.filePath)
        results[index] = { ...req, content }
      } catch (err) {
        console.error(`Failed to fetch diff for ${req.filePath} in ${req.commitHash}:`, err)
        results[index] = { ...req, content: null }
      }
    })

    return results
  })
}