import type { GitObject, CommitObject, TreeObject, BlobObject, TagObject } from './ObjectDatabase'
import type { JSX } from 'react'
import { BlobDetail } from './ObjectDetails/BlobDetail'
import { TreeDetail } from './ObjectDetails/TreeDetail'
import { TagDetail } from './ObjectDetails/TagDetail'
import { CommitDetail } from './ObjectDetails/CommitDetail'

interface ObjectDetailProps {
  object: GitObject | CommitObject | TreeObject | BlobObject | TagObject
  allObjects: Array<GitObject | CommitObject | TreeObject | BlobObject | TagObject>
  onSelectObject: (hash: string) => void
}

export function ObjectDetail({
  object,
  allObjects,
  onSelectObject
}: ObjectDetailProps): JSX.Element {

  const getObjectByHash = (
    hash: string
  ): GitObject | CommitObject | TreeObject | BlobObject | TagObject | undefined => {
    return allObjects.find((o) => o.hash === hash)
  }


  return (
    <div className="p-6">
      {object.type === 'commit' && (
        <CommitDetail
          key={object.hash}
          commit={object as CommitObject}
          onSelectObject={onSelectObject}
          getObjectByHash={getObjectByHash}
        />
      )}
      {object.type === 'tree' && (
        <TreeDetail
          key={object.hash}
          tree={object as TreeObject}
          onSelectObject={onSelectObject}
          getObjectByHash={getObjectByHash}
        />
      )}
      {object.type === 'blob' && (
        <BlobDetail
          key={object.hash}
          blob={object as BlobObject}
          onSelectObject={onSelectObject}
          getObjectByHash={getObjectByHash}
        />
      )}
      {object.type === 'tag' && (
        <TagDetail
          key={object.hash}
          tag={object as TagObject}
          onSelectObject={onSelectObject}
        />
      )}
    </div>
  )
}
