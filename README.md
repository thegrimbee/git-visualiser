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
- As a developer, I want to be able to find files and their history in a Git repository so that I can debug issues related to version control.

### Features
- Browse and select a Git repository from the local file system.
- Display commits, trees, blobs, and tags in a list/graph view.
- Show the relationships between commits, blobs, trees, and tags in a visual graph.
- Display detailed information about commits, including author, date, and commit message.
- Show the contents of files at specific commits.
- Support filtering and searching of Git objects.