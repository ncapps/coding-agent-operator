# Git workflow

How changes reach `main`. [ADR 0002](adr/0002-git-workflow.md) records why.

There's one maintainer (Nick). Claude Code sessions do most of the commits. Claude commits and opens PRs; Nick merges.

## Rules

- **Trunk-based.** `main` is protected and always green. Every change goes through a PR, docs included.
- **One issue per PR.** The PR body says `Closes #N`. Keep PRs under about 400 changed lines where practical.
- **Squash merge only.** The PR title becomes the commit on `main`, so it must follow [Conventional Commits](https://www.conventionalcommits.org/).
- **ADRs ship with their decision**, in the same PR.
- **Signed commits** (SSH). Claude Code's `Co-Authored-By` trailer stays in commits.
- **One branch per Claude Code session.** Use git worktrees for parallel sessions.
- **CI is the gate.** Local hooks run fast checks only.
- **Generated code** (CRDs, RBAC, deepcopy) is committed. A CI drift check is added once code exists.
- **Releases** (release-please, `v0.x` tags) start in Phase 1.

## Branch names

`<type>/<issue>-<slug>`, for example `docs/14-phase-0-results`.

| Type | Use for |
|---|---|
| `feat` | New behaviour |
| `fix` | Bug fix |
| `docs` | Docs only |
| `chore` | Tooling, config, housekeeping |
| `refactor` | Code change with no behaviour change |
| `test` | Tests only |
| `ci` | CI workflows |

The same types are the only ones allowed in PR titles. The `factory/` prefix is reserved for branches the operator creates.

## One-time setup

Install the pinned tools and the git hooks:

```sh
brew install mise
mise install          # tools pinned in .mise.toml
lefthook install      # pre-commit hooks from lefthook.yml
```

Sign commits with your SSH key and register it with GitHub as a signing key:

```sh
git config --global gpg.format ssh
git config --global user.signingkey ~/.ssh/id_ed25519.pub
git config --global commit.gpgsign true
gh auth refresh -h github.com -s admin:ssh_signing_key
gh ssh-key add ~/.ssh/id_ed25519.pub --type signing --title "<machine> signing"
```

Optional: let `git log --show-signature` verify your own commits locally.

```sh
echo "$(git config user.email) $(cat ~/.ssh/id_ed25519.pub)" >> ~/.ssh/allowed_signers
git config --global gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers
```

## Day to day

```sh
git switch main && git pull --ff-only
git switch -c feat/12-stage-run-status

# work, then commit (hooks run markdownlint and gitleaks on staged files)
git commit -m "feat: add StageRun status conditions"

git push -u origin HEAD
```

Open the PR with a body that follows `.github/pull_request_template.md` and includes `Closes #N`:

```sh
gh pr create --title "feat: add StageRun status conditions" --body "$(cat <<'EOF'
## Summary
...
## Linked issue
Closes #12
EOF
)"
```

Branch commits can be messy; only the PR title lands on `main`. Rebase on `main` rather than merging it in:

```sh
git fetch origin && git rebase origin/main && git push --force-with-lease
```

## Parallel sessions with worktrees

Each Claude Code session gets its own worktree and branch, so sessions never share a working tree.

```sh
git worktree add ../coding-agent-operator-12 -b feat/12-stage-run-status origin/main
cd ../coding-agent-operator-12 && mise install && lefthook install && claude

git worktree list
git worktree remove ../coding-agent-operator-12   # after the PR merges
```

## Merging

Nick merges. Wait for all checks to pass, then:

```sh
gh pr merge 12 --squash --delete-branch
```

The repo only allows squash merges. The commit title is the PR title. The body is the branch's commit messages, which keeps the `Co-Authored-By` trailers. **(verify)** Check that the trailer survived on the first merge.

## CI checks

`.github/workflows/pr.yml` runs on every PR. All four jobs are required checks on `main`.

| Check | Tool | Run it locally |
|---|---|---|
| `pr-title` | amannn/action-semantic-pull-request | — |
| `markdownlint` | markdownlint-cli2 with `.markdownlint.yaml` | `markdownlint-cli2 "**/*.md"` |
| `links` | lychee, offline (relative links and anchors) | `lychee --offline --include-fragments --hidden './**/*.md'` |
| `gitleaks` | gitleaks over the PR's commits | `gitleaks git --redact .` |

Actions are pinned to full commit SHAs. Tool versions in `pr.yml` match `.mise.toml`; change both together. A required check matches by job name, so renaming a job means updating the ruleset in the same change.

## Repository settings

Applied by Nick with `gh api`, not by agents.

| Setting | Value |
|---|---|
| `main` ruleset | PR required, 0 approvals, the four checks above, linear history, signed commits, no force pushes or deletion, no bypass |
| Merge methods | Squash only; title from PR title, body from commit messages |
| Head branches | Deleted after merge |
| Secret scanning | On, with push protection |
