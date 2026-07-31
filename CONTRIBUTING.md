# Contributing to Piwulangan

Thanks for your interest in contributing! This document explains how to get involved.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Read** [SETUP.md](./SETUP.md) for local setup
4. **Pick** an issue from the issue tracker, or create one for your idea
5. **Branch** off `main` with a descriptive name
6. **Code** your changes
7. **Test** that everything works
8. **Submit** a pull request

## Branch Naming

Use descriptive branch names:

```
feat/scheduling-recurring    — new feature
fix/booking-timezone         — bug fix
docs/architecture-update     — documentation
refactor/auth-middleware      — code improvement
```

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add recurring booking support
fix: correct timezone handling in scheduler
docs: update architecture diagram
refactor: simplify availability query
chore: update dependencies
```

## Pull Request Process

1. **One feature per PR.** Keep changes focused.
2. **Describe what you did** and why in the PR description.
3. **Include screenshots** if you changed the UI.
4. **Make sure it builds** — run `npm run build` before submitting.
5. **Make sure it's clean** — run `npm run lint` before submitting. (Linting is plain ESLint 9 via `eslint .`, using the flat config in `eslint.config.mjs` — not `next lint`.)
6. **Update docs** if you changed behavior.

## Code Style

- **TypeScript** — no `any` types unless absolutely necessary
- **Components** — functional components with hooks, no class components
- **Naming** — camelCase for variables/functions, PascalCase for components/types
- **Imports** — absolute imports via `@/` prefix (configured in tsconfig)
- **Formatting** — Prettier with default settings
- **UI** — Metro design system (square corners, solid colors, tokens in `globals.css`); touch targets ≥ 44px; every user-facing string goes through i18n (`useT` / `getServerT`) with key parity in `locales/{id,en}.ts`
- **Role colors** — admin = purple, instructor = navy, student = Metro green, guardian = deep yellow. Always render roles with `<RoleBadge>` (`src/components/RoleBadge.tsx`); never inline role colors

## What We're Looking For

### High Priority

- Bug fixes
- Accessibility improvements
- Mobile experience polish
- Test coverage
- Documentation improvements

### Medium Priority

- Performance optimizations
- Code refactoring
- UI/UX improvements

### We Probably Won't Accept

- Features that add significant complexity (see PRD "Out of Scope")
- Enterprise features (SCORM, xAPI, multi-tenant)
- Dependencies that add large bundles
- Features that require external paid services

## Reporting Bugs

Open an issue with:

1. **What you expected** to happen
2. **What actually** happened
3. **Steps to reproduce**
4. **Screenshots** if applicable
5. **Environment** (browser, OS, device)

## Suggesting Features

Open an issue with:

1. **The problem** you're trying to solve
2. **Your proposed solution**
3. **Why existing features** don't cover it
4. **Impact** — how many users would benefit?

## Code of Conduct

Be respectful. Be constructive. We're all here to build something useful.

- No harassment, discrimination, or personal attacks
- Give constructive feedback, not just criticism
- Assume good intent
- Keep discussions on-topic

## Questions?

Open a discussion in the GitHub Discussions tab, or comment on an existing issue.
