# Phase 1 Spec — Thin Operator MVP

> Repo path: `docs/specs/phase-1.md`. Companion to `docs/brief.md`.
> **Estimate:** 3–5 weeks part-time. **Prerequisite:** Phase 0 exit criteria met.

## Goal

Automate the Phase 0 loop on Kubernetes: a human labels an issue, and the factory delivers a draft PR that the consumer repo's CI then gates. Autonomy is fixed at L2.

## In scope

- Go operator (kubebuilder) with `Project`, `StageRun` and `FactoryConfig`.
- One stage: `implement`.
- `Runtime` implemented with Kubernetes **Jobs**.
- `Tracker` implemented with a **GitHub App**, using **polling**.
- `Harness` implemented by the `cli-claude` driver.
- A **writer** that pushes the branch and opens the PR.
- Timeout, attempt limit, one session slot, kill switch.
- `fake-claude` stub, envtest and kind e2e in CI.
- Local deployment on k3d.

## Out of scope (later phases)

Planning stages (these stay local and interactive), frontier-aware pickup and `WorkItem`, the ticket readiness check, agent-sandbox, webhooks and tunnels, review stage, autonomy presets beyond L2, plugins and marketplace, multi-project fairness, Grafana and traces, Helm, egress proxy, evals in-cluster, the image-build comparison.

## Flow

1. **Detect.** Every resync interval (default 2 minutes), the operator lists open issues labelled `ready-for-agent` in each `Project`'s repo. An issue qualifies only if a **repo collaborator** applied the label.
2. **Claim.** The operator creates `StageRun` `<repo>-<issue>-implement-<attempt>` (deterministic name) and comments on the issue that work has started.
3. **Run.** If a session slot is free and `FactoryConfig` allows it, the operator creates:
   - a workspace volume;
   - an **agent Job**: an init step clones the repo and creates branch `factory/<issue>-<slug>`; the agent container runs `claude -p` with a read-only token and writes the transcript to the volume.
4. **Collect.** When the Job ends, the operator reads status and token usage from the transcript and exit code.
5. **Write.** On success with new commits, the operator starts a short **writer Job** mounting the same volume with a write-scoped token. It rebases onto the latest base, pushes, and opens a **draft PR** using `.factory/pr-body.md` or a generated fallback.
6. **Gate.** The operator watches the PR's required check.
   - Pass: mark the PR ready for review and label the issue accordingly.
   - Fail: start one follow-up attempt with the failure log. If that fails, escalate.
7. **Finish.** A human reviews and merges. The operator records the outcome on `StageRun` status and cleans up the volume after a retention period.

**Escalation** always means: label `ready-for-human`, remove `ready-for-agent`, and comment with what failed and where the transcript is.

## Resources (sketch)

```yaml
apiVersion: <api-group>/v1alpha1   # see brief §12, question 13
kind: Project
metadata: { name: go-service }
spec:
  repo: nick/go-service
  githubApp: { installationSecretRef: github-app }
  agentImage: ghcr.io/ncapps/coding-agent-operator/agent-go@sha256:...
  model: { implement: <model> }
  gates: { implement: auto, merge: approve }   # fixed at L2 in Phase 1
  limits: { timeout: 45m, maxAttempts: 2 }
  paused: false
---
apiVersion: <api-group>/v1alpha1   # see brief §12, question 13
kind: FactoryConfig
metadata: { name: default }
spec:
  paused: false
  pauseMode: drain        # or abort
  sessionSlots: 1
  resyncInterval: 2m
```

`StageRun` status carries: phase, failure class, attempt, session ID, tokens, started and finished times, branch, PR URL, check result.

## Failure handling

| Class | Examples | Behaviour |
|---|---|---|
| Transient | network error, GitHub 5xx, pod eviction | Retry with backoff; not counted as an attempt |
| Quota | Max plan usage limit reached | Requeue until the window resets; start no new runs; not counted |
| Agent failure | non-zero exit, no commits, CI check fails | Counted; one follow-up attempt, then escalate |
| Policy | timeout exceeded | No retry; escalate |

- **Idempotency.** Deterministic `StageRun` names mean repeated polls converge on one object. All reconciles are safe to repeat.
- **Operator restart.** Jobs keep running. On restart the operator re-reads Job status and the workspace volume; it doesn't depend on a live stream.
- **Cleanup.** Finalizers on `StageRun` remove Jobs and volumes. A periodic sweep removes orphans.
- **Kill switch.** `make pause` patches `FactoryConfig.spec.paused`. `drain` lets running Jobs finish; `abort` deletes them.

## Git conventions

- **Branches:** `factory/<issue>-<slug>`. One PR per ticket.
- **Identity:** commits authored as the GitHub App bot. **(verify)** Whether they show as verified; add signing in the writer if not.
- **Trailers:** `Factory-Run: <stagerun>` and `Factory-Issue: owner/repo#N`.
- **Messages:** Conventional Commits, checked in `make verify`.
- **Rebase conflict:** counts as an agent failure; the follow-up attempt gets the conflict context.
- **Never** push to `main` or force-push a branch the factory didn't create.

## Security in Phase 1

- Agent Job: read-only token, non-root, seccomp, resource limits, no host mounts, per-stage `--allowedTools`.
- Writer Job: write token, runs only factory code, never the repo's code.
- NetworkPolicy blocks cluster-internal and private ranges from agent pods.
- Secrets (`CLAUDE_CODE_OAUTH_TOKEN`, GitHub App key) in Kubernetes Secrets, managed locally with sops + age.
- **Protected paths:** if the diff touches one, the PR is still opened but labelled `ready-for-human` and flagged in the body.

## Testing

| Layer | What it covers | Runs |
|---|---|---|
| Unit | Driver parsing of recorded transcripts; label and actor checks; branch naming | Every PR |
| envtest | Reconciler state machine, failure classes, kill switch, idempotency | Every PR |
| kind e2e | Full flow with `fake-claude` and a fake GitHub server | Every PR |
| Contract | Real `claude` binary on one tiny task; flags accepted, events parse | Nightly, API key |

**`fake-claude`** replays Phase 0 transcripts and records the flags it was called with. CI never uses the Max subscription.

## Definition of done

- [ ] Demo: label a seeded issue → draft PR → CI passes → PR marked ready. Passes three times in a row on the real consumer repo.
- [ ] Label-to-draft-PR time is recorded (target: under 30 minutes for a seeded ticket).
- [ ] A test proves the agent Job has no write-capable GitHub token.
- [ ] Tests pass for: timeout, attempt limit, usage-limit requeue, kill switch (`drain` and `abort`), duplicate detection, operator restart mid-run.
- [ ] Protected-path diff is flagged and labelled.
- [ ] `make dev-up` brings up k3d and the operator from a clean machine; `make dev-down` removes it.
- [ ] CI runs lint, generated-code drift check, unit, envtest and kind e2e.
- [ ] ADRs: resource API shape, writer design, failure classes, git conventions.
- [ ] README has an architecture diagram and a demo recording.

## Factory repo conventions

- **`CLAUDE.md`:** architecture summary, make targets, "every reconciler change needs an envtest case", CRD change rules (regenerate, update samples, ADR for API changes).
- **Make targets:** `generate`, `manifests`, `lint`, `test`, `e2e`, `verify`, `dev-up`, `dev-down`, `pause`, `resume`.
- **Branch protection on `main`:** PR required, `verify` and e2e required, linear history.
- **CODEOWNERS:** Nick on everything; `operator/api/**` always needs owner review.
- **Public-repo hygiene:** secret scanning with push protection; transcripts redacted before commit, with a CI check for unredacted patterns.
- **Self-hosting:** after the definition of done passes, the factory repo gets its own `Project` at L2.
