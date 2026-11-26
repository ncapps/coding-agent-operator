# coding-agent-operator — Project Brief

> **Status:** Draft v1.0 (2026-11-26). Moved into the project repository; project named `coding-agent-operator`.
> **Owner:** Nick Capps
> **Repo:** [`ncapps/coding-agent-operator`](https://github.com/ncapps/coding-agent-operator). This file lives at `docs/brief.md`. "The factory" below means this project.
> **v1 scope:** GitHub as the only tracker and Claude Code as the only harness.

This brief is the vision and architecture summary. Detail lives in companion documents:

| Document | Repo path | Contents |
|---|---|---|
| This brief | `docs/brief.md` | Purpose, principles, architecture, roadmap, open questions |
| Phase 0 spec | `docs/specs/phase-0.md` | Prove the loop without Kubernetes |
| Phase 1 spec | `docs/specs/phase-1.md` | Thin operator MVP: scope, flow, definition of done, conventions |
| Reference | `docs/reference.md` | Dependencies, image builds, local cluster, backlog, risk register |
| ADRs | `docs/adr/` | One per settled decision (written during grilling) |

Markers: **(decision)** is a proposed decision that should become an ADR or be overturned. **(verify)** depends on vendor policy or tooling that changes often and must be re-checked before building on it.

---

## 0. Why

**You do the planning. The factory does the overnight shift, safely.**

Coding agents can now implement a well-scoped ticket on their own. What they can't do is supervise themselves. Today the choice is to babysit each session at the terminal, or to run a loose script and hope. The factory is the supervisor: plan the work in a live session, label the tickets, walk away, and come back to pull requests produced inside limits the platform enforces.

**Orchestration is not the value.** Running an agent on an issue is commodity: Kelos, GitHub Agentic Workflows, the Copilot coding agent and Sandcastle all do it. The value is **governed, unattended execution**: policy, isolation, quota, recovery and visibility around the agent.

### Problems it addresses

| # | Problem | How the factory answers it |
|---|---|---|
| 1 | **Agents need a babysitter.** Interactive sessions tie you to the keyboard, and planned tickets sit idle | Picks up ready tickets in dependency order and works through them unattended |
| 2 | **Unattended agents are a security risk.** Bypassed permissions, a write token and untrusted issue text are one prompt injection from damage | Agents hold read-only credentials; a separate writer pushes code; restricted network; only tickets labelled by a trusted person are picked up |
| 3 | **Agents can grade their own homework** by weakening the tests or CI that judge them | Protected paths always go to a human; pass/fail comes from the repo's required CI check |
| 4 | **Runaway sessions burn tokens and quota**, including the subscription limits needed for interactive work | Timeouts, attempt limits, session slots and schedule windows; waits out usage limits |
| 5 | **Scripts don't survive real life**: restarts, duplicate events, half-finished runs, leftover containers | Desired-state reconciliation: re-adopts runs, ignores duplicates, retries with backoff, cleans up |
| 6 | **Nobody can see what happened**, or what it cost | Every run records what it did, its tokens, model and versions, and why it stopped; failures come back as a labelled issue with an explanation |
| 7 | **Quality doesn't improve by itself.** The same mistakes recur across sessions | Outcomes (CI results, review comments, human edits) feed back into skills, hooks and ticket-writing habits |
| 8 | **Skills and hooks drift across repos.** Each repo carries its own copy of conventions | Versioned plugins, pinned per project and tested before release |
| 9 | **Vendor agents run on the vendor's terms**: their runners, billing and policy model | Runs on your own cluster, from a Mac mini to EKS, with your credentials and rules |

**One-line positioning:** a Kubernetes operator that lets you hand planned GitHub tickets to Claude Code and walk away, with security, cost and quality enforced by the platform, not the prompt.

**Honest caveat.** For one developer, Kubernetes adds little speed over a good script. Its value is the guarantees: desired state, recovery, access control, isolation, and one design from a Mac mini to an enterprise cluster. Lead with governance, not throughput.

---

## 1. Purpose

A self-hosted **software factory** that turns GitHub issues into reviewed pull requests. It orchestrates Claude Code sessions on Kubernetes, with Matt Pocock's skills driving each stage and a **configurable autonomy level** deciding where humans approve.

It serves two goals:

1. **A working agentic development workflow** for Nick's portfolio projects. One factory serves many consumer repos.
2. **A platform-engineering portfolio piece** showing Kubernetes API design, secure sandboxing, policy enforcement, plugin delivery and observability.

### Goals (v1)

- **Planning is interactive and local.** Nick runs `grill-with-docs`, `to-spec` and `to-tickets` in Claude Code on his own machine. The tickets they publish are the hand-off to the factory.
- **Execution is automatic.** The factory picks up ready tickets, implements them with `implement` → `tdd`, and raises PRs.
- Autonomy is configurable per project and per stage.
- Claude Code (`claude -p`) is the one harness and GitHub (a GitHub App) the one tracker. Each sits behind a Go interface.
- Runs on one Mac mini at home; the same design deploys to enterprise Kubernetes.
- Runs on a Claude Max subscription at home, with an API key as a one-field switch.
- The factory repo maintains versioned Claude Code plugins used by several consumer projects.

### Non-goals

- A general-purpose workflow engine (Argo, Tekton and Temporal are out of scope).
- Competing with hosted vendor agents on "run an agent on an issue".
- Building an eval engine.
- Running planning stages (triage, grilling, spec, tickets) inside the factory in v1. This is an optional later phase.
- Multi-user SaaS. A multi-user deployment must use per-user API keys.
- GitLab, Codex CLI, Gemini CLI and an ACP driver. These are v2.

### North-star metric

**Merged PRs per week in consumer projects.** PRs to the factory repo don't count. This guards against the factory mostly working on itself.

### Minimum portfolio v1

Phases 0–3 of the roadmap (§11) make a complete, demoable v1. Phases 4–7 are extensions and can be cut or shrunk.

---

## 2. Core principles

1. **Prove the workflow before building the platform.** Phase 0 runs the loop with a script and one container. Nothing is automated in the operator until it has worked by hand.
2. **GitHub owns human-visible workflow state; Kubernetes owns execution state.** Labels, comments, sub-issues and PR reviews are the UI and audit trail. The controller reconciles the two idempotently.
3. **Thin operator, few resources.** Start with two custom resources and add more only when a second use forces it.
4. **Agents never hold code-write credentials.** Agent pods get read-only tokens. A separate writer pushes branches and opens PRs, and the operator itself posts comments and labels.
5. **Policy lives in the controller, not the prompt.** Timeouts, attempt limits, budgets, session slots and the kill switch are enforced outside the agent.
6. **The required CI check is the quality gate.** Every consumer repo exposes `make verify` and runs it as a required check. Hooks in the agent pod call it for fast feedback, but only the CI result counts.
7. **Agents can't weaken their own gate.** Changes to protected paths (§8) always need human review.
8. **Gate approvals come from trusted humans only.** A label or review counts toward a gate only when a repo collaborator applied it. The factory's own actions never satisfy a gate.
9. **Everything pinned.** Skills, plugins, images and tools are pinned and bumped by Renovate.
10. **Humans plan, the factory executes.** Interactive skills stay interactive and local. The factory only runs stages that need no conversation, and the ticket is the contract between the two.

---

## 3. Glossary (seed for `GLOSSARY.md`)

| Term | Meaning |
|---|---|
| **Factory** | The operator, plugins and evals in this repo |
| **Consumer project** | A portfolio repo on GitHub that the factory works on |
| **Harness** | An agent CLI driven headlessly. v1: Claude Code |
| **Tracker** | The issue and PR system holding workflow state. v1: GitHub |
| **Runtime** | What executes an agent session. Starts as a Kubernetes Job; agent-sandbox later |
| **Stage** | One step of the workflow, backed by one skill |
| **StageRun** | One agent session executing one stage for one issue |
| **Frontier** | Tickets whose blockers are all done (from `to-tickets`) |
| **Gate mode** | `manual` / `approve` / `auto` for a stage |
| **Autonomy level** | Preset L1–L4 (L5 demo-only) mapping stages to gate modes |
| **Writer** | The component that pushes branches and opens PRs with a short-lived write token |
| **Protected path** | A file or folder whose change always forces human review |
| **Session slot** | One unit of concurrent Claude Code capacity |
| **Reserve** | Subscription capacity held back for Nick's own interactive use |
| **Golden task** | A fixture repo state plus hidden tests, used for evals |

---

## 4. Workflow: skills as stages

Skills come from [`mattpocock/skills`](https://github.com/mattpocock/skills), vendored at a pinned version. **(verify)** Skill names changed in 2026 (`to-prd` → `to-spec`, `to-issues` → `to-tickets`).

| Stage | Skill | Where it runs | Notes |
|---|---|---|---|
| intake | `triage` | **Local**, interactive | Nick, in Claude Code |
| align | `grill-with-docs` | **Local**, interactive | Updates `GLOSSARY.md` and ADRs in the repo |
| spec | `to-spec` | **Local**, interactive | Publishes a spec issue |
| breakdown | `to-tickets` | **Local**, interactive | Publishes sub-issues with blocking edges, labelled `ready-for-agent` |
| implement | `implement` → `tdd` | **Factory** | Frontier tickets only |
| review | `code-review` | **Factory** (Phase 3) | A separate, fresh session without the implementer's context |
| merge | `pr` + branch protection | Human, or factory at L4 | Never automatic for protected paths |
| learn | `retro` | **Local** at first | Run after reviewing a batch of factory PRs |

**The hand-off.** Because Nick runs `to-tickets` under his own GitHub identity, the `ready-for-agent` label is applied by a trusted collaborator, which is exactly what the factory requires before pickup.

**When a ticket is unclear.** The agent doesn't guess. It writes its questions to `.factory/questions.md` and stops. The operator posts them on the issue, swaps the label to `needs-info`, and Nick answers locally and relabels.

### Autonomy presets

Autonomy governs the factory's side only: pickup, review and merge.

- **L1 Assist:** the factory acts on one ticket at a time, only when Nick labels it. PRs stay draft.
- **L2 Supervised:** the factory picks up every `ready-for-agent` ticket and Nick reviews every PR. *(Phase 1 runs here.)*
- **L3 Delegated:** an agent review pre-filters each PR; Nick only approves the merge.
- **L4 Autonomous:** auto-merge when checks pass, the diff touches no protected path, and the change is low blast radius.
- **L5 Dark:** everything auto. Demo only, on a toy repo.

Gate modes are modelled as fields on `Project` from Phase 1, fixed at L2, so later phases extend the model without redesigning it.

Triage labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`.

---

## 5. Architecture

```
┌─────────────── GitHub ──────────────────┐
│ issues · labels · comments · PRs · checks│
└───▲──────────────▲──────────────┬───────┘
    │ writer       │ operator     │ polling (webhooks later)
    │ (code write) │ (labels,     │
    │              │  comments)   │
┌───┴──────────────┴──────────────▼───────┐
│ coding-agent-operator (Go)               │
│  Project · StageRun · FactoryConfig      │
│  gates · attempts · timeouts · slots     │
└───────┬──────────────────────────────────┘
        │ Runtime interface
┌───────▼──────────────────────────────────┐
│ Job (Phase 1) → agent-sandbox (later)    │
│  agent pod: claude -p + pinned skills    │
│  workspace volume · read-only token      │
└──────────────────────────────────────────┘
```

### 5.1 Custom resources

**Start (Phase 1):**

- **`Project`**: GitHub repo, App installation ref, label mapping, agent image, model per stage, gate modes, attempt and timeout limits, `paused`.
- **`StageRun`**: stage, issue ref, attempt, runtime ref, workspace ref, status (phase, session ID, tokens, branch, PR, failure class).
- **`FactoryConfig`** (cluster singleton): `paused`, `pauseMode`, session slots, schedule windows.

**Promote to their own resources only when needed:**

| Resource | Add when |
|---|---|
| `WorkItem` | Phase 2: blocking edges and frontier scheduling need a per-issue projection |
| `AutonomyPolicy` | Phase 3: a second project wants to share a policy |
| `ToolchainProfile` | Phase 4: a second language mix exists |
| `EvalRun` | Phase 6, if evals run in-cluster |
| `Harness` | v2: a second harness exists |

### 5.2 Go interfaces (one implementation each in v1)

```go
type Harness interface {   // v1: cli-claude
    Run(ctx context.Context, req RunRequest) (<-chan Event, error)
    Resume(ctx context.Context, handle ResumeHandle, input string) (<-chan Event, error)
    Result(ctx context.Context) (Result, error) // status, tokens, session ID
}

type Tracker interface {   // v1: GitHub App
    ListReadyIssues(ctx context.Context, p ProjectRef) ([]Issue, error)
    Comment(ctx context.Context, issue IssueRef, body string) error
    SetLabels(ctx context.Context, issue IssueRef, add, remove []string) error
    OpenPR(ctx context.Context, req PRRequest) (PR, error)
    CheckStatus(ctx context.Context, pr PRRef) (CheckResult, error)
}

type Runtime interface {   // Phase 1: Job. Later: agent-sandbox
    Start(ctx context.Context, spec SessionSpec) (SessionRef, error)
    Status(ctx context.Context, ref SessionRef) (SessionStatus, error)
    Stop(ctx context.Context, ref SessionRef) error
}
```

These are sketches. Keep them shaped by what Claude Code and GitHub need, and revisit them when a second implementation arrives.

`cli-claude` driver **(verify flags at build time)**: `claude -p`, `--output-format stream-json`, `--resume <session-id>`, `--permission-mode` and `--allowedTools` set per stage.

### 5.3 Output contract: derive, don't ask

The agent isn't asked to write a JSON list of actions. The operator derives outcomes from the workspace and the event stream:

| Outcome | Derived from |
|---|---|
| Status, tokens, session ID | The driver's event stream and exit code |
| Code changes | Commits on the run's branch in the workspace |
| PR body | `.factory/pr-body.md`, free-form markdown in the `pr` skill's shape |
| Questions for a human | `.factory/questions.md` (unclear ticket; the operator posts them and labels `needs-info`) |
| Hand-off context | `.factory/handoff.md` (the `handoff` skill) |

A missing PR body gets a generated fallback rather than failing the run. **(verify)** Claude Code's structured-output option could replace the files later.

### 5.4 Local planning and the ticket contract

**(decision)** In v1 the factory runs no planning stages. This removes async grilling, session suspend and resume, and any agent token that can write issues.

**Day-to-day flow:**
1. Nick opens Claude Code in the consumer repo and runs `/grill-with-docs` → `/to-spec` → `/to-tickets`.
2. `to-tickets` publishes sub-issues with blocking edges and the `ready-for-agent` label.
3. The factory picks up each ticket once its blockers are merged (Phase 1: any labelled ticket; Phase 2: frontier-aware).
4. Nick reviews PRs, answers any `needs-info` questions, and runs `/retro` on the batch.

**Ticket readiness check (Phase 2).** Before pickup the operator checks the ticket against a short checklist, drafted in Phase 0: acceptance criteria present, blockers closed, no protected-path work implied. Failing tickets are labelled `needs-info` with the reason, and no session is spent on them.

**Tokens.** Agent pods are read-only. Only the writer can push and open PRs, and only the operator posts comments and labels.

**Later, optional.** Moving planning into the factory needs async question-and-answer over issue comments, suspend and resume, and an issues-only token for planning pods. It's listed as an optional phase in §11.

### 5.5 Verify gate

1. The writer pushes the branch and opens a **draft** PR.
2. The consumer repo's CI runs `make verify` as a required check.
3. The controller watches the check result.
   - Pass: mark the PR ready for review.
   - Fail: start one follow-up run with the failure log, then escalate to `ready-for-human`.

The controller never executes repo code itself.

### 5.6 Scheduling and quota

- The Max subscription is shared between projects **and with Nick's own Claude Code use**.
- `FactoryConfig` sets the number of session slots (1–2 at home) and **schedule windows** when the factory may start runs, for example overnight and working hours away from the desk.
- On "usage limit reached", the run is requeued until the window resets and no new runs start.
- Remaining quota can't be read programmatically **(verify)**, so the reserve is enforced by slots, windows and backoff.
- Fair share across projects arrives in Phase 5.

---

## 6. Plugins and the consumer contract

**Consumer repo contract (from Phase 0):**
- `make verify`, under about 3 minutes, also run as a required CI check.
- `CLAUDE.md` with project conventions.
- `.factory.yaml`: agent image, autonomy level, model per stage.
- `.mise.toml` pinning tool versions.
- Branch protection on `main`.

**Plugins are extracted, not designed up front.** Skills and hooks start inside the first consumer repo and the agent image. When the second consumer repo arrives (Phase 4), they move into `plugins/` in the factory repo with a Claude Code marketplace manifest.

| Plugin | Reuse | Write | Hooks / verify |
|---|---|---|---|
| `factory-go` | `gopls-lsp` (official) | `go-conventions`, `controller-runtime` | gofmt/goimports on edit; `go vet`, `golangci-lint`, `go test -race` |
| `factory-python` | `pyright-lsp` (official) | `python-conventions` | `ruff`, `pyright`, `pytest`; block bare `pip install` |
| `factory-terraform` | `hashicorp/agent-skills` | — | `fmt`, `validate`, `tflint`, `terraform test`; deny `apply`/`destroy` |
| `factory-k8s` | vetted community skills | `k8s-hardening` | `kubeconform`, `kube-linter`, server dry-run on kind |

Release flow once extracted: PR → small eval gate → path-scoped tag → Renovate bumps consumers. Canary channels are added only if a bad release ever causes real pain.

---

## 7. Credentials **(verify before each phase)**

- **Claude at home:** Max plan, unmodified `claude` binary, `claude setup-token` → `CLAUDE_CODE_OAUTH_TOKEN` in a Kubernetes Secret. As of Nov 2026, signed-in `claude -p` draws from subscription limits. Plan limits assume ordinary, individual use, so the factory stays personal-scale.
- **Claude in CI and evals:** an API key. CI never uses the subscription.
- **Claude for enterprise or multi-user:** API keys per user or team.
- **GitHub:** one GitHub App installed per consumer repo. Short-lived installation tokens: read-only for agent pods, write for the writer.

The subscription terms changed several times in 2026. This is the largest external risk; the fallback is the API key switch.

---

## 8. Security model

- **Untrusted input.** Issue and PR text can carry prompt injection. Prompts fence it as untrusted, and only issues labelled by a repo collaborator are processed.
- **Credential separation.** Agent pods: read-only. Writer: contents and PRs. Operator: comments and labels. No pod holds cloud credentials.
- **Protected paths.** A diff touching any of these is flagged, labelled `ready-for-human` and never auto-merged: `Makefile`, `.github/**`, `.claude/**`, `.factory.yaml`, `.mise.toml`, `CODEOWNERS`, and lint or test configuration. CODEOWNERS enforces the same on GitHub's side.
- **Pod hardening.** Non-root, seccomp, no host mounts, resource limits, per-stage `--allowedTools`.
- **Network.**
  - Phase 1: NetworkPolicy blocks cluster-internal and private ranges and allows the internet.
  - Hardening: default-deny egress through a domain-allowlisting proxy, because NetworkPolicy filters by IP, not domain.
  - Residual risk: an allowed package registry is still an exfiltration path.
- **Runtime isolation.** Standard containers at home; gVisor or Kata `RuntimeClass` on enterprise nodes. At home these would need Linux installed directly on the Mac mini (see the reference).
- **Kill switch.** `FactoryConfig.spec.paused` and `Project.spec.paused`, with `drain` or `abort`.
- A threat model is kept as an ADR and updated each phase.

---

## 9. Evals (kept small)

- **Authoring:** Anthropic's `skill-creator` for with-and-without comparisons.
- **Golden tasks:** 5–10 tasks in Harbor format, seeded from Phase 0 issues, run on plugin or prompt changes and on Claude Code version bumps.
- **Reported:** pass rate, tokens, turns and duration, as a PR comment.
- **Deferred:** in-cluster `EvalRun`, statistical promotion gates, canary channels, promptfoo PR gates. Add them only when the simple suite stops being enough.

---

## 10. Stack summary

| Layer | Choice | Later / alternatives |
|---|---|---|
| Operator | Go, kubebuilder / controller-runtime | — |
| Runtime | Kubernetes Jobs | agent-sandbox in hardening (isolation, warm pools) |
| Local cluster | k3d on Colima or OrbStack | — |
| CI cluster | kind | — |
| Harness | Claude Code | v2: Codex CLI, Gemini CLI, ACP |
| Tracker | GitHub App, polling | Webhooks + tunnel in Phase 2; v2: GitLab |
| Image builds | ko (Go images), docker buildx (agent image) | Revisit on a trigger; see reference |
| Observability | `StageRun` status + Prometheus metrics | Grafana and OTel traces in Phase 6 |
| Packaging | Kustomize from kubebuilder | Helm chart in Phase 7 |
| Evals | Harbor-format golden tasks | Inspect, promptfoo |
| Dependency bumps | Renovate | — |

**Home hardware:** a 2018 Mac mini (Intel Core i5, 6 cores, 32 GB). Images are **amd64**, the same as CI and enterprise clusters. Sized for 1–2 session slots; CPU is the limit, not memory. Details in the reference.

Prior art to borrow from: **Kelos** (agent image interface), **Sandcastle** (branch and worktree strategy), **gh-aw** (read-only agents with a separate writer), **Claude Code GitHub Actions**, **StrongDM** (holdout scenarios).

---

## 11. Roadmap

Estimates assume one engineer part-time and are rough; expect slippage. Each phase ends with something demoable.

| # | Phase | Outcome | Estimate |
|---|---|---|---|
| 0 | **Prove the loop** | A script runs `claude -p` in one container on a seeded issue and opens a PR. Transcripts and token measurements captured | ~1 wk |
| 1 | **Thin operator MVP** | Label an issue → draft PR → CI gate, on k3d, at L2 | 3–5 wks |
| 2 | **Frontier pickup** | The factory follows the blocking edges on locally created tickets and picks each one up as its blockers merge. Adds the readiness check, `needs-info` hand-back, `WorkItem`, webhooks | 2–3 wks |
| 3 | **Review and autonomy** | Review stage, L1–L4 presets, protected paths, auto-merge rules | 2–3 wks |
| — | *Minimum portfolio v1 complete* | | |
| 4 | **Plugin extraction** | Second consumer repo; `factory-go` and marketplace; `ToolchainProfile` | 2 wks |
| 5 | **Multi-project scheduling** | Fair-share slots, reserve windows, third consumer | 2 wks |
| 6 | **Evals and dashboards** | Golden-task suite, Grafana, traces | 2 wks |
| 7 | **Hardening** | Helm, egress proxy, agent-sandbox, gVisor/Kata, signing, remaining plugins | ongoing |
| 8 | **In-factory planning (optional)** | Async triage and grilling over issue comments, with suspend and resume | — |
| v2 | **Multi-harness, GitLab** | Codex and Gemini drivers, GitLab tracker | — |

**Cut lines:** Phase 1 alone is a valid demo. Phases 0–3 are the portfolio v1. Drop Phase 5 first, then shrink Phase 6 to "golden tasks only".

---

## 12. Open questions (grill these)

1. When GitHub and a `StageRun` disagree, which wins and how is drift detected?
2. What makes a ticket agent-ready? Define the checklist the factory applies before pickup.
3. When an agent finds a ticket unclear mid-run, should it always stop and ask, or may it proceed on stated assumptions for small gaps?
4. What counts as "low blast radius" for L4: the `pr` skill's one-way/two-way door call, file paths, or diff size?
5. Per-ticket branches, or `implement-spec` across the frontier on one integration branch?
6. Is a fresh Claude session on a different model independent enough for review?
7. Which schedule windows and slot count protect Nick's own Claude Code use?
8. How many tickets fit in one Max usage window? (Phase 0 measures this.)
9. Prebuilt agent images per language mix, or tools installed per repo from `.mise.toml`?
10. Monorepo for plugins long-term, or split once consumers exist?
11. How is the factory's own development kept from crowding out consumer work?
12. What is the default protected-path list, and can a project extend but never shrink it?
13. Which Kubernetes API group? It must be a DNS name Nick controls (for example `agents.<domain>`), chosen before the first CRD is generated, because renaming it later is painful.
14. Do plugins keep the `factory-*` prefix (`factory-go`, `factory-workflow`), or take a prefix tied to the project name?

---

## 13. How to use this brief with Matt Pocock's skills

1. In this repo, run **`/setup-matt-pocock-skills`** (GitHub tracker, docs in `docs/`).
2. Run **`/grill-with-docs`** on §0, §2, §5 and §12 of this brief (and §14 to decide which ideas survive), then on the Phase 0 and Phase 1 specs. Let it create `GLOSSARY.md` from §3 and an ADR for each **(decision)**.
3. Do Phase 0 by hand, following its spec.
4. For Phase 1 onward, run **`/to-spec`** then **`/to-tickets`** per phase, and build with **`/implement`** → **`/tdd`** → **`/code-review`**.
5. After each session, run **`/retro`** and feed improvements back into the docs and plugins.

---

## 14. Feature brainstorm (unprioritized candidates)

These are ideas, not commitments. Each one must earn its place by improving the north-star metric or the governance story in §0. Grill them, then promote the survivors into a phase spec. "Phase" is where the idea would naturally land.

### 14.1 Observability: metrics

The headline number is **tokens per merged PR**, not tokens per run: it charges failed and abandoned runs to the work that shipped.

| Metric | What it tells you | Phase |
|---|---|---|
| Lead time: label → draft PR → merge | Whether the factory is actually faster than doing it yourself | 1 |
| First-pass CI rate | Share of runs whose first PR passes the required check | 1 |
| Merge rate and rework rate | PRs merged as-is vs. needing human commits or a follow-up run | 3 |
| Human edit distance | Lines you changed before merging; the best proxy for output quality | 6 |
| Escalation rate by failure class | Where the factory hands back, and why | 1 |
| Tokens per merged PR, by project, stage and model | Real cost of shipped work | 6 |
| Cache-read share of input tokens | Whether prompt caching is working | 6 |
| Queue wait and slot utilisation | Whether slots or quota are the bottleneck | 5 |
| Usage-limit hits per window | How close the factory runs to the subscription ceiling | 1 |
| Review latency | Time PRs wait for you; shows when *you* are the bottleneck | 3 |

### 14.2 Observability: traces and logs

- **One trace per ticket.** Spans for queue wait, session, each tool call, the writer and the CI gate, so a slow or expensive run can be read at a glance. **(verify)** Claude Code's built-in OpenTelemetry export, which may supply much of this without custom parsing.
- **Transcript archive.** Every session's event stream is stored, redacted and linked from the PR and the `StageRun`. Retention is set per project.
- **Run summary on the PR.** Model, plugin versions, tokens, duration, attempts, and a link to the transcript.
- **Reproducibility record.** Each run stores the exact Claude Code version, model, skills and plugin versions, prompt template hash and base commit, so any result can be explained or re-run.
- **Secret scanning of transcripts and diffs** before anything is stored or pushed.
- **Run replay.** Feed a stored transcript to `fake-claude` to reproduce an operator bug without spending tokens.
- **Audit log.** Who labelled, who approved, what the writer pushed, and which gate allowed it.

### 14.3 Self-improvement from output quality

The loop: outcomes are measured, patterns are found, a change is proposed as a PR, a human approves it, and evals confirm it helped. The factory never changes its own skills or gates unreviewed.

- **Outcome capture.** For each merged or rejected PR, record CI results, review comments, human edits and the escalation reason.
- **Failure clustering.** A periodic job groups failed and reworked runs by cause (vague ticket, missing convention, flaky test, wrong tool use) and reports the top causes.
- **Retro to plugin PR.** `retro` runs over a batch of outcomes and proposes changes to a skill, a hook or `CLAUDE.md`. These always need human approval (protected paths).
- **Real failures become golden tasks.** A ticket the factory got wrong is frozen as an eval task, so the fix is proven and regressions are caught.
- **Review comments become rules.** A correction you make twice in review is proposed as a convention or a hook, so it's enforced rather than repeated.
- **Ticket quality score.** Correlate ticket features (length, acceptance criteria, size) with outcomes, and feed the findings back into the readiness checklist and how `to-tickets` is used.
- **Prompt and model experiments.** Run two prompt templates or models on comparable tickets and compare first-pass rate and tokens per merged PR.
- **Repo learnings file.** Agents append short, reviewed notes about the codebase that later sessions read, giving cheap memory across runs.

### 14.4 Token efficiency

- **Don't start doomed runs.** The readiness check and blocker check are the cheapest savings available: a rejected ticket costs zero tokens.
- **Model routing.** A smaller model for simple tickets and mechanical stages, a stronger one for hard tickets and review. Start with a per-ticket label; later, route by measured outcomes.
- **Loop and stall detection.** Stop a session that repeats the same failing command or makes no progress for N turns, rather than waiting for the timeout.
- **Turn and token budgets per stage**, enforced by the driver from the event stream.
- **Context hygiene.** Lean `CLAUDE.md`, skills loaded on demand, and hooks that return short, relevant errors, not full logs.
- **Warm workspaces.** Cached clones, module and build caches, so sessions don't spend turns and minutes on setup.
- **Cache-friendly prompts.** Keep the stable part of stage prompts first so prompt caching applies. **(verify)** How caching behaves under `claude -p`.
- **Retry with a hand-off, not a restart.** A follow-up attempt gets a short summary of what failed, not a cold start or the whole previous transcript.
- **Small tickets by policy.** A PR size limit; oversized work is sent back for splitting.
- **Off-peak scheduling.** Run when you aren't using the subscription yourself.

### 14.5 Plugin architecture for skills

- **A plugin is the unit of delivery:** skills, hooks, LSP config and the `verify` integration, versioned together.
- **Per-project and per-stage selection.** A `Project` lists its plugins and versions; each stage loads only the skills it needs.
- **Pinned by version, baked by digest.** Agent images are built from an exact plugin set, so a run's behaviour is reproducible.
- **Plugin contract tests.** Each plugin ships eval tasks; a release must pass them, and a Claude Code version bump re-runs them.
- **Compatibility matrix.** Which plugin versions work with which Claude Code and skills versions.
- **Third-party plugins behind a vetting step.** Reuse official and vendor plugins (LSP, HashiCorp), pinned and reviewed, never pulled live.
- **Hook contract.** Hooks give fast feedback and block dangerous commands, but are never the gate. Standard exit codes and short output.
- **MCP servers as plugin parts,** allowlisted per project and stage, since each one widens what an agent can reach.
- **Stage templates in a plugin.** The stage prompts live in `factory-workflow`, so the workflow itself is versioned and testable.
- **Harness-neutral core.** Skills follow the open SKILL.md format, so v2 harnesses reuse them; only hooks are Claude-specific.

### 14.6 Other problems worth a look

| Problem | Idea |
|---|---|
| Parallel agents conflict on the same files | Schedule from blocking edges; optionally serialise tickets touching the same paths |
| You become the review bottleneck | WIP limit on open factory PRs; pickup pauses when the limit is hit |
| Flaky tests waste attempts | Detect a failure that passes on re-run, mark it flaky, don't count the attempt |
| Duplicate or stale work | Skip tickets whose branch or PR already exists; close stale factory branches |
| Agent drifts beyond the ticket | Scope check: flag diffs touching files unrelated to the ticket |
| Dependency and supply-chain changes | New or upgraded dependencies always flagged for human review |
| Knowing when something needs you | Notifications for escalations and ready PRs (GitHub, phone push), with a daily digest |
| Cost attribution across projects | Tokens and API-price equivalent per project and per ticket |
| Trust in the result | A short "what I did and what I'm unsure about" section in every PR body |
| `CLAUDE.md` goes stale | A periodic check that documented commands and paths still exist |

### 14.7 Suggested first picks

If only a few make it into v1, take the ones that are cheap and feed everything else:

1. **Reproducibility record and run summary on the PR** (Phase 1). Almost free, and every later analysis depends on it.
2. **The Phase 1 metrics** in §14.1. They decide whether the project is working.
3. **Readiness check and loop detection** (Phase 2). The largest token savings for the least code.
4. **Outcome capture** (Phase 3). Start recording early, even before anything consumes it.
5. **WIP limit** (Phase 3). Protects your review time, the scarcest resource.
