import { Minus, Square, X, Folder } from 'lucide-react';

export function TitleBar() {
  return (
    <div className="h-8 bg-[#323233] flex items-center justify-between px-2 select-none border-b border-[#1e1e1e]">
      <div className="flex items-center gap-2">
        <Folder className="w-4 h-4 text-gray-400" />
        <span className="text-xs text-gray-300">GitViz - /Users/developer/my-project</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="hover:bg-white/10 p-1 rounded transition-colors">
          <Minus className="w-3 h-3 text-gray-300" />
        </button>
        <button className="hover:bg-white/10 p-1 rounded transition-colors">
          <Square className="w-3 h-3 text-gray-300" />
        </button>
        <button className="hover:bg-red-600 p-1 rounded transition-colors">
          <X className="w-3 h-3 text-gray-300" />
        </button>
      </div>
    </div>
  );
}
