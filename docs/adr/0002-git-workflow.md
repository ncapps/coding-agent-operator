# 0002. Git workflow: trunk-based, PR-only, squash merge

- **Status:** accepted
- **Date:** 2026-11-26

## Context

One maintainer works on this repo, and Claude Code sessions make most of the commits. Later, the operator creates its own branches. `main` must stay green: CI is the quality gate (brief §2, principle 6), and every branch starts from `main`.

The workflow has to stay simple for one person. GitHub should enforce it, not habit.

## Decision

- **Trunk-based.** `main` is protected and always green. Every change, docs included, goes through a PR that links an issue with `Closes #N`.
- **Branches** are named `<type>/<issue>-<slug>`. `factory/` is reserved for the operator.
- **Squash merge only.** The PR title becomes the commit title and follows Conventional Commits. The commit body is the branch's commit messages, so `Co-Authored-By` trailers survive.
- **Signed commits** (SSH). The `main` ruleset requires signatures; GitHub signs the squash commits it creates.
- **Required checks** from `pr.yml`: PR title lint, markdownlint, offline link check, gitleaks. Local hooks (lefthook) run fast checks only.
- **No required approvals, and no bypass actors.** The maintainer merges every PR, and merging is the review.
- **CODEOWNERS is advisory.** It requests the maintainer's review but enforces nothing.
- **Local Claude Code sessions use the maintainer's `gh` login** to push and open PRs. One branch per session; worktrees for parallel sessions.
- **ADRs ship in the same PR** as the decision they record.
- **Generated code is committed**, with a CI drift check once code exists. Releases (release-please, `v0.x` tags) start in Phase 1.

## Alternatives considered

| Option | Why not |
|---|---|
| GitHub Flow with merge commits | Merge commits clutter history, and branch commits would each need Conventional Commit messages for release-please. Squash gives one checked commit per PR |
| Direct pushes to `main` | Skips the CI gate, so `main` can go red under work that branches from it |
| Required approvals as a solo maintainer | GitHub never lets authors approve their own PRs. Every PR is opened under the maintainer's account, so each one would need a bypass. It adds a click and no information |
| Separate GitHub identity for local sessions (machine user or GitHub App) | A second account, token rotation and a signing key, for little gain while the maintainer watches sessions and merges every PR |

## Consequences

- `main` has one Conventional Commit per PR, ready for release-please in Phase 1.
- Required checks match by job name. Renaming a job in `pr.yml` means updating the ruleset in the same change, or merges block.
- With no bypass, fixing a broken required check means editing the ruleset.
- Brief §8 says CODEOWNERS enforces protected paths on GitHub's side. That only holds once PRs come from a separate identity and code-owner review is required.
- Local sessions hold a broad token. **Revisit** the identity, approvals and code-owner review when any of these happens: Claude Code runs unattended outside the operator, a second contributor joins, or auto-merge (L4) is enabled.
- Squash commits keep the `Co-Authored-By` trailer. Checked on the first merge (PR #2, commit 0aeba03): GitHub kept it as `Co-authored-by:`, and the commit shows as Verified.
- Tool versions are pinned in two places: `.mise.toml` for local use and `pr.yml` for CI. Keep them in step until Renovate arrives.
