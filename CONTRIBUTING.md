# Contributing

Contributions are always welcome, no matter how large or small!

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Development workflow

This project is an [Nx](https://nx.dev) monorepo managed using npm workspaces. It contains the following packages under `packages/`:

- [`click-to-pay-sdk`](./packages/click-to-pay-sdk) — the Click to Pay SDK.

To get started with the project, run the setup script in the root directory to install the required dependencies:

```sh
npm run setup
```

> Since the project relies on npm workspaces, you should use [`npm`](https://docs.npmjs.com/cli) for development rather than yarn or pnpm.

You can use various commands from the root directory to work with the project. Nx only runs the commands for projects affected by your changes:

```sh
npm run lint         # lint affected projects
npm run type-check    # type-check affected projects
npm run test          # run unit tests for affected projects
npm run build         # build affected projects
npm run format-check  # check formatting with Prettier
```

Make sure your code passes type-checking, linting and formatting before opening a pull request:

```sh
npx nx affected -t lint type-check
npx nx format:check
```

Remember to add tests for your change if possible.

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages, scoped to the package they touch:

- `fix(click-to-pay-sdk)`: bug fixes, e.g. fix crash due to a deprecated method.
- `feat(click-to-pay-sdk)`: new features, e.g. add support for a new payment network.
- `refactor(click-to-pay-sdk)`: code refactor with no behavior change.
- `docs(click-to-pay-sdk)`: documentation changes, e.g. add a usage example.
- `test(click-to-pay-sdk)`: adding or updating tests.
- `chore`: tooling changes not scoped to a single package, e.g. update CI config or dependencies.

Use `chore` without a scope for changes that affect the whole repository (tooling, CI, root config) rather than a specific package.

### Linting and tests

We use [TypeScript](https://www.typescriptlang.org/) for type checking, [ESLint](https://eslint.org/) with [Prettier](https://prettier.io/) for linting and formatting, and [Jest](https://jestjs.io/) for testing. All of these run automatically on every push and pull request via the [Code Quality workflow](./.github/workflows/code_quality.yml).

### Publishing to npm

Publishing is handled entirely through GitHub Actions, not from a local machine:

1. A maintainer triggers the **Create Release** workflow (`workflow_dispatch`), choosing the package and version. This lints, type-checks and builds the package, bumps its version, and opens a pull request from a `release/<package>/<version>` (or `hotfix/<package>/<version>`) branch into `master`.
2. Merging that pull request triggers the **Publish** workflow, which builds the package, publishes it to npm, and creates the corresponding GitHub release.

Contributors don't need to create release branches or publish manually — just open regular pull requests against `develop`/`master` with your changes.

### Scripts

The root `package.json` contains scripts for common tasks:

- `npm run setup`: install dependencies.
- `npm run lint`: lint affected projects.
- `npm run type-check`: type-check affected projects.
- `npm run test`: run unit tests for affected projects.
- `npm run build`: build affected projects.
- `npm run format-check`: check formatting with Prettier.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- For pull requests that change the public API, discuss with maintainers first by opening an issue.
