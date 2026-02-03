import { GitBranch, GitCommit, Info } from 'lucide-react'

interface Commit {
  hash: string
  message: string
  author: string
  date: string
  branch: string
  parents: string[]
}

const mockCommits: Commit[] = [
  {
    hash: 'a7f3c2e',
    message: 'Add user authentication',
    author: 'Alice',
    date: '2 hours ago',
    branch: 'main',
    parents: ['b4e5d1a']
  },
  {
    hash: 'b4e5d1a',
    message: 'Update README.md',
    author: 'Bob',
    date: '5 hours ago',
    branch: 'main',
    parents: ['c8f2a3b']
  },
  {
    hash: 'd9e1f4c',
    message: 'Feature: dark mode toggle',
    author: 'Alice',
    date: '6 hours ago',
    branch: 'feature/dark-mode',
    parents: ['c8f2a3b']
  },
  {
    hash: 'c8f2a3b',
    message: 'Fix: navbar responsive issues',
    author: 'Charlie',
    date: '1 day ago',
    branch: 'main',
    parents: ['e2a4c7d']
  },
  {
    hash: 'e2a4c7d',
    message: 'Initial commit',
    author: 'Alice',
    date: '3 days ago',
    branch: 'main',
    parents: []
  }
]

export function CommitGraph(): React.JSX.Element {
  return (
    <div className="flex-1 bg-[#1e1e1e] p-4 overflow-auto">
      <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-700">
        <GitCommit className="w-5 h-5 text-blue-400" />
        <h2 className="text-sm font-semibold text-gray-200">Commit History</h2>
      </div>

      <div className="bg-blue-500/5 border border-blue-500/20 rounded p-3 mb-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-300 leading-relaxed">
            <p className="mb-1">
              Each commit is a snapshot of your project. Commits form a directed acyclic graph (DAG)
              where:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-400 ml-2">
              <li>Each commit points to its parent(s)</li>
              <li>Branches are just pointers to commits</li>
              <li>Merging creates commits with multiple parents</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        {mockCommits.map((commit, index) => (
          <div
            key={commit.hash}
            className="flex items-start gap-3 hover:bg-white/5 p-2 rounded transition-colors"
          >
            <div className="flex flex-col items-center pt-1">
              <div
                className={`w-3 h-3 rounded-full ${
                  commit.branch === 'main' ? 'bg-blue-500' : 'bg-purple-500'
                } ring-2 ring-[#1e1e1e]`}
              />
              {index < mockCommits.length - 1 && (
                <div
                  className={`w-0.5 h-8 ${
                    commit.branch === 'main' ? 'bg-blue-500/30' : 'bg-purple-500/30'
                  }`}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <code className="text-xs text-yellow-400 font-mono bg-yellow-400/10 px-1.5 py-0.5 rounded">
                  {commit.hash}
                </code>
                <span className="text-xs text-gray-400">{commit.date}</span>
                <div className="flex items-center gap-1 ml-auto">
                  <GitBranch className="w-3 h-3 text-gray-400" />
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      commit.branch === 'main'
                        ? 'bg-blue-500/20 text-blue-300'
                        : 'bg-purple-500/20 text-purple-300'
                    }`}
                  >
                    {commit.branch}
                  </span>
                </div>
              </div>
              <p className="text-sm text-gray-200 mb-1">{commit.message}</p>
              <p className="text-xs text-gray-500">by {commit.author}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
