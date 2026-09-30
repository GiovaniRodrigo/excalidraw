# Agent Guidelines for Excalidraw

## Core Guidelines & Rules

- **DOM / Browser APIs**: For new DOM/browser API usage, use `app.ownerDocument` and `app.ownerWindow` instead of globals; without `app`, derive them from the mounted node's `ownerDocument` and its `defaultView`.
- **TypeScript Overrides**: When overriding properties of an existing type, prefer `Merge<Base, Overrides>` from `@excalidraw/common/utility-types` over `Omit<Base, keyof Overrides> & Overrides`.
- **Type Safety**: Maintain strict TypeScript typing. Do not use `any` unless absolutely necessary.

## Project Structure & Architecture

Excalidraw is a **monorepo** managed with Yarn workspaces:

- **`packages/excalidraw/`**: Main React component library published to npm as `@excalidraw/excalidraw`.
- **`excalidraw-app/`**: Full-featured web application (excalidraw.com) consuming the core library.
- **`packages/`**: Core packages:
  - `@excalidraw/common`: Shared utility functions, types, and constants.
  - `@excalidraw/element`: Shapes, bindings, text, and element mutation logic.
  - `@excalidraw/math`: Geometric calculations, curve rendering, bounding boxes.
  - `@excalidraw/utils`: Standalone utilities.
- **`examples/`**: Integration examples (NextJS, browser scripts).

## Development Workflow & Commands

- **Typecheck**: `yarn test:typecheck` - Verify TypeScript compiler checks.
- **Test Suite**: `yarn test:update` or `yarn test` - Run Vitest test suite.
- **Lint & Format**: `yarn fix` - Auto-fix formatting (Prettier) and linting (ESLint).
- **Dev Server**: `yarn start` - Start local development server.

## Local Agent & Skills Integration

All agents working on this workspace have access to the local ecosystem of skills and procedures:
- **TDD / Testing**: Follow Test-Driven Development (`tdd`), seam validation, and test automation via `teste-expert`.
- **Code Review & Architecture**: Use `code-review`, `codebase-design`, and `improve-codebase-architecture` for structural changes.
- **Debugging & Diagnostics**: Use `diagnosing-bugs` and `production-troubleshooter` for analyzing regressions.
- **CI/CD & DevOps**: Use `cicd-expert` and `infra-expert` for pipeline or infrastructure tasks.
