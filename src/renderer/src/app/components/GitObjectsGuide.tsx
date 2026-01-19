import { BookOpen, GitCommit, FolderTree, FileText, ArrowRight } from 'lucide-react';

export function GitObjectsGuide() {
  return (
    <div className="bg-[#252526] border border-gray-700 rounded p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-gray-200">How Git Objects Work</h3>
      </div>
      
      <div className="space-y-3 text-xs text-gray-300">
        <div className="flex items-start gap-2">
          <GitCommit className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-blue-300 mb-1">Commit Object</p>
            <p className="text-gray-400 leading-relaxed">
              Points to a tree (the file structure), parent commit(s), and stores author, timestamp, and message.
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <FolderTree className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-green-300 mb-1">Tree Object</p>
            <p className="text-gray-400 leading-relaxed">
              Represents a directory. Contains references to blobs (files) and other trees (subdirectories).
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-2">
          <FileText className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-yellow-300 mb-1">Blob Object</p>
            <p className="text-gray-400 leading-relaxed">
              Stores file content. Identical files share the same blob, saving space.
            </p>
          </div>
        </div>
        
        <div className="pt-2 border-t border-gray-700">
          <div className="flex items-center gap-2 text-purple-300">
            <ArrowRight className="w-3 h-3" />
            <p className="font-medium">Object Relationships</p>
          </div>
          <p className="text-gray-400 leading-relaxed mt-1 ml-5">
            Commit → Tree → Blob forms the core structure. Each object is content-addressable: its hash is computed from its content.
          </p>
        </div>
      </div>
    </div>
  );
}
