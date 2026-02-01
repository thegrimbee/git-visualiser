import { useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@renderer/app/store/hooks';
import { setRepository, closeRepository } from '@renderer/app/store/slices/gitSlice';
import { FolderOpen, HardDrive, X, Clock, GitBranch, GitCommit } from 'lucide-react';

export function Repository() {
  const dispatch = useAppDispatch();
  const { repoPath, repoName, isRepoLoaded, objects } = useAppSelector((state) => state.git);
  
  // Ref for the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      // In Electron/Chrome with webkitdirectory, the first file usually contains the full path info
      // or we can infer the root folder name
      const file = files[0];
      
      // Note: In a real Electron app, 'path' property exposes the full system path.
      // In a browser, this might be faked or limited.
      const fullPath = 'path' in file ? (file as any).path : file.webkitRelativePath.split('/')[0];
      
      // Get folder name
      const folderName = file.webkitRelativePath 
        ? file.webkitRelativePath.split('/')[0] 
        : fullPath.split(/[\\/]/).pop();

      dispatch(setRepository({
        path: fullPath,
        name: folderName || 'Untitled Repo'
      }));
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const commitCount = objects.filter(o => o.type === 'commit').length;

  if (!isRepoLoaded) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#1e1e1e] p-8 text-center">
        <div className="bg-[#252526] p-8 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FolderOpen className="w-8 h-8 text-blue-400" />
          </div>
          
          <h2 className="text-xl font-semibold text-white mb-2">Open a Repository</h2>
          <p className="text-gray-400 text-sm mb-8">
            Select a local folder containing a .git repository to visualize its history and objects.
          </p>
          
          <button
            onClick={triggerFileSelect}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
          >
            <HardDrive className="w-4 h-4" />
            Browse Folders
          </button>
          
          <div className="mt-6 pt-6 border-t border-gray-700 text-left">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Recent</p>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2 hover:bg-white/5 rounded cursor-pointer group">
                <FolderOpen className="w-4 h-4 text-gray-500 group-hover:text-gray-300" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">git-visualiser</p>
                  <p className="text-xs text-gray-600 truncate">d:/Education/CS3281/git-visualiser</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Hidden Input for Directory Selection */}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFolderSelect}
          style={{ display: 'none' }}
          // @ts-ignore - 'webkitdirectory' is non-standard but supported in Electron/Chrome
          webkitdirectory="" 
          directory=""
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            {repoName}
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
              Active
            </span>
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-mono">{repoPath}</p>
        </div>
        
        <button 
          onClick={() => dispatch(closeRepository())}
          className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-gray-700 text-gray-300 text-xs rounded transition-colors flex items-center gap-2"
        >
          <X className="w-3 h-3" />
          Close Repository
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#252526] p-4 rounded border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded">
              <GitCommit className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-gray-400 text-sm">Total Commits</span>
          </div>
          <p className="text-2xl font-bold text-white pl-1">{commitCount}</p>
        </div>

        <div className="bg-[#252526] p-4 rounded border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded">
              <GitBranch className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-gray-400 text-sm">Branches</span>
          </div>
          <p className="text-2xl font-bold text-white pl-1">3</p>
        </div>

        <div className="bg-[#252526] p-4 rounded border border-gray-700">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-500/10 rounded">
              <Clock className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-gray-400 text-sm">Last Modified</span>
          </div>
          <p className="text-lg font-medium text-white pl-1 mt-1">Just now</p>
        </div>
      </div>
      
      <div className="flex-1 bg-[#252526] rounded border border-gray-700 p-6 flex items-center justify-center text-center">
        <div className="max-w-md">
           <h3 className="text-lg font-medium text-white mb-2">Repository Ready</h3>
           <p className="text-gray-400 text-sm">
             Head over to the <b>Objects</b> or <b>Commits</b> tab to inspect the internal Git structure of this repository.
           </p>
        </div>
      </div>
    </div>
  );
}