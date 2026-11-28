import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { plan, type Card, type Column, type Snapshot, type SnapshotIssue } from "../scripts/planner.ts";

function fixture(name: string): Snapshot {
  const url = new URL(`./fixtures/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(url, "utf8")) as Snapshot;
}

function cardOf(snapshot: Snapshot, issue: number): Card {
  const card = plan(snapshot).cards.find((c) => c.number === issue);
  assert.ok(card, `no card for #${issue}`);
  return card;
}

function columnOf(snapshot: Snapshot, issue: number): Column {
  return cardOf(snapshot, issue).column;
}

test("a closed issue is Done", () => {
  assert.equal(columnOf(fixture("column-rules"), 1), "Done");
});

test("an issue with an open pull request that closes it is In review", () => {
  assert.equal(columnOf(fixture("column-rules"), 2), "In review");
});

test("a closed pull request does not put an issue In review", () => {
  assert.equal(columnOf(fixture("column-rules"), 3), "Ready");
});

test("an issue with a matching local branch and no open pull request is In progress", () => {
  assert.equal(columnOf(fixture("column-rules"), 4), "In progress");
});

test("an issue with a matching origin branch only is In progress", () => {
  assert.equal(columnOf(fixture("column-rules"), 5), "In progress");
});

test("first match wins: a closed issue with a branch is Done", () => {
  assert.equal(columnOf(fixture("column-rules"), 6), "Done");
});

test("first match wins: an issue with an open pull request and a branch is In review", () => {
  assert.equal(columnOf(fixture("column-rules"), 7), "In review");
});

test("a branch matches only the issue number it names", () => {
  assert.equal(columnOf(fixture("column-rules"), 8), "Ready");
});

test("an open issue with sub-issues is a spec, even without a Spec: title", () => {
  assert.equal(cardOf(fixture("specs"), 24).isSpec, true);
});

test("an open issue titled Spec: is a spec, even labelled ready-for-agent and without sub-issues", () => {
  assert.equal(cardOf(fixture("specs"), 23).isSpec, true);
});

test("tickets and ideas are not specs", () => {
  const specs = fixture("specs");
  assert.deepEqual(
    [21, 22, 25, 26].map((n) => cardOf(specs, n).isSpec),
    [false, false, false, false],
  );
});

test("a spec with tickets is In progress", () => {
  const specs = fixture("specs");
  assert.equal(columnOf(specs, 20), "In progress");
  assert.equal(columnOf(specs, 24), "In progress");
});

test("a spec without tickets is in Backlog, even labelled ready-for-agent", () => {
  assert.equal(columnOf(fixture("specs"), 23), "Backlog");
});

test("tickets labelled ready-for-agent or ready-for-human are Ready", () => {
  const specs = fixture("specs");
  assert.deepEqual(
    [21, 22, 25].map((n) => columnOf(specs, n)),
    ["Ready", "Ready", "Ready"],
  );
});

test("anything else is in Backlog", () => {
  assert.equal(columnOf(fixture("specs"), 26), "Backlog");
});

test("spec #7 with tickets #11-#22: the spec is In progress, its tickets Ready, the idea in Backlog", () => {
  const board = plan(fixture("spec-7")).cards.map(({ number, column, isSpec }) => [number, column, isSpec]);
  assert.deepEqual(board, [
    [7, "In progress", true],
    [9, "Backlog", false],
    [11, "Ready", false],
    [12, "Ready", false],
    [13, "Ready", false],
    [14, "Ready", false],
    [15, "Ready", false],
    [16, "Ready", false],
    [17, "Ready", false],
    [18, "Ready", false],
    [19, "Ready", false],
    [20, "Ready", false],
    [21, "Ready", false],
    [22, "Ready", false],
  ]);
});

// Flags, click commands and the recommendation (#28). Small inline snapshots keep
// each case's GitHub truth next to its assertion.

function issue(number: number, fields: Partial<SnapshotIssue> = {}): SnapshotIssue {
  return {
    number,
    title: `Issue ${number}`,
    state: "OPEN",
    labels: [],
    parent: null,
    subIssues: [],
    openBlockers: [],
    pullRequests: [],
    ...fields,
  };
}

function snapshotOf(...issues: SnapshotIssue[]): Snapshot {
  return { issues, branches: ["main", "origin/main"] };
}

test("a ticket with an open blocker is Ready, flagged blocked with its blockers, has no click and is never recommended", () => {
  const snapshot = snapshotOf(issue(40, { labels: ["ready-for-agent"], openBlockers: [38, 39] }), issue(49, { title: "Idea" }));
  const card = cardOf(snapshot, 40);
  assert.equal(card.column, "Ready");
  assert.deepEqual(card.flags, [{ kind: "blocked", blockers: [38, 39] }]);
  assert.equal(card.command, null);
  assert.equal(plan(snapshot).recommendation, 49);
});

test("a needs-info issue is in Backlog, flagged waiting on you, has no click and is never recommended", () => {
  const snapshot = snapshotOf(issue(41, { labels: ["needs-info"] }), issue(49, { title: "Idea" }));
  const card = cardOf(snapshot, 41);
  assert.equal(card.column, "Backlog");
  assert.deepEqual(card.flags, [{ kind: "waiting-on-you" }]);
  assert.equal(card.command, null);
  assert.equal(plan(snapshot).recommendation, 49);
});

test("a spec with tickets is In progress, has no click and is never recommended", () => {
  const snapshot = snapshotOf(
    issue(42, { title: "Spec: with tickets", subIssues: [43] }),
    issue(43, { state: "CLOSED", parent: 42 }),
    issue(49, { title: "Idea" }),
  );
  const card = cardOf(snapshot, 42);
  assert.equal(card.column, "In progress");
  assert.equal(card.command, null);
  assert.equal(plan(snapshot).recommendation, 49);
});

test("a spec without tickets has the to-tickets command", () => {
  const snapshot = snapshotOf(issue(44, { title: "Spec: no tickets yet", labels: ["ready-for-agent"] }));
  assert.equal(cardOf(snapshot, 44).command, "/mattpocock-skills:to-tickets #44");
});

test("a ready-for-agent ticket starts implement", () => {
  const snapshot = snapshotOf(issue(45, { labels: ["ready-for-agent"] }));
  assert.equal(cardOf(snapshot, 45).command, "/mattpocock-skills:implement #45");
});

test("a ready-for-human ticket starts a session that loads it and leaves the maintainer in charge", () => {
  const snapshot = snapshotOf(issue(46, { labels: ["ready-for-human"] }));
  assert.equal(
    cardOf(snapshot, 46).command,
    "Read ticket #46 (gh issue view 46 --comments) and summarise it. It is ready-for-human: wait for my instructions and do not start the work yourself.",
  );
});

test("an In review card's command reviews its open pull request", () => {
  const snapshot = snapshotOf(
    issue(47, {
      labels: ["ready-for-agent"],
      pullRequests: [
        { number: 101, state: "CLOSED" },
        { number: 102, state: "OPEN" },
      ],
    }),
  );
  assert.equal(
    cardOf(snapshot, 47).command,
    "/mattpocock-skills:code-review origin/main, on pull request #102 for #47. First run gh pr checkout 102, so HEAD is the pull request.",
  );
});

test("a Backlog idea starts grilling that ends with to-spec and closes the idea with a link to the spec", () => {
  const snapshot = snapshotOf(issue(48, { labels: ["needs-triage"] }));
  assert.equal(
    cardOf(snapshot, 48).command,
    "/mattpocock-skills:grill-with-docs #48. When the grilling is done, run /mattpocock-skills:to-spec in this session, then close #48 with a comment linking the spec it produced.",
  );
});

/** Recommendations in the order they come: plan, take the recommended issue off the board, repeat. */
function recommendations(snapshot: Snapshot): [number, string][] {
  const found: [number, string][] = [];
  let issues = snapshot.issues;
  for (;;) {
    const { recommendation, reason } = plan({ ...snapshot, issues });
    if (recommendation === null) return found;
    found.push([recommendation, reason]);
    issues = issues.filter((i) => i.number !== recommendation);
  }
}

function recommendationOrder(snapshot: Snapshot): number[] {
  return recommendations(snapshot).map(([number]) => number);
}

test("recommendations: In review (oldest pull request first), then Ready, then Backlog specs, then ideas (oldest first)", () => {
  const snapshot = snapshotOf(
    issue(50, { title: "Idea" }),
    issue(51, { title: "Spec: no tickets" }),
    issue(52, { labels: ["ready-for-agent"] }),
    issue(53, { labels: ["ready-for-agent"], pullRequests: [{ number: 205, state: "OPEN" }] }),
    issue(54, { labels: ["ready-for-agent"], pullRequests: [{ number: 204, state: "OPEN" }] }),
    issue(55, { title: "Idea" }),
    issue(56, { title: "Spec: no tickets" }),
  );
  assert.deepEqual(recommendationOrder(snapshot), [54, 53, 52, 51, 56, 50, 55]);
});

test("Ready recommendations: the oldest spec's tickets in sub-issue order, then the next spec's, then tickets without a spec by number", () => {
  const ticket = (number: number, parent: number | null) => issue(number, { labels: ["ready-for-agent"], parent });
  const snapshot = snapshotOf(
    ticket(57, 1), // Its spec is closed, so not on the board: it counts as a ticket without a spec.
    ticket(58, null),
    issue(60, { title: "Spec: older", subIssues: [64, 62, 63] }),
    issue(61, { title: "Spec: newer", subIssues: [66, 65] }),
    ticket(62, 60),
    ticket(63, 60),
    ticket(64, 60),
    ticket(65, 61),
    ticket(66, 61),
    ticket(67, null),
  );
  assert.deepEqual(recommendationOrder(snapshot), [64, 62, 63, 66, 65, 57, 58, 67]);
});

test("with no clickable card there is no recommendation, and the reason says why", () => {
  const nothingToStart = plan({
    issues: [
      issue(70, { labels: ["ready-for-agent"], openBlockers: [71] }),
      issue(71, { labels: ["needs-info"] }),
      issue(72, { labels: ["ready-for-agent"] }),
      issue(73, { title: "Spec: with tickets", subIssues: [72] }),
    ],
    branches: ["feat/72-started"],
  });
  assert.equal(nothingToStart.recommendation, null);
  assert.equal(nothingToStart.reason, "Nothing to start: 2 flagged, 2 in progress.");

  const empty = plan({ issues: [], branches: [] });
  assert.equal(empty.recommendation, null);
  assert.equal(empty.reason, "Nothing to start: there are no open issues.");
});

test("each recommendation comes with a one-line reason", () => {
  const snapshot = snapshotOf(
    issue(80, { title: "Idea" }),
    issue(81, { title: "Spec: no tickets" }),
    issue(82, { title: "Spec: with tickets", subIssues: [83] }),
    issue(83, { labels: ["ready-for-agent"], parent: 82 }),
    issue(84, { labels: ["ready-for-human"] }),
    issue(85, { labels: ["ready-for-agent"], pullRequests: [{ number: 300, state: "OPEN" }] }),
  );
  assert.deepEqual(recommendations(snapshot), [
    [85, "Pull request #300 for #85 is the oldest waiting for review; reviews come first."],
    [83, "#83 is the next ready ticket of #82, the oldest spec with a ready ticket."],
    [84, "#84 is the lowest-numbered ready ticket outside a spec, and no spec has one that can be started."],
    [81, "Spec #81 is the oldest with no tickets yet, and no ticket can be started."],
    [80, "#80 is the oldest idea, and no review, ticket or spec can be started."],
  ]);
});
