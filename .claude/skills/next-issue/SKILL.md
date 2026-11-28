---
name: next-issue
description: Recommend the next issue, then show every open issue on the board under its column, with flags and the command that starts each one.
disable-model-invocation: true
---

# /next-issue

Recommend the next issue with a one-line reason, then show the board: every open issue under its column (Backlog, Ready, In progress, In review, Done), worked out from live GitHub and git data. Cards carry flags (blocked, waiting on you), and each card that can be started has a `claude "<command>"` line that starts the right stage for it.

1. From the repository root, run:

   ```sh
   mise exec -- node .claude/skills/next-issue/scripts/board.ts
   ```

   It reads issues with `gh` and branches with `git`, and changes nothing. Done when it exits 0 and prints a `Next:` line followed by the five column headings.

2. Show its output to the user exactly as printed, in a `text` code block, with no commentary. If the command fails, show its error instead and stop.

The column, flag, command and recommendation rules live in `scripts/planner.ts`, and are the only source of truth for them.
