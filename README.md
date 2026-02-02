# git-visualiser

An Electron application with React and TypeScript to visualise the internal state of a Git repository.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

### User Stories
- As a user curious about Git internals, I want to visualize the structure of a Git repository so that I can better understand how Git works.
- As a user curious about Git internals, I want to see how files and commits are represented in Git so that I can learn about Git's data model.
- As a user curious about Git internals, I want to explore the relationships between commits, branches, and tags so that I can grasp Git's version control concepts.
- As a user curious about Git internals, I want to see the details of each object (commit, blob, tree, tag) so that I can understand their roles in the repository.
- As a developer, I want to be able to find files and their history in a Git repository so that I can debug issues related to version control.
- As a user, I want to be able to select remote repositories so that I can visualize projects hosted on platforms like GitHub or GitLab.
- As a user, I want to be able to limit the number of objects shown in the graph so that the application remains responsive and usable.
- As a user, I want to be able to filter the displayed objects by type (commits, blobs, trees, tags) so that I can focus on specific aspects of the repository.

### Features
- Browse and select a Git repository from the local file system.
- Display commits, trees, blobs, and tags in a list/graph view.
- Show the relationships between commits, blobs, trees, and tags in a visual graph.
- Display detailed information about commits, including author, date, and commit message.
- Show the contents of files at specific commits.
- Filter objects by type (commits, blobs, trees, tags).


### Future Improvements
- Limit the number of objects loaded to improve performance.
- Support filtering and searching of Git objects.
- Implement a more advanced graph visualization for better clarity.
- Add support for remote repositories and branches.
- Improve the UI/UX for better usability and aesthetics.
- Add export functionality to save visualizations as images or PDFs.
- Implement user settings for customizing the visualization (e.g., color schemes, layout options).
- Add support for visualizing branches and merges in the repository.