import type React from 'react'

export function Legend(): React.JSX.Element {
  return (
    <div className="absolute bottom-4 left-4 bg-[#252526] border border-gray-700 rounded p-3 text-xs text-gray-400 shadow-xl pointer-events-none opacity-80">
      <p className="mb-2 font-semibold">Git Objects:</p>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full bg-blue-600"></div>
        <span>Commit</span>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-3 h-3 rounded-full bg-green-600"></div>
        <span>Tree (Folder)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
        <span>Blob (File)</span>
      </div>
      <div className="mt-2 text-[10px] text-gray-500">Drag to Pan • Click to Inspect</div>
    </div>
  )
}