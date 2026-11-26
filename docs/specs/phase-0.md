# Phase 0 Spec — Prove the Loop

> Repo path: `docs/specs/phase-0.md`. Companion to `docs/brief.md`.
> **Estimate:** about 1 week part-time. **No Kubernetes, no operator.**

## Goal

Show that one headless Claude Code session, using Matt Pocock's skills, can take a well-specified GitHub issue to a pull request that passes `make verify`. Measure what it costs on a Max plan. Everything learned here becomes input to the operator design.

## Why this comes first

The operator automates this loop. If the loop doesn't work by hand, the operator won't fix it. Phase 0 also produces the real transcripts, prompts and numbers that Phase 1 needs.

## Steps

### 1. Set up the repos

- In this repo (docs, `CLAUDE.md` and license already in place), install the skills and run `/setup-matt-pocock-skills`.
- Run `/grill-with-docs` on the brief. Record ADRs for decisions settled.
- Create the **first consumer repo**: a small Go HTTP service, public.
- Prepare the Mac mini: turn off sleep, confirm about 100 GB of free disk, and start the Linux VM with the sizing in the reference.

### 2. Build the consumer service interactively

Use the skills by hand in Claude Code: `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement`. This gives first-hand experience of each skill before automating it.

The consumer repo must end up with:
- `make verify` (format, lint, test) running in under about 3 minutes.
- A CI workflow running `make verify` as a required check on `main`.
- `CLAUDE.md`, `.mise.toml` and a draft `.factory.yaml`.
- **5–10 seeded issues**, each a tracer-bullet ticket with clear acceptance criteria, labelled `ready-for-agent`.

### 3. Build the agent image

One Dockerfile: Claude Code (pinned), the vendored skills (pinned), git, Go toolchain, golangci-lint, make, mise. Built with `docker buildx` for amd64 (the Mac mini is Intel). Go conventions and hooks live in the consumer repo's `.claude/` for now.

### 4. Write the loop script

`hack/loop.sh <issue-number>`, run from the Mac:

1. Clone the consumer repo into a fresh workspace folder and create branch `factory/<issue>-<slug>`.
2. Fetch the issue title and body.
3. Run the agent container with the workspace mounted and a **read-only** GitHub token:
   ```
   claude -p "<implement prompt>" \
     --output-format stream-json \
     --permission-mode <mode> --allowedTools <list> \
     > .factory/transcript.jsonl
   ```
4. After the container exits, **the script** (not the agent) pushes the branch and opens a draft PR, using `.factory/pr-body.md` if present.
5. Wait for the CI check and print the result.

The prompt template fences the issue text as untrusted input, invokes `implement`, and asks for `.factory/pr-body.md`.

### 5. Run it and measure

Run the script on every seeded issue. Re-run a few to see variance. Record for each run:

| Measure | Why |
|---|---|
| Pass or fail on CI, and failure reason | Baseline success rate |
| Tokens (input, output, cache) and turns | Budget defaults |
| Wall-clock time | Timeout defaults |
| Whether a usage limit was hit, and after how many runs | Session slots and schedule windows |
| Human edits needed before merge | Quality baseline |
| Skill behaviours that assumed a human | Prompt and stage design |

### 6. Check the hand-off

Planning stays local and interactive, so the ticket is the only thing the factory gets. For each failed or weak run, note whether the ticket was the cause: missing acceptance criteria, hidden dependencies, too large, or ambiguous wording. Use those notes to draft a **ticket readiness checklist**, and adjust how you run `to-tickets` if a pattern shows up.

## Deliverables

- The consumer repo, with CI and seeded issues.
- The agent image Dockerfile.
- `hack/loop.sh` and the prompt template.
- **Recorded transcripts**, redacted, saved under `testdata/transcripts/`. These become the `fake-claude` fixtures: at least one success, one test failure, one usage-limit hit if it occurs, one that asks a question.
- A short results write-up (`docs/phase-0-results.md`) with the measurements table.
- ADRs: prompt template and output files; allowed tools per stage; first default limits (timeout, attempts).

## Exit criteria

- At least **3 of 5** seeded issues reach a PR that passes CI with no human intervention during the run.
- Tokens and time per ticket are known, and a first estimate exists of tickets per Max usage window.
- A draft ticket readiness checklist exists.

## If it fails

If fewer than 3 of 5 pass, don't start Phase 1. Fix the cause first: smaller tickets, better `CLAUDE.md`, stronger hooks, a different model, or adjusted prompts. Record what changed.

## What gets thrown away

The loop script. Its steps become the Phase 1 operator's reconcile logic, and the script stays in `hack/` only as a debugging tool.
