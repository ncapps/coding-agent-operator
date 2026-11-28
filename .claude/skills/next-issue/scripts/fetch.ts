// Snapshot fetcher: gathers the board planner's input from live GitHub (`gh`)
// and git data. It only reads, and it holds no column logic: that is the planner's.

import { execFileSync } from "node:child_process";
import type { Snapshot, SnapshotIssue } from "./planner.ts";

const ISSUES_QUERY = `
query($owner: String!, $name: String!, $endCursor: String) {
  repository(owner: $owner, name: $name) {
    issues(first: 50, after: $endCursor, states: OPEN, orderBy: {field: CREATED_AT, direction: ASC}) {
      pageInfo { hasNextPage endCursor }
      nodes {
        number
        title
        state
        labels(first: 100) { nodes { name } }
        parent { number }
        subIssues(first: 100) { nodes { number } }
        blockedBy(first: 100) { nodes { number state } }
        closedByPullRequestsReferences(first: 100, includeClosedPrs: true) { nodes { number state } }
      }
    }
  }
}`;

interface IssueNode {
  number: number;
  title: string;
  state: "OPEN" | "CLOSED";
  labels: { nodes: { name: string }[] };
  parent: { number: number } | null;
  subIssues: { nodes: { number: number }[] };
  blockedBy: { nodes: { number: number; state: "OPEN" | "CLOSED" }[] };
  closedByPullRequestsReferences: { nodes: { number: number; state: "OPEN" | "CLOSED" | "MERGED" }[] };
}

interface IssuesPage {
  data: { repository: { issues: { nodes: IssueNode[] } } };
}

/** Fetches the snapshot for the repository checked out in `cwd`. */
export function fetchSnapshot(cwd: string = process.cwd()): Snapshot {
  return { issues: fetchOpenIssues(cwd), branches: fetchBranches(cwd) };
}

function fetchOpenIssues(cwd: string): SnapshotIssue[] {
  const repo = JSON.parse(run("gh", ["repo", "view", "--json", "owner,name"], cwd)) as {
    owner: { login: string };
    name: string;
  };
  const pages = JSON.parse(
    run(
      "gh",
      [
        "api", "graphql", "--paginate", "--slurp",
        "-F", `owner=${repo.owner.login}`,
        "-F", `name=${repo.name}`,
        "-f", `query=${ISSUES_QUERY}`,
      ],
      cwd,
    ),
  ) as IssuesPage[];
  return pages.flatMap((page) => page.data.repository.issues.nodes).map(toSnapshotIssue);
}

function toSnapshotIssue(node: IssueNode): SnapshotIssue {
  return {
    number: node.number,
    title: node.title,
    state: node.state,
    labels: node.labels.nodes.map((label) => label.name),
    parent: node.parent?.number ?? null,
    subIssues: node.subIssues.nodes.map((sub) => sub.number),
    openBlockers: node.blockedBy.nodes.filter((b) => b.state === "OPEN").map((b) => b.number),
    pullRequests: node.closedByPullRequestsReferences.nodes.map((pr) => ({ number: pr.number, state: pr.state })),
  };
}

/** Local branches, plus `origin`'s branches read live (not from possibly stale remote-tracking refs). */
function fetchBranches(cwd: string): string[] {
  const local = lines(run("git", ["for-each-ref", "--format=%(refname:short)", "refs/heads"], cwd));
  const remote = lines(run("git", ["ls-remote", "--heads", "origin"], cwd)).map(
    (line) => `origin/${line.split("\t")[1]?.replace(/^refs\/heads\//, "")}`,
  );
  return [...local, ...remote];
}

function run(command: string, args: string[], cwd: string): string {
  return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
}

function lines(output: string): string[] {
  return output.split("\n").filter((line) => line.length > 0);
}
