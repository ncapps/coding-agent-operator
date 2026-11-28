# CLAUDE.md

Guidance for Claude Code sessions in this repository.

## What this project is

`coding-agent-tools` is a monorepo of plugins and tools for working with coding agents. The maintainer plans with grilling, specs and tickets; the tools make planning easier to follow and execute the tickets unattended.

| Product | What it is | Directory |
|---|---|---|
| **Architect** | Local tool beside a Claude Code planning session: keeps decisions as data and renders the decision graph and diagrams. TypeScript on Node | `architect/` |
| **Factory** | Kubernetes operator (Go, controller-runtime) that runs Claude Code headlessly on planned GitHub tickets and opens draft PRs. Its value is **governed, unattended execution**: read-only agent credentials, a separate writer, protected paths, enforced limits, and desired-state recovery. Read `docs/brief.md` §0 before suggesting factory features | `factory/` |
| **Plugins** | Versioned Claude Code plugins shared by consumer repos, extracted once a second consumer exists | `plugins/` |

Each product picks its own language and toolchain.

**Current state: design phase. There is no code yet.** The architect's slice 1 is next (`docs/planning-tool-brief.md`), then the factory's Phase 0 (`docs/specs/phase-0.md`). Focus moves to the factory once architect slice 3 is done and one factory spec has gone through the architect end to end.

## How work is split

- **The maintainer plans and owns architecture decisions.** Planning happens interactively, here, with Matt Pocock's skills: `/grill-with-docs` → `/to-spec` → `/to-tickets`.
- **The factory executes tickets.** Planning stages never run inside the factory in v1. The ticket is the factory's only input from planning; it never reads a decision graph or spec.
- Don't settle an architecture question on your own. Raise it, grill it, and record the outcome as an ADR in `docs/adr/`.

## Where things are

| Path | Contents |
|---|---|
| `docs/brief.md` | Vision, principles (§2), architecture (§5), roadmap (§11), open questions (§12), brainstorm (§14) |
| `docs/specs/phase-0.md` | Next phase: prove the loop without Kubernetes |
| `docs/specs/phase-1.md` | Thin operator MVP |
| `docs/reference.md` | Dependencies, image builds, home hardware, backlog, risks |
| `docs/design-history.md` | Decisions already made and alternatives rejected, with reasons |
| `GLOSSARY.md` | Terms, in a Planning section and a Factory section |
| `docs/planning-tool-brief.md` | The architect: why, slices, order of work |
| `architect/` | The architect (from slice 1) |
| `docs/adr/` | Architecture decision records |
| `docs/git-workflow.md` | Branching, worktrees, PRs, merging, CI checks |

Before proposing a change, check `docs/design-history.md` so you don't re-propose something already rejected.

## Document lifecycle

Only some planning documents last. Don't create new long-lived copies of working documents.

| Kind | Examples | Lifetime |
|---|---|---|
| Lasting | ADRs, `GLOSSARY.md`, living docs (`README.md`, `CLAUDE.md`, `docs/git-workflow.md`), code, GitHub issues | Kept up to date |
| Working | Decision graph | Deleted when its planning session closes |
| Working | Spec | Closed when its tickets are done; never updated afterwards |
| Working | Briefs, `docs/reference.md`, `docs/design-history.md`, `docs/specs/*.md` | Removed once grilled into specs and ADRs, after the initial phases |

- A deferred decision becomes a `needs-triage` issue when its planning session closes.
- Before deleting a brief, move anything that must outlive it (principles, rejected alternatives) into an ADR, the README or the glossary.
- When the decision graph and an ADR disagree during a planning session, the ADR wins.

## Git workflow

Read `docs/git-workflow.md` before your first branch, commit or PR in a session.

- Work on one branch per session, named `<type>/<issue>-<slug>`, in its own worktree when sessions run in parallel. `factory/` branches belong to the factory.
- Start from an issue. If none exists, ask the maintainer before creating one.
- Commit signed, keeping the `Co-Authored-By` trailer. Let the lefthook hooks run.
- Open the PR with a Conventional Commit title and a body that follows `.github/pull_request_template.md`, including `Closes #N`. The maintainer merges.
- GitHub settings belong to the maintainer: print `gh api` commands for them to run.

## Markers in the docs

- **(decision)**: proposed, not yet settled. Grill it, then write an ADR or overturn it.
- **(verify)**: depends on vendor policy or tooling that changes often. Check current docs before relying on it.

## v1 scope

- GitHub only, Claude Code only, behind `Tracker`, `Harness` and `Runtime` interfaces.
- Not in v1: GitLab, Codex CLI, Gemini CLI, ACP, in-factory planning.

## Environment

- Home cluster: 2018 Intel Mac mini (6 cores, 32 GB), Colima or OrbStack, k3d. Images are **amd64**.
- Claude credentials: Max subscription at home; API keys in CI and evals. **CI must never use the subscription.**

## Conventions (to be confirmed when code starts)

- Go for the factory, TypeScript on Node for the architect. Pin tool versions in `.mise.toml`, `go.mod` and `package.json`.
- Conventional Commits in PR titles; squash merges put them on `main` (see Git workflow).
- Every reconciler change needs an envtest case.
- CRD changes: regenerate, update samples, and add an ADR for any API change.
- Docs: plain, direct English; short sentences; tables for comparisons.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `ncapps/coding-agent-tools`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
