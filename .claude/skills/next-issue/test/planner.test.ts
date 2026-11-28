import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { plan, type Card, type Column, type Snapshot } from "../scripts/planner.ts";

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
