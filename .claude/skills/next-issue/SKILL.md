---
name: next-issue
description: Show every open issue on the board, under its column.
disable-model-invocation: true
---

# /next-issue

Show the board: every open issue under its column (Backlog, Ready, In progress, In review, Done), worked out from live GitHub and git data.

1. From the repository root, run:

   ```sh
   mise exec -- node .claude/skills/next-issue/scripts/board.ts
   ```

   It reads issues with `gh` and branches with `git`, and changes nothing. Done when it exits 0 and prints the five column headings.

2. Show its output to the user exactly as printed, in a `text` code block, with no commentary. If the command fails, show its error instead and stop.

The column rules live in `scripts/planner.ts`, and are the only source of truth for them.
