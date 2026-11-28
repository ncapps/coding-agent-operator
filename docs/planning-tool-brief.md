# Planning tool brief (the architect)

Date: 2026-11-27
Status: accepted direction, details to be grilled
Suggested location: `docs/planning-tool-brief.md`

## Decision

Build a local planning tool in this repository before building the agent
operator, then use the tool to plan the operator.

This reorders the earlier plan, which was to prove the ticket-to-PR loop
first and then build a thin operator MVP. The operator's goals and design
are unchanged. Only the order of work changes.

## Why

- Grilling sessions, specs and tickets are long walls of text. It is hard
  to follow the architecture and the decisions being made.
- Planning is where the architecture gets decided, and I stay responsible
  for those decisions. Better planning tooling pays off on every later
  piece of work, including the operator.
- Using the tool to plan the operator makes the operator its first real
  test.

## What it is

A laptop-only tool that runs alongside a Claude Code session and turns a
planning conversation into something visual and structured. The Matt
Pocock skills (`grill-with-docs`, `to-spec`, `to-tickets`) are the starting
point, not a constraint. The concept can be forked and improved.

Core ideas:

1. **Decision graph file.** Decisions are stored as data, not as chat
   transcript: each question, its options, status, dependencies and ADR
   link. The UI renders from this file, the spec is generated from it, and
   a dead session can resume from it. Planning is finished when no open
   decisions remain.
2. **Grill by exception.** The agent proposes defaults for reversible
   decisions and only interrupts for one-way doors. Defaults are reviewed
   as a batch.
3. **Decision cards.** Each question shows its options, trade-offs, a
   recommendation and what it affects. Answered by click or keyboard.
4. **Diagram diffs.** Architecture, sequence and flow diagrams render from
   a structured component list, so each decision can show before and
   after.
5. **Spec and tickets as views.** Tickets appear as a dependency graph,
   each linked to the decisions that justify it, with an approval board
   before anything is published to GitHub.
6. **Checkpoints.** Every few decisions, a short recap and an updated
   diagram.

## Out of scope for now

- Voice conversation.
- Phone and remote use. The tool only needs to work on the laptop.
- Operator-managed planning sessions, label-driven hand-offs and
  pre-grilling. These stay as ideas for the operator and are revisited
  after the planning tool exists.
- Multi-user use and hosting.

## Shape of the solution (assumptions to test)

- A local web app on localhost, opened in the default browser next to a
  Claude Code CLI session, or in the desktop app's Browser pane through
  `.claude/launch.json`.
- A skill that maintains the decision graph file during grilling.
- For two-way interaction, a small MCP server with a tool such as
  `present_decision`: the agent calls it, the UI shows a card, and the
  click is the tool's return value. Not yet verified. Claude Code Channels
  is the alternative.
- A read-only claude.ai artifact was considered. It works from any device
  but has no channel back to the session on a Max plan, so the local app
  was preferred.

## Repository layout

- The planning tool is named the **architect** and lives in `architect/`,
  with its own `README.md`. Its
  terms are the `## Planning` section of the root `GLOSSARY.md`, and its
  ADRs share the root `docs/adr/`.
- The ticket stays the operator's only contract. The operator never
  reads the decision graph or the UI's internals.
  Tickets link back to their parent spec issue and ADRs, so the graph
  format is internal to the tool. This keeps the tool easy to split out
  later.

## Order of work

1. **Bootstrap.** Grill slice 1 with the Matt Pocock skills in the
   terminal, since the tool cannot plan itself yet.
2. **Slice 1, read-only.** The decision graph file, a skill that maintains
   it, and a local page that renders the decision tree and diagrams.
3. **Switch over.** Plan the tool's own next slices with the tool.
4. **Slice 2, two-way.** Decision cards through the MCP tool, and grill by
   exception.
5. **Slice 3, spec and tickets views.** The approval board and publishing
   to GitHub.
6. **Operator.** Re-grill the operator brief through the tool. The
   existing brief and Phase 0/1 specs are its first import.

## Exit condition

Stop building the planning tool and switch to the operator when slice 3 is
done and one operator spec has gone through the tool end to end.

## Open questions

- What is the decision graph schema and file format, and is there one file
  per planning session or one per project?
- Which is the source of truth when the decision graph, ADRs and glossary
  overlap?
- Is the maintaining skill a fork of `grill-with-docs` or a separate skill
  that grilling skills call?
- What structured format do diagrams render from, and with which renderer?
- What stack is the local app built in, and how is it started?
- How are the existing brief and Phase 0/1 specs imported?
