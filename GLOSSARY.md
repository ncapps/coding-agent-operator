# coding-agent-tools

Plugins and tools for working with coding agents. The maintainer plans the work in interactive sessions; the **architect** makes planning easy to follow, and the **factory** executes the resulting tickets unattended.

## Planning

**Maintainer**:
The trusted person who plans the work, labels tickets for the factory, answers its questions, reviews and merges pull requests, and owns the repo settings.
_Avoid_: owner, user, operator (that is how the factory is built)

**Architect**:
The local tool that runs beside a planning session, keeps its decisions as data and shows them as a decision graph and diagrams.
_Avoid_: planner, planning tool

**Planning session**:
One grilling effort on one topic, from its first question until its tickets are published. It can span several Claude Code sessions.
_Avoid_: grilling session, session (alone)

**Decision**:
A question to settle in a planning session, with its options, its status (open, settled or deferred) and, once settled, its outcome.
_Avoid_: question, item

**Decision graph**:
The working record of a planning session's decisions and the dependencies between them. It exists only while its planning session is open.
_Avoid_: decision tree, design tree

**Decision frontier**:
The open decisions whose prerequisites are all settled: the questions that can be asked now.
_Avoid_: frontier (alone; that means tickets, see Factory)

**One-way door**:
A decision that is costly to reverse. Asked before two-way doors, and never settled by default.
_Avoid_: irreversible decision

**Two-way door**:
A decision that is cheap to reverse. The agent proposes a default and moves on unless the maintainer objects.
_Avoid_: reversible decision

**Deferred decision**:
A decision deliberately left unsettled when its planning session closes. It becomes a tracker issue so it isn't lost.

**Spec**:
A working document that describes one piece of work in enough detail to verify the design and split it into tickets. Closed once its tickets are done.
_Avoid_: PRD

**Ticket**:
A tracker issue for one independently shippable piece of work, with acceptance criteria and blocking edges. The only thing the factory receives from planning.
_Avoid_: task, story

**Board**:
The GitHub project that shows every open issue in one column. It is a copy: labels, sub-issues, blockers and pull requests are the truth, and the board is synced to match them.
_Avoid_: project (alone), kanban

**Column**:
Where an issue sits on the board: Backlog, Ready, In progress, In review or Done. Grilling, writing a spec and splitting it into tickets all happen to issues in Backlog; tickets start in Ready.
_Avoid_: status, state, lane

**Slice**:
One increment of the architect that is usable on its own, such as slice 1 (read-only).
_Avoid_: phase (that means the factory roadmap)

**Brief**:
Notes from design sessions held before grilling, kept only until they have been turned into specs and ADRs.

## Factory

**Factory**:
The Kubernetes operator that picks up tickets, runs agent sessions on them and delivers draft pull requests, together with what it runs on.
_Avoid_: operator (that is how it is built, not its name)

**Phase**:
One step of the factory roadmap, ending in something demoable.
_Avoid_: slice (that means the architect)

**Consumer project**:
A repo on GitHub that the factory works on.

**Harness**:
An agent CLI driven headlessly. In v1, Claude Code.

**Tracker**:
The issue and PR system holding human-visible workflow state. In v1, GitHub.

**Runtime**:
What executes an agent session: a Kubernetes Job at first, agent-sandbox later.

**Stage**:
One step of the workflow, backed by one skill.

**StageRun**:
One agent session executing one stage for one issue.

**Frontier**:
The tickets whose blockers are all done.
_Avoid_: ready queue

**Gate mode**:
How a stage is approved: `manual`, `approve` or `auto`.

**Autonomy level**:
A preset (L1 to L4, L5 for demos only) that maps stages to gate modes.

**Writer**:
The component that pushes branches and opens PRs with a short-lived write token.

**Protected path**:
A file or folder whose change always forces human review.

**Session slot**:
One unit of concurrent Claude Code capacity.

**Reserve**:
Subscription capacity held back for the maintainer's own interactive use.

**Golden task**:
A fixture repo state plus hidden tests, used for evals.
