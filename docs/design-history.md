# Design History

How the design reached its current shape (Nov 23–26, 2026), written so later sessions don't reopen settled questions without new information. The brief is the source of truth; this file records the **why** and the **rejected alternatives**.

## Goals that shaped everything

- Personal project **and** a platform-engineering portfolio piece for a job search.
- Runs on a Mac mini at home; deployable to enterprise Kubernetes.
- Matt Pocock's skills drive the workflow; autonomy is configurable.
- Runs on a Claude Max subscription at home.
- One factory serves many portfolio repos and maintains their plugins.

## Decisions and their reasons

| # | Decision | Reason | Rejected alternatives |
|---|---|---|---|
| 1 | **Thin custom Go operator**, reusing existing parts | Hard problems are gates, recovery and limits, which a reconciler models naturally. A designed API is the strongest portfolio signal | Argo Workflows / Events, Tekton (glue sprawls, CI-shaped); Temporal (doubles moving parts on a Mac mini); forking Kelos (upstream-dependent); Python operator (weaker K8s signal) |
| 2 | **v1 = GitHub + Claude Code only**, behind interfaces | Scope for one part-time engineer | Multi-harness (Codex, Gemini) and GitLab in v1; moved to v2 |
| 3 | **Planning stays local and interactive**; the operator only executes tickets | `grill-with-docs`, `to-spec`, `to-tickets` are conversations; forcing them through issue comments was the most fragile part of the plan | Async grilling via comments with suspend/resume; a `gh` shim; issues-write tokens for planning pods |
| 4 | **Prove the loop first (Phase 0)** with a script and one container | The workflow was unproven headless; real transcripts and token numbers are needed before designing the operator | Starting with the operator |
| 5 | **Start with 3 resources** (`Project`, `StageRun`, `FactoryConfig`), add others only when a phase needs them | One implementation each doesn't justify a resource | Seven CRDs up front (`Harness`, `ToolchainProfile`, `AutonomyPolicy`, `WorkItem`, `EvalRun`...) |
| 6 | **Kubernetes Jobs first**, agent-sandbox later behind a `Runtime` interface | agent-sandbox is alpha; its main benefit (suspend/resume) left with decision 3 | agent-sandbox from day one |
| 7 | **Agents hold read-only credentials**; a separate writer pushes and opens PRs; the operator posts labels and comments | Limits prompt-injection damage (the "lethal trifecta") | Agent with write token |
| 8 | **Outputs derived from git state and the event stream**, plus a few markdown files | Agent-written JSON action lists are fragile | Schema-validated `output.json` action list |
| 9 | **The consumer repo's required CI check is the gate** | The controller never executes untrusted repo code | Controller re-running `make verify` itself |
| 10 | **Protected paths** (build, CI, agent config) always go to a human | Agents must not weaken their own gate | — |
| 11 | **Gate approvals only from trusted humans** | Bot-applied labels must not satisfy gates | — |
| 12 | **Session slots and schedule windows** reserve subscription capacity | The factory shares the Max plan with Nick's own interactive use | Fair-share only between projects |
| 13 | **Polling first**, webhooks and a tunnel later | No inbound networking needed from home for the MVP | Webhooks from day one |
| 14 | **ko for Go images, buildx for the agent image**; re-compare only on a trigger | An up-front 7-tool comparison was not worth the time | Mandatory comparison spike in Phase 1 |
| 15 | **Evals kept small**: Harbor-format golden tasks, `skill-creator` | Statistical gates and canaries cost tokens and are ceremony at this scale | Building an eval engine; in-cluster eval platform in v1 |
| 16 | **Plugins extracted when a second consumer repo exists** | Avoid designing a marketplace before there's a second user | Marketplace and canary channels up front |
| 17 | **CI never uses the subscription**: `fake-claude` replays recorded transcripts; a nightly contract test uses an API key | Cost, and keeping the subscription for ordinary individual use | Real `claude` in CI |
| 18 | **Home hardware: 2018 Intel Mac mini**, images amd64 | Matches CI and enterprise; no multi-arch needed at home | Apple Silicon assumptions |
| 19 | **Positioning: governed, unattended execution** | Orchestration alone is commodity (Kelos, gh-aw, Copilot agent, Sandcastle) | Pitching orchestration or throughput |
| 20 | **Name: `coding-agent-operator`** | See ADR 0001 | `factory`, `jidoka`, `nightshift`, nautical names |

## Facts gathered (re-verify before relying on them)

- **Claude Max:** signed-in `claude -p` draws from subscription limits; a planned June 15, 2026 move to a separate Agent SDK pool was paused. Max includes monthly API credits usable through a linked Console API key. Limits assume ordinary, individual use.
- **Gemini CLI** stopped serving Google AI Pro/Ultra subscriptions on June 18, 2026 (relevant for v2).
- **Matt Pocock's skills** were renamed in 2026 (`to-prd` → `to-spec`, `to-issues` → `to-tickets`). His `triage` skill defines the label set reused here.
- **Prior art:** Kelos (Go K8s operator for coding agents; no GitLab, no autonomy policy), Sandcastle (Pocock's sandboxed AFK runner), GitHub Agentic Workflows (read-only agents with "safe outputs"), kubernetes-sigs/agent-sandbox (alpha).
- **Eval tools:** Inspect is the closest to a standard (UK AISI, used by METR and others); Harbor is the official harness for Terminal-Bench 2.0; OpenAI announced its acquisition of Promptfoo in March 2026.

## Lessons from others to keep in mind

- **Gas Town:** a factory can end up mostly building itself. The north-star metric counts merged PRs in consumer repos only.
- **StrongDM:** unattended autonomy is bought with validation (holdout scenarios), not orchestration.
- Human review becomes the bottleneck. Keep tickets small and cap open factory PRs.

## Next steps

1. Push this repo to GitHub as `ncapps/coding-agent-operator`.
2. Install Matt Pocock's skills and run `/setup-matt-pocock-skills`.
3. `/grill-with-docs` on brief §0, §2, §5 and §12, then the Phase 0 and Phase 1 specs. Settle open questions 13 (API group) and 14 (plugin prefix) early.
4. Start Phase 0.
