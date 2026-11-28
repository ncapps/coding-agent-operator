// `/next-issue` entry point: fetch → plan, then print the recommendation and the board as text.
// Run from inside the repository: node .claude/skills/next-issue/scripts/board.ts

import { fetchSnapshot } from "./fetch.ts";
import { COLUMNS, plan, type Card, type Flag } from "./planner.ts";

const { cards, recommendation, reason } = plan(fetchSnapshot());
const width = Math.max(0, ...cards.map((card) => `#${card.number}`.length));
const indent = " ".repeat(2 + width + 2);

const recommended = cards.find((card) => card.number === recommendation);
const next = recommended
  ? [`Next: #${recommended.number}  ${recommended.title}`, `  ${reason}`, `  ${claudeLine(recommended.command ?? "")}`]
  : ["Next: nothing", `  ${reason}`];

const sections = COLUMNS.map((column) => {
  const inColumn = cards.filter((card) => card.column === column);
  const rows = inColumn.length > 0 ? inColumn.flatMap(cardRows) : ["  (none)"];
  return [`${column} (${inColumn.length})`, ...rows].join("\n");
});

console.log([next.join("\n"), ...sections].join("\n\n"));

function cardRows(card: Card): string[] {
  const number = `#${card.number}`.padEnd(width);
  const flags = card.flags.map((flag) => `  [${flagText(flag)}]`).join("");
  const title = `  ${number}  ${card.isSpec ? "[spec] " : ""}${card.title}${flags}`;
  return card.command === null ? [title] : [title, `${indent}${claudeLine(card.command)}`];
}

function flagText(flag: Flag): string {
  switch (flag.kind) {
    case "blocked":
      return `blocked by ${flag.blockers.map((n) => `#${n}`).join(", ")}`;
    case "waiting-on-you":
      return "waiting on you";
  }
}

/** A `claude "<command>"` line, safe to paste into a POSIX shell. */
function claudeLine(command: string): string {
  return `claude "${command.replace(/[\\"$`]/g, (c) => `\\${c}`)}"`;
}
