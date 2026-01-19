import { GitBranch, AlertCircle, Clock } from 'lucide-react';

export function StatusBar() {
  return (
    <div className="h-6 bg-[#007acc] flex items-center justify-between px-3 text-xs text-white">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3 h-3" />
          <span>main</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          <span>Last fetch: 2 minutes ago</span>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <span>5 changes</span>
        <span>1 staged</span>
        <div className="flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3" />
          <span>0 conflicts</span>
        </div>
      </div>
    </div>
  );
}
