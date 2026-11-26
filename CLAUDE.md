# CLAUDE.md

Guidance for Claude Code sessions in this repository.

## What this project is

`coding-agent-operator` is a Kubernetes operator (Go, controller-runtime) that runs Claude Code headlessly on planned GitHub tickets and opens draft PRs. Its value is **governed, unattended execution**: read-only agent credentials, a separate writer, protected paths, enforced limits, and desired-state recovery. Read `docs/brief.md` §0 before suggesting features.

**Current state: design phase. There is no code yet.** Phase 0 (`docs/specs/phase-0.md`) is next.

## How work is split

- **Nick plans and owns architecture decisions.** Planning happens interactively, here, with Matt Pocock's skills: `/grill-with-docs` → `/to-spec` → `/to-tickets`.
- **The operator executes tickets.** Planning stages never run inside the operator in v1.
- Don't settle an architecture question on your own. Raise it, grill it, and record the outcome as an ADR in `docs/adr/`.

## Where things are

| Path | Contents |
|---|---|
| `docs/brief.md` | Vision, principles (§2), architecture (§5), roadmap (§11), open questions (§12), brainstorm (§14) |
| `docs/specs/phase-0.md` | Next phase: prove the loop without Kubernetes |
| `docs/specs/phase-1.md` | Thin operator MVP |
| `docs/reference.md` | Dependencies, image builds, home hardware, backlog, risks |
| `docs/design-history.md` | Decisions already made and alternatives rejected, with reasons |
| `docs/adr/` | Architecture decision records |
| `docs/git-workflow.md` | Branching, worktrees, PRs, merging, CI checks |

Before proposing a change, check `docs/design-history.md` so you don't re-propose something already rejected.

## Git workflow

Read `docs/git-workflow.md` before your first branch, commit or PR in a session.

- Work on one branch per session, named `<type>/<issue>-<slug>`, in its own worktree when sessions run in parallel. `factory/` branches belong to the operator.
- Start from an issue. If none exists, ask Nick before creating one.
- Commit signed, keeping the `Co-Authored-By` trailer. Let the lefthook hooks run.
- Open the PR with a Conventional Commit title and a body that follows `.github/pull_request_template.md`, including `Closes #N`. Nick merges.
- GitHub settings belong to Nick: print `gh api` commands for him to run.

## Markers in the docs

- **(decision)**: proposed, not yet settled. Grill it, then write an ADR or overturn it.
- **(verify)**: depends on vendor policy or tooling that changes often. Check current docs before relying on it.

## v1 scope

- GitHub only, Claude Code only, behind `Tracker`, `Harness` and `Runtime` interfaces.
- Not in v1: GitLab, Codex CLI, Gemini CLI, ACP, in-operator planning.

## Environment

- Home cluster: 2018 Intel Mac mini (6 cores, 32 GB), Colima or OrbStack, k3d. Images are **amd64**.
- Claude credentials: Max subscription at home; API keys in CI and evals. **CI must never use the subscription.**

## Conventions (to be confirmed when code starts)

- Go for the operator. Pin tool versions in `.mise.toml` and `go.mod`.
- Conventional Commits in PR titles; squash merges put them on `main` (see Git workflow).
- Every reconciler change needs an envtest case.
- CRD changes: regenerate, update samples, and add an ADR for any API change.
- Docs: plain, direct English; short sentences; tables for comparisons.

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for `ncapps/coding-agent-operator`, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
