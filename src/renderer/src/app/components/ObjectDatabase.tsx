import { Database, Package, FileText, GitCommit, FolderTree, ArrowRight, Info } from 'lucide-react';
import { ObjectDetail } from './ObjectDetail';
import { ObjectGraph } from './ObjectGraph';
import { GitObjectsGuide } from './GitObjectsGuide';
import { useAppDispatch, useAppSelector } from '@renderer/app/store/hooks';
import { setSelectedObject, setView, setShowGuide } from '@renderer/app/store/slices/gitSlice';

export interface GitObject {
  hash: string;
  type: 'commit' | 'tree' | 'blob' | 'tag';
  size: number;
  content?: string;
  references?: string[];
  referencedBy?: string[];
}

export interface CommitObject extends GitObject {
  type: 'commit';
  tree: string;
  parent?: string[];
  author: string;
  message: string;
  timestamp: string;
}

export interface TreeObject extends GitObject {
  type: 'tree';
  entries: Array<{
    mode: string;
    type: 'blob' | 'tree';
    hash: string;
    name: string;
  }>;
}

export interface BlobObject extends GitObject {
  type: 'blob';
  content: string;
  path?: string;
}

export const mockObjects: Array<CommitObject | TreeObject | BlobObject | GitObject> = [
  {
    hash: 'a7f3c2e4d8b9a1c5',
    type: 'commit',
    size: 256,
    tree: 'e7a3f2d8c1b5e4a9',
    parent: ['b4e5d1a3c7f2e8b9'],
    author: 'Alice <alice@example.com>',
    message: 'Add user authentication',
    timestamp: '2026-01-15 14:30:00',
    referencedBy: [],
  } as CommitObject,
  {
    hash: 'b4e5d1a3c7f2e8b9',
    type: 'commit',
    size: 243,
    tree: 'f1d4e8a2c9b6f3e7',
    parent: ['c8f2a3b1e5d7a9c4'],
    author: 'Bob <bob@example.com>',
    message: 'Update README.md',
    timestamp: '2026-01-15 11:15:00',
    referencedBy: ['a7f3c2e4d8b9a1c5'],
  } as CommitObject,
  {
    hash: 'c8f2a3b1e5d7a9c4',
    type: 'commit',
    size: 251,
    tree: 'f1d4e8a2c9b6f3e7',
    parent: [],
    author: 'Alice <alice@example.com>',
    message: 'Initial commit',
    timestamp: '2026-01-12 09:00:00',
    referencedBy: ['b4e5d1a3c7f2e8b9'],
  } as CommitObject,
  {
    hash: 'e7a3f2d8c1b5e4a9',
    type: 'tree',
    size: 128,
    entries: [
      { mode: '100644', type: 'blob', hash: 'c2a6d9e3f7b1d4a8', name: 'Auth.tsx' },
      { mode: '100644', type: 'blob', hash: 'a9d3f6e2b8c4d1a7', name: 'Login.tsx' },
      { mode: '040000', type: 'tree', hash: 'f1d4e8a2c9b6f3e7', name: 'utils' },
    ],
    referencedBy: ['a7f3c2e4d8b9a1c5'],
  } as TreeObject,
  {
    hash: 'f1d4e8a2c9b6f3e7',
    type: 'tree',
    size: 96,
    entries: [
      { mode: '100644', type: 'blob', hash: 'b1c8e4d9a3f7b2e6', name: 'api.ts' },
      { mode: '100644', type: 'blob', hash: 'd5e2a8f3c7b4d9a1', name: 'README.md' },
    ],
    referencedBy: ['b4e5d1a3c7f2e8b9', 'c8f2a3b1e5d7a9c4', 'e7a3f2d8c1b5e4a9'],
  } as TreeObject,
  {
    hash: 'c2a6d9e3f7b1d4a8',
    type: 'blob',
    size: 1847,
    path: 'src/components/Auth.tsx',
    content: `import { useState } from 'react';
import { login, logout } from '@renderer/utils/api';

export function Auth() {
  const [user, setUser] = useState(null);
  
  const handleLogin = async (email: string, password: string) => {
    const result = await login(email, password);
    setUser(result.user);
  };
  
  return (
    <div>
      {user ? (
        <button onClick={() => logout()}>Logout</button>
      ) : (
        <LoginForm onSubmit={handleLogin} />
      )}
    </div>
  );
}`,
    referencedBy: ['e7a3f2d8c1b5e4a9'],
  } as BlobObject,
  {
    hash: 'a9d3f6e2b8c4d1a7',
    type: 'blob',
    size: 2134,
    path: 'src/components/Login.tsx',
    content: `import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export function LoginForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      onSubmit(email, password);
    }}>
      <Input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <Input 
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <Button type="submit">Login</Button>
    </form>
  );
}`,
    referencedBy: ['e7a3f2d8c1b5e4a9'],
  } as BlobObject,
  {
    hash: 'b1c8e4d9a3f7b2e6',
    type: 'blob',
    size: 892,
    path: 'src/utils/api.ts',
    content: `const API_URL = 'https://api.example.com';

export async function login(email: string, password: string) {
  const response = await fetch(\`\${API_URL}/auth/login\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
}

export async function logout() {
  await fetch(\`\${API_URL}/auth/logout\`, { method: 'POST' });
}`,
    referencedBy: ['f1d4e8a2c9b6f3e7'],
  } as BlobObject,
  {
    hash: 'd5e2a8f3c7b4d9a1',
    type: 'blob',
    size: 543,
    path: 'README.md',
    content: `# My Project

A simple authentication application.

## Features
- User login
- User logout
- Session management

## Installation
\`\`\`bash
npm install
npm start
\`\`\``,
    referencedBy: ['f1d4e8a2c9b6f3e7'],
  } as BlobObject,
];

export function ObjectDatabase() {
  const dispatch = useAppDispatch();
  const selectedObject = useAppSelector((state) => state.git.selectedObject);
  const view = useAppSelector((state) => state.git.view);
  const showGuide = useAppSelector((state) => state.git.showGuide);
  const objects = useAppSelector((state) => state.git.objects);
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'commit': return <GitCommit className="w-3 h-3 text-blue-400" />;
      case 'tree': return <FolderTree className="w-3 h-3 text-green-400" />;
      case 'blob': return <FileText className="w-3 h-3 text-yellow-400" />;
      case 'tag': return <Package className="w-3 h-3 text-purple-400" />;
      default: return <Database className="w-3 h-3 text-gray-400" />;
    }
  };
  
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'commit': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'tree': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'blob': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'tag': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };
  
  const formatSize = (bytes: number) => {
    return `${bytes} bytes`;
  };
  
  const objectCounts = objects.reduce((acc, obj) => {
    acc[obj.type] = (acc[obj.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return (
    <div className="flex-1 flex bg-[#1e1e1e] overflow-hidden">
      <div className="w-96 border-r border-gray-700 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-700 flex-shrink-0 overflow-y-auto max-h-[50vh]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              <h2 className="text-sm font-semibold text-gray-200">Git Objects</h2>
            </div>
            
            <div className="flex items-center gap-1 bg-[#252526] rounded p-0.5">
              <button
                onClick={() => dispatch(setView('list'))}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  view === 'list' ? 'bg-blue-500/20 text-blue-300' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                List
              </button>
              <button
                onClick={() => dispatch(setView('graph'))}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  view === 'graph' ? 'bg-blue-500/20 text-blue-300' : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Graph
              </button>
            </div>
          </div>
          
          {showGuide && <GitObjectsGuide />}
          
          <div className="bg-blue-500/5 border border-blue-500/20 rounded p-3 mb-3">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-300 leading-relaxed">
                Git stores everything as objects. Click on any object to explore how they reference each other.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <GitCommit className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-gray-400">Commits</span>
              </div>
              <span className="text-lg font-semibold text-blue-300">{objectCounts.commit || 0}</span>
            </div>
            
            <div className="bg-green-500/10 border border-green-500/20 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <FolderTree className="w-3 h-3 text-green-400" />
                <span className="text-xs text-gray-400">Trees</span>
              </div>
              <span className="text-lg font-semibold text-green-300">{objectCounts.tree || 0}</span>
            </div>
            
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <FileText className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-gray-400">Blobs</span>
              </div>
              <span className="text-lg font-semibold text-yellow-300">{objectCounts.blob || 0}</span>
            </div>
            
            <div className="bg-purple-500/10 border border-purple-500/20 rounded p-2">
              <div className="flex items-center gap-1 mb-1">
                <Package className="w-3 h-3 text-purple-400" />
                <span className="text-xs text-gray-400">Tags</span>
              </div>
              <span className="text-lg font-semibold text-purple-300">{objectCounts.tag || 0}</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1 min-h-0 overflow-auto p-4">
          {view === 'list' ? (
            <div className="space-y-1">
              {objects.map((obj) => (
                <div
                  key={obj.hash}
                  onClick={() => dispatch(setSelectedObject(obj))}
                  className={`flex items-center gap-2 p-2 rounded transition-colors cursor-pointer ${
                    selectedObject?.hash === obj.hash 
                      ? 'bg-blue-500/20 border border-blue-500/30' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  {getTypeIcon(obj.type)}
                  <code className="text-xs text-gray-400 font-mono flex-1 truncate">{obj.hash}</code>
                  <span className={`text-xs px-2 py-0.5 rounded border ${getTypeColor(obj.type)}`}>
                    {obj.type}
                  </span>
                  {selectedObject?.hash === obj.hash && (
                    <ArrowRight className="w-3 h-3 text-blue-400" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <ObjectGraph 
              objects={objects} 
              selectedHash={selectedObject?.hash}
              onSelectObject={(hash) => {
                const obj = objects.find(o => o.hash === hash);
                if (obj) dispatch(setSelectedObject(obj));
              }}
            />
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {selectedObject ? (
          <ObjectDetail 
            object={selectedObject} 
            allObjects={objects}
            onSelectObject={(hash) => {
              const obj = objects.find(o => o.hash === hash);
              if (obj) dispatch(setSelectedObject(obj));
            }}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Database className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Select an object to view details</p>
              <p className="text-xs text-gray-500 mt-1">Click on any object in the list to explore</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}