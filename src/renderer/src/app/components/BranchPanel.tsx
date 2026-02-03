import { GitBranch, Star, Check, Info } from 'lucide-react'
import { useAppSelector } from '../store/hooks'

interface Branch {
  name: string
  current: boolean
  lastCommit: string
  ahead: number
  behind: number
}

const mockBranches: Branch[] = [
  { name: 'main', current: true, lastCommit: 'a7f3c2e', ahead: 0, behind: 0 },
  { name: 'feature/dark-mode', current: false, lastCommit: 'd9e1f4c', ahead: 1, behind: 1 },
  { name: 'develop', current: false, lastCommit: 'b4e5d1a', ahead: 0, behind: 1 }
]

export function BranchPanel(): React.JSX.Element {
  const { headPointer } = useAppSelector((state) => state.git)
  return (
    <div className="w-64 bg-[#252526] border-r border-[#1e1e1e] p-3 overflow-auto">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
        <GitBranch className="w-4 h-4 text-green-400" />
        <h3 className="text-xs font-semibold text-gray-200">Branches</h3>
      </div>

      <div className="bg-green-500/5 border border-green-500/20 rounded p-2 mb-3">
        <div className="flex items-start gap-1.5">
          <Info className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-300 leading-relaxed">
            Branches are lightweight pointers to commits. They move forward as you make new commits.
          </p>
        </div>
      </div>

      <div className="space-y-1">
        {mockBranches.map((branch) => (
          <div
            key={branch.name}
            className={`p-2 rounded cursor-pointer transition-colors ${
              branch.current ? 'bg-blue-500/20 border border-blue-500/30' : 'hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {branch.current && <Check className="w-3 h-3 text-green-400" />}
              <span
                className={`text-xs flex-1 ${
                  branch.current ? 'text-blue-300 font-medium' : 'text-gray-300'
                }`}
              >
                {branch.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 pl-5">
              <code className="text-yellow-400">{branch.lastCommit}</code>
              {(branch.ahead > 0 || branch.behind > 0) && (
                <span className="text-xs">
                  {branch.ahead > 0 && <span className="text-green-400">↑{branch.ahead}</span>}
                  {branch.ahead > 0 && branch.behind > 0 && ' '}
                  {branch.behind > 0 && <span className="text-red-400">↓{branch.behind}</span>}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="flex items-center gap-2 mb-2">
          <Star className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-400">HEAD</span>
        </div>
        {headPointer && (
          <div className="pl-5">
            <code className="text-xs text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded">
              {headPointer}
            </code>
            <p className="text-xs text-gray-500 mt-1">refs/heads/{headPointer}</p>
          </div>
        )}
      </div>
    </div>
  )
}
