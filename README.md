# coding-agent-tools

Plugins and tools for working with coding agents: plan the work with less reading, then let the agent implement it unattended.

> **Status: design phase.** No code yet. The design lives in [`docs/`](docs/). The architect's slice 1 is next, then the factory's Phase 0.

## The method

1. **You plan.** Shape the work interactively with Claude Code and [Matt Pocock's skills](https://github.com/mattpocock/skills) (`/grill-with-docs` → `/to-spec` → `/to-tickets`). The tickets are the hand-off.
2. **The factory executes.** It picks up tickets labelled `ready-for-agent`, runs Claude Code in an isolated pod, and opens a draft PR.
3. **Your CI decides.** The repo's required check gates the PR, and you review and merge.

## What's in this repo

### Architect

A local tool that runs beside a Claude Code planning session. It keeps the session's decisions as data, not chat transcript, and shows them as a decision graph and diagrams in the browser, so planning is something you can see instead of a wall of text. See the [architect brief](docs/planning-tool-brief.md).

### Factory

A Kubernetes operator that runs Claude Code on planned GitHub tickets and delivers draft pull requests, with security, cost and quality enforced by the platform rather than by the prompt.

Running an agent on an issue is commodity. What the factory adds is **governed, unattended execution**:

- Agents hold read-only credentials; a separate writer pushes code.
- Changes to build, CI and agent config always go to a human.
- Timeouts, attempt limits, session slots and schedule windows protect your tokens and subscription limits.
- Desired-state reconciliation survives restarts, duplicate events and half-finished runs.
- Every run records what it did, what it cost and why it stopped.

The same design runs on a single Mac mini (k3d) and on enterprise Kubernetes.

### Plugins

Versioned Claude Code plugins (skills, hooks, verify integration) shared by the projects the factory works on. Extracted once a second consumer repo exists.

## Documents

| Document | Contents |
|---|---|
| [Glossary](GLOSSARY.md) | Terms for the architect and the factory |
| [Architect brief](docs/planning-tool-brief.md) | Why the architect exists, its slices, and the order of work |
| [Factory brief](docs/brief.md) | Why, principles, architecture, roadmap, open questions, feature brainstorm |
| [Phase 0 spec](docs/specs/phase-0.md) | Prove the loop with one container, no Kubernetes |
| [Phase 1 spec](docs/specs/phase-1.md) | Thin operator MVP |
| [Reference](docs/reference.md) | Dependencies, image builds, home hardware, backlog, risk register |
| [Design history](docs/design-history.md) | How the factory design got here, and what was rejected |
| [ADRs](docs/adr/) | Settled decisions |

## Roadmap

1. **Architect, slices 1–3:** read-only decision graph and diagrams, then decision cards, then spec and ticket views.
2. **Factory, Phases 0–3:** prove the loop, thin operator MVP, frontier pickup, then review and autonomy policy. See [brief §11](docs/brief.md#11-roadmap).

Focus moves from the architect to the factory once slice 3 is done and one factory spec has gone through the architect end to end.

## License

[Apache-2.0](LICENSE)
