# coding-agent-operator

A Kubernetes operator that runs Claude Code on planned GitHub tickets and delivers reviewed pull requests, with security, cost and quality enforced by the platform rather than by the prompt.

> **Status: design phase.** No code yet. The design lives in [`docs/`](docs/), and Phase 0 is next.

## Why

Coding agents can now implement a well-scoped ticket on their own. What they can't do is supervise themselves. This operator is the supervisor:

1. **You plan.** Shape the work interactively with Claude Code and [Matt Pocock's skills](https://github.com/mattpocock/skills) (`/grill-with-docs` → `/to-spec` → `/to-tickets`). The tickets are the hand-off.
2. **It executes.** The operator picks up tickets labelled `ready-for-agent`, runs Claude Code in an isolated pod, and opens a draft PR.
3. **Your CI decides.** The repo's required check gates the PR, and you review and merge.

Running an agent on an issue is commodity. What this project adds is **governed, unattended execution**:

- Agents hold read-only credentials; a separate writer pushes code.
- Changes to build, CI and agent config always go to a human.
- Timeouts, attempt limits, session slots and schedule windows protect your tokens and subscription limits.
- Desired-state reconciliation survives restarts, duplicate events and half-finished runs.
- Every run records what it did, what it cost and why it stopped.

The same design runs on a single Mac mini (k3d) and on enterprise Kubernetes.

## Documents

| Document | Contents |
|---|---|
| [Brief](docs/brief.md) | Why, principles, architecture, roadmap, open questions, feature brainstorm |
| [Phase 0 spec](docs/specs/phase-0.md) | Prove the loop with one container, no Kubernetes |
| [Phase 1 spec](docs/specs/phase-1.md) | Thin operator MVP |
| [Reference](docs/reference.md) | Dependencies, image builds, home hardware, backlog, risk register |
| [Design history](docs/design-history.md) | How the design got here, and what was rejected |
| [ADRs](docs/adr/) | Settled decisions |

## Roadmap

Phases 0–3 make the minimum v1: prove the loop, thin operator MVP, frontier pickup, then review and autonomy policy. See [brief §11](docs/brief.md#11-roadmap).

## License

[Apache-2.0](LICENSE)
