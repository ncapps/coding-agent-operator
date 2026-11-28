// Board planner: works out each issue's column, flags and click command from a snapshot
// of GitHub and git, and picks the recommendation.
// Pure: no network or disk access. The Snapshot and Plan types are the contract
// between the scripts and the skill's instructions; keep them small and stable.

/** GitHub and git truth, as gathered by the snapshot fetcher. */
export interface Snapshot {
  issues: SnapshotIssue[];
  /** Local and `origin` branch names, e.g. `feat/27-board` and `origin/feat/27-board`. */
  branches: string[];
}

export interface SnapshotIssue {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  labels: string[];
  /** The parent issue's number, if this issue is a sub-issue. */
  parent: number | null;
  /** Sub-issue numbers, in order. */
  subIssues: number[];
  /** Numbers of open issues that block this one. */
  openBlockers: number[];
  /** Pull requests that close this issue. */
  pullRequests: { number: number; state: PullRequestState }[];
}

export type PullRequestState = "OPEN" | "CLOSED" | "MERGED";

export type Column = "Backlog" | "Ready" | "In progress" | "In review" | "Done";

/** The board's columns, in display order. */
export const COLUMNS: readonly Column[] = ["Backlog", "Ready", "In progress", "In review", "Done"];

export interface Plan {
  /** One card per snapshot issue, in snapshot order. */
  cards: Card[];
  /** The issue to work on next, or null when no card can be clicked. */
  recommendation: number | null;
  /** One line: why the recommendation was chosen, or why there is none. */
  reason: string;
}

export interface Card {
  number: number;
  title: string;
  column: Column;
  isSpec: boolean;
  flags: Flag[];
  /** The first message of the session a click starts, or null when the card can't be clicked. */
  command: string | null;
}

export type Flag = { kind: "blocked"; blockers: number[] } | { kind: "waiting-on-you" };

const READY_LABELS = ["ready-for-agent", "ready-for-human"];

/** `<type>/<N>-<slug>`, optionally on `origin`. Captures N. */
const ISSUE_BRANCH = /^(?:origin\/)?[a-z]+\/(\d+)-[^/]+$/;

export function plan(snapshot: Snapshot): Plan {
  const issuesWithBranch = issueNumbersInBranches(snapshot.branches);
  const planned = snapshot.issues.map((issue) => {
    const column = columnOf(issue, issuesWithBranch.has(issue.number));
    const flags = flagsOf(issue);
    const card: Card = {
      number: issue.number,
      title: issue.title,
      column,
      isSpec: isSpec(issue),
      flags,
      command: flags.length > 0 ? null : commandOf(issue, column),
    };
    return { issue, card };
  });
  const specs = new Map(snapshot.issues.filter(isSpec).map((issue) => [issue.number, issue]));
  const candidates = planned
    .filter(({ card }) => card.command !== null)
    .map(({ issue, card }) => candidateOf(issue, card, specs))
    .sort((a, b) => compareRanks(a.rank, b.rank));
  const cards = planned.map(({ card }) => card);
  const first = candidates[0];
  return {
    cards,
    recommendation: first?.number ?? null,
    reason: first?.reason ?? whyNothingToStart(cards),
  };
}

interface Candidate {
  number: number;
  /** Recommendation order, compared element by element: lower comes first. */
  rank: number[];
  reason: string;
}

/**
 * In review by oldest pull request; then Ready, by spec age and sub-issue order,
 * then tickets without an open spec by number; then Backlog specs, then ideas, oldest first.
 * Issue and pull request numbers stand in for age: GitHub numbers them in creation order.
 */
function candidateOf(issue: SnapshotIssue, card: Card, specs: Map<number, SnapshotIssue>): Candidate {
  const n = issue.number;
  switch (card.column) {
    case "In review": {
      const pr = oldestOpenPullRequest(issue);
      return { number: n, rank: [0, pr], reason: `Pull request #${pr} for #${n} is the oldest waiting for review; reviews come first.` };
    }
    case "Ready": {
      const spec = issue.parent === null ? undefined : specs.get(issue.parent);
      if (spec === undefined) {
        return { number: n, rank: [2, n], reason: `#${n} is the lowest-numbered ready ticket outside a spec, and no spec has one that can be started.` };
      }
      const position = spec.subIssues.indexOf(n);
      return {
        number: n,
        rank: [1, spec.number, position === -1 ? spec.subIssues.length : position],
        reason: `#${n} is the next ready ticket of #${spec.number}, the oldest spec with a ready ticket.`,
      };
    }
    case "Backlog":
      return card.isSpec
        ? { number: n, rank: [3, n], reason: `Spec #${n} is the oldest with no tickets yet, and no ticket can be started.` }
        : { number: n, rank: [4, n], reason: `#${n} is the oldest idea, and no review, ticket or spec can be started.` };
    default:
      throw new Error(`#${n} in ${card.column} can't be recommended`);
  }
}

function compareRanks(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function whyNothingToStart(cards: Card[]): string {
  const open = cards.filter((card) => card.column !== "Done");
  if (open.length === 0) return "Nothing to start: there are no open issues.";
  const inProgress = open.filter((card) => card.column === "In progress").length;
  const flagged = open.filter((card) => card.column !== "In progress" && card.flags.length > 0).length;
  const counts = [
    [flagged, "flagged"],
    [inProgress, "in progress"],
  ] as const;
  return `Nothing to start: ${counts.filter(([count]) => count > 0).map(([count, label]) => `${count} ${label}`).join(", ")}.`;
}

function flagsOf(issue: SnapshotIssue): Flag[] {
  const flags: Flag[] = [];
  if (issue.openBlockers.length > 0) flags.push({ kind: "blocked", blockers: issue.openBlockers });
  if (issue.labels.includes("needs-info")) flags.push({ kind: "waiting-on-you" });
  return flags;
}

function issueNumbersInBranches(branches: string[]): Set<number> {
  const numbers = new Set<number>();
  for (const branch of branches) {
    const match = ISSUE_BRANCH.exec(branch);
    if (match?.[1]) numbers.add(Number(match[1]));
  }
  return numbers;
}

/** A spec is an open issue that has sub-issues, or whose title starts with `Spec:`. */
function isSpec(issue: SnapshotIssue): boolean {
  if (issue.state !== "OPEN") return false;
  return issue.subIssues.length > 0 || issue.title.trimStart().startsWith("Spec:");
}

/** What a click starts, by column. In progress and Done cards can't be clicked. */
function commandOf(issue: SnapshotIssue, column: Column): string | null {
  const n = issue.number;
  if (column === "Ready") {
    // A ticket carrying both labels needs the maintainer, so ready-for-human wins.
    if (issue.labels.includes("ready-for-human")) {
      return `Read ticket #${n} (gh issue view ${n} --comments) and summarise it. It is ready-for-human: wait for my instructions and do not start the work yourself.`;
    }
    return `/mattpocock-skills:implement #${n}`;
  }
  if (column === "In review") {
    const pr = oldestOpenPullRequest(issue);
    return `/mattpocock-skills:code-review origin/main, on pull request #${pr} for #${n}. First run gh pr checkout ${pr}, so HEAD is the pull request.`;
  }
  if (column === "Backlog") {
    if (isSpec(issue)) return `/mattpocock-skills:to-tickets #${n}`;
    return `/mattpocock-skills:grill-with-docs #${n}. When the grilling is done, run /mattpocock-skills:to-spec in this session, then close #${n} with a comment linking the spec it produced.`;
  }
  return null;
}

/** The lowest-numbered open pull request that closes the issue. Only called for In review issues, which have one. */
function oldestOpenPullRequest(issue: SnapshotIssue): number {
  return Math.min(...issue.pullRequests.filter((pr) => pr.state === "OPEN").map((pr) => pr.number));
}

/** The column rules, in order: first match wins. */
function columnOf(issue: SnapshotIssue, hasBranch: boolean): Column {
  if (issue.state === "CLOSED") return "Done";
  if (issue.pullRequests.some((pr) => pr.state === "OPEN")) return "In review";
  if (hasBranch) return "In progress";
  if (issue.subIssues.length > 0) return "In progress"; // An open issue with sub-issues is a spec.
  if (isTicket(issue)) return "Ready";
  return "Backlog";
}

/** A ticket is an open issue that is not a spec and carries a ready label. */
function isTicket(issue: SnapshotIssue): boolean {
  if (issue.state !== "OPEN" || isSpec(issue)) return false;
  return issue.labels.some((label) => READY_LABELS.includes(label));
}
