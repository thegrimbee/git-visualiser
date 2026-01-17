import { useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { BranchPanel } from './components/BranchPanel';
import { CommitGraph } from './components/CommitGraph';
import { FileChanges } from './components/FileChanges';
import { ObjectDatabase } from './components/ObjectDatabase';
import { StatusBar } from './components/StatusBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { GitCommit, FileText, Database } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('commits');
  
  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] overflow-hidden">
      <TitleBar />
      
      <div className="flex-1 flex overflow-hidden">
        <BranchPanel />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="bg-[#252526] border-b border-[#1e1e1e] px-2">
              <TabsList className="h-10 bg-transparent gap-1">
                <TabsTrigger 
                  value="commits" 
                  className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white text-gray-400 text-xs gap-2"
                >
                  <GitCommit className="w-4 h-4" />
                  Commits
                </TabsTrigger>
                <TabsTrigger 
                  value="changes" 
                  className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white text-gray-400 text-xs gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Changes
                </TabsTrigger>
                <TabsTrigger 
                  value="objects" 
                  className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white text-gray-400 text-xs gap-2"
                >
                  <Database className="w-4 h-4" />
                  Objects
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="commits" className="flex-1 m-0 overflow-hidden">
              <CommitGraph />
            </TabsContent>
            
            <TabsContent value="changes" className="flex-1 m-0 overflow-hidden">
              <FileChanges />
            </TabsContent>
            
            <TabsContent value="objects" className="flex-1 m-0 overflow-hidden">
              <ObjectDatabase />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <StatusBar />
    </div>
  );
}
