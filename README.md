# coding-agent-tools

Plugins and tools for working with coding agents: plan the work with less reading, then let the agent implement it unattended.

> **Status: design phase.** No code yet. The design lives in [`docs/`](docs/). The architect's slice 1 is next, then the factory's Phase 0.

## What it is

A monorepo with three products. You plan the work with the agent; the tools make that planning easy to follow and then carry out the result safely while you're away.

### Architect

A local tool that runs beside a Claude Code planning session. It keeps the session's decisions as data, not chat transcript, and shows them as a decision graph and diagrams in the browser. See the [architect brief](docs/planning-tool-brief.md).

### Factory

A Kubernetes operator that runs Claude Code on planned GitHub tickets and delivers draft pull requests, with security, cost and quality enforced by the platform rather than by the prompt. See the [factory brief](docs/brief.md).

### Plugins

Versioned Claude Code plugins (skills, hooks, verify integration) shared by the projects the factory works on. Extracted once a second consumer repo exists.

## Why it exists

Coding agents can now implement a well-scoped ticket on their own. Two things still get in the way.

**Planning is hard to follow.** A planning session with an agent produces long walls of text. The architecture and the decisions being made get buried, even though planning is where they're decided. The architect improves communication between you and the agent during planning. It shows the agent's proposals and the settled decisions as a graph and diagrams, and it sends your answers back as structured choices, not free text.

**Agents can't supervise themselves.** Today the choice is to babysit each session at the terminal, or to run a loose script and hope. Running an agent on an issue is commodity. What the factory adds is **governed, unattended execution**: policy, isolation, quota, recovery and visibility around the agent. Plan the work, label the tickets, walk away, and come back to pull requests produced inside limits the platform enforces.

## Problems it solves

| Problem | Answered by |
|---|---|
| **Planning is a wall of text.** Decisions and architecture are hard to see, and answers given in free text are easy to misread | Architect: decisions as data, a decision graph, diagrams, and structured answers |
| **Agents need a babysitter.** Interactive sessions tie you to the keyboard, and planned tickets sit idle | Factory picks up ready tickets in dependency order and works through them unattended |
| **Unattended agents are a security risk.** Bypassed permissions, a write token and untrusted issue text are one prompt injection from damage | Agents hold read-only credentials; a separate writer pushes code; network is restricted; only tickets labelled by a trusted person are picked up |
| **Agents can grade their own homework** by weakening the tests or CI that judge them | Changes to build, CI and agent config always go to a human; pass or fail comes from the repo's required CI check |
| **Runaway sessions burn tokens and quota**, including the limits you need for interactive work | Timeouts, attempt limits, session slots and schedule windows; usage limits are waited out |
| **Scripts don't survive real life**: restarts, duplicate events, half-finished runs | Desired-state reconciliation re-adopts runs, ignores duplicates, retries with backoff and cleans up |
| **Nobody can see what happened**, or what it cost | Every run records what it did, its tokens, model and versions, and why it stopped |
| **Quality doesn't improve by itself.** The same mistakes recur across sessions | Outcomes (CI results, review comments, human edits) feed back into skills, hooks and ticket-writing habits |
| **Skills and hooks drift across repos** | Versioned plugins, pinned per project and tested before release |
| **Vendor agents run on the vendor's terms**: their runners, billing and policy | Runs on your own cluster, from a Mac mini to enterprise Kubernetes, with your credentials and rules |

## How we'll know it worked

**Merged PRs per week in consumer projects.** This is the factory's north-star metric. PRs to this repo don't count, so the factory can't score by working on itself. There's no target yet: Phase 1 gives the first baseline.

The architect affects this number only indirectly, through better tickets. How to measure its own effect on communication between you and the agent is still open ([issue #9](https://github.com/ncapps/coding-agent-tools/issues/9)).

## The method

1. **You plan.** Shape the work interactively with Claude Code and [Matt Pocock's skills](https://github.com/mattpocock/skills) (`/grill-with-docs` → `/to-spec` → `/to-tickets`), with the architect alongside. The tickets are the hand-off.
2. **The factory executes.** It picks up tickets labelled `ready-for-agent`, runs Claude Code in an isolated pod, and opens a draft PR.
3. **Your CI decides.** The repo's required check gates the PR, and you review and merge.

The same design runs on a single Mac mini (k3d) and on enterprise Kubernetes.

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
