// `/next-issue` entry point: fetch → plan, then print the board as text, grouped by column.
// Run from inside the repository: node .claude/skills/next-issue/scripts/board.ts

import { fetchSnapshot } from "./fetch.ts";
import { COLUMNS, plan, type Card } from "./planner.ts";

const { cards } = plan(fetchSnapshot());
const width = Math.max(0, ...cards.map((card) => `#${card.number}`.length));

const sections = COLUMNS.map((column) => {
  const inColumn = cards.filter((card) => card.column === column);
  const rows = inColumn.length > 0 ? inColumn.map(row) : ["  (none)"];
  return [`${column} (${inColumn.length})`, ...rows].join("\n");
});

console.log(sections.join("\n\n"));

function row(card: Card): string {
  const number = `#${card.number}`.padEnd(width);
  return `  ${number}  ${card.isSpec ? "[spec] " : ""}${card.title}`;
}
