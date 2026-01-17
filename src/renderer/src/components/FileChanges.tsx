import { File, FilePlus, FileEdit, FileX, Plus, Minus, Info } from 'lucide-react';

interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'staged';
  additions: number;
  deletions: number;
}

const mockChanges: FileChange[] = [
  { path: 'src/components/Auth.tsx', status: 'staged', additions: 45, deletions: 8 },
  { path: 'src/utils/api.ts', status: 'modified', additions: 12, deletions: 3 },
  { path: 'README.md', status: 'modified', additions: 5, deletions: 2 },
  { path: 'src/components/Login.tsx', status: 'added', additions: 67, deletions: 0 },
  { path: 'old-config.json', status: 'deleted', additions: 0, deletions: 24 },
];

export function FileChanges() {
  const stagedFiles = mockChanges.filter(f => f.status === 'staged');
  const unstagedFiles = mockChanges.filter(f => f.status !== 'staged');
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added': return <FilePlus className="w-3 h-3 text-green-400" />;
      case 'modified': return <FileEdit className="w-3 h-3 text-yellow-400" />;
      case 'deleted': return <FileX className="w-3 h-3 text-red-400" />;
      case 'staged': return <File className="w-3 h-3 text-blue-400" />;
      default: return <File className="w-3 h-3 text-gray-400" />;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added': return 'text-green-400';
      case 'modified': return 'text-yellow-400';
      case 'deleted': return 'text-red-400';
      case 'staged': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };
  
  return (
    <div className="flex-1 bg-[#1e1e1e] p-4 overflow-auto">
      <div className="bg-green-500/5 border border-green-500/20 rounded p-3 mb-4">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-gray-300 leading-relaxed">
            <p className="mb-1">Git tracks changes in three areas:</p>
            <ul className="list-disc list-inside space-y-0.5 text-gray-400 ml-2">
              <li><strong className="text-gray-300">Working Directory:</strong> Your modified files</li>
              <li><strong className="text-gray-300">Staging Area (Index):</strong> Changes ready for commit</li>
              <li><strong className="text-gray-300">Repository:</strong> Committed snapshots</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
          <File className="w-4 h-4 text-green-400" />
          <h3 className="text-xs font-semibold text-gray-200">Staged Changes</h3>
          <span className="text-xs text-gray-500">({stagedFiles.length})</span>
        </div>
        
        <div className="space-y-1">
          {stagedFiles.map((file) => (
            <div key={file.path} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded transition-colors">
              {getStatusIcon(file.status)}
              <span className="text-xs text-gray-300 flex-1 font-mono">{file.path}</span>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-green-400">
                  <Plus className="w-3 h-3" />
                  {file.additions}
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <Minus className="w-3 h-3" />
                  {file.deletions}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
          <FileEdit className="w-4 h-4 text-yellow-400" />
          <h3 className="text-xs font-semibold text-gray-200">Unstaged Changes</h3>
          <span className="text-xs text-gray-500">({unstagedFiles.length})</span>
        </div>
        
        <div className="space-y-1">
          {unstagedFiles.map((file) => (
            <div key={file.path} className="flex items-center gap-2 p-2 hover:bg-white/5 rounded transition-colors">
              {getStatusIcon(file.status)}
              <span className={`text-xs flex-1 font-mono ${getStatusColor(file.status)}`}>
                {file.path}
              </span>
              <div className="flex items-center gap-2 text-xs">
                {file.additions > 0 && (
                  <span className="flex items-center gap-1 text-green-400">
                    <Plus className="w-3 h-3" />
                    {file.additions}
                  </span>
                )}
                {file.deletions > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <Minus className="w-3 h-3" />
                    {file.deletions}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}