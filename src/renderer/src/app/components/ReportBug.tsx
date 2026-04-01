import { Bug, ExternalLink } from 'lucide-react'

const ISSUE_URL = 'https://github.com/git-visor/desktop-app/issues/new?labels=bug&type=bug'

export function ReportBug(): React.JSX.Element {
  return (
    <div className="h-full bg-[#1e1e1e] text-gray-200 p-6 overflow-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Bug className="w-6 h-6 text-red-400" />
          <h1 className="text-xl font-semibold text-white">Report a Bug</h1>
        </div>

        <p className="text-sm text-gray-400">
          Found something broken? Open a GitHub issue with details so it can be reproduced and fixed.
        </p>

        <div className="rounded-md border border-[#333] bg-[#252526] p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">Before submitting</h2>
          <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
            <li>Describe what you expected vs what happened.</li>
            <li>Include the repository path and branch you were using.</li>
            <li>Add screenshots or logs if available.</li>
          </ul>
        </div>

        <a
          href={ISSUE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-sm font-medium transition-colors"
        >
          Open GitHub Issue
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}