// Board planner: works out each issue's column from a snapshot of GitHub and git.
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
}

export interface Card {
  number: number;
  title: string;
  column: Column;
  isSpec: boolean;
}

const READY_LABELS = ["ready-for-agent", "ready-for-human"];

/** `<type>/<N>-<slug>`, optionally on `origin`. Captures N. */
const ISSUE_BRANCH = /^(?:origin\/)?[a-z]+\/(\d+)-[^/]+$/;

export function plan(snapshot: Snapshot): Plan {
  const issuesWithBranch = issueNumbersInBranches(snapshot.branches);
  return {
    cards: snapshot.issues.map((issue) => ({
      number: issue.number,
      title: issue.title,
      column: columnOf(issue, issuesWithBranch.has(issue.number)),
      isSpec: isSpec(issue),
    })),
  };
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
