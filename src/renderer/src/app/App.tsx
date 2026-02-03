import { Provider } from 'react-redux'
import { store } from './store/store'
import { useAppDispatch, useAppSelector } from './store/hooks'
import { setActiveTab } from './store/slices/appSlice'
import { BranchPanel } from './components/BranchPanel'
import { CommitGraph } from './components/CommitGraph'
import { FileChanges } from './components/FileChanges'
import { ObjectDatabase } from './components/ObjectDatabase'
import { Repository } from './components/Repository'
import { StatusBar } from './components/StatusBar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { GitCommit, FileText, Database } from 'lucide-react'

function AppContent(): React.JSX.Element {
  const dispatch: ReturnType<typeof useAppDispatch> = useAppDispatch()
  const activeTab = useAppSelector((state) => state.app.activeTab)
  const isRepoLoaded = useAppSelector((state) => state.git.isRepoLoaded)

  return (
    <div className="h-screen w-screen flex flex-col bg-[#1e1e1e] overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <BranchPanel />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(value) => dispatch(setActiveTab(value))}
            className="flex-1 flex flex-col"
          >
            <div className="bg-[#252526] border-b border-[#1e1e1e] px-2">
              <TabsList className="h-10 bg-transparent gap-1">
                <TabsTrigger
                  value="repository"
                  className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white text-gray-400 text-xs gap-2"
                >
                  <Database className="w-4 h-4" />
                  Repository
                </TabsTrigger>
                <TabsTrigger
                  value="commits"
                  className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white text-gray-400 text-xs gap-2"
                  disabled={!isRepoLoaded}
                >
                  <GitCommit className="w-4 h-4" />
                  Commits
                </TabsTrigger>
                <TabsTrigger
                  value="changes"
                  className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white text-gray-400 text-xs gap-2"
                  disabled={!isRepoLoaded}
                >
                  <FileText className="w-4 h-4" />
                  Changes
                </TabsTrigger>
                <TabsTrigger
                  value="objects"
                  className="data-[state=active]:bg-[#1e1e1e] data-[state=active]:text-white text-gray-400 text-xs gap-2"
                  disabled={!isRepoLoaded}
                >
                  <Database className="w-4 h-4" />
                  Objects
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="repository" className="flex-1 m-0 overflow-hidden">
              <Repository />
            </TabsContent>

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
  )
}

export default function App(): React.JSX.Element {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  )
}
