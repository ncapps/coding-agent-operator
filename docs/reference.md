# coding-agent-operator Reference — Dependencies, Builds, Backlog, Risks

> Repo path: `docs/reference.md`. Companion to `docs/brief.md`.

**Pinning rule (decision):** every version lives in exactly one pinned place: `go.mod`, `.mise.toml`, a Dockerfile, or (later) `Chart.yaml`. Renovate keeps them current. No versions are listed here on purpose. **(verify)** Module paths and minimum Kubernetes versions at build time.

---

## 1. Dependencies by phase

### Phase 0

| Dependency | Purpose |
|---|---|
| Claude Code CLI (pinned) | The harness |
| `mattpocock/skills` (vendored, pinned) | Stage logic |
| Colima or OrbStack, `docker` CLI + buildx | Build and run the agent container |
| git, `gh` CLI | Loop script: clone, push, open PR |
| mise | Pin host tools |
| Go, golangci-lint, make | Consumer service and `make verify` |

### Phase 1: operator (Go)

| Dependency | Purpose | Notes |
|---|---|---|
| Go toolchain | Language | Pinned via `toolchain` in `go.mod` |
| kubebuilder | Scaffolding and generators | Current (v4) layout |
| `sigs.k8s.io/controller-runtime` | Manager, reconcilers, metrics | Core framework |
| `controller-gen` | CRDs, RBAC, deepcopy | CEL validation via markers |
| `k8s.io/api`, `apimachinery`, `client-go` | Kubernetes types and clients | Aligned with controller-runtime |
| `github.com/google/go-github` | GitHub REST API | Issues, labels, comments, PRs, checks |
| `github.com/bradleyfalzon/ghinstallation` | GitHub App installation tokens | Separate read and write token sources |
| `github.com/prometheus/client_golang` | Metrics: runs, tokens, durations, slot use | Via controller-runtime's registry |
| logr + zap | Structured logs | controller-runtime default |

### Phase 1: tests

| Dependency | Purpose |
|---|---|
| envtest + `setup-envtest` | Real API server and etcd for reconciler tests |
| Ginkgo/Gomega or std `testing` + testify | Test framework |
| `net/http/httptest` | Fake GitHub server |
| `fake-claude` (in-repo) | Replays recorded transcripts; no tokens spent |
| kyverno/chainsaw or Ginkgo e2e | e2e against kind |

### Phase 1: agent image

Claude Code CLI, vendored skills, git, mise, make, jq, and the Go toolchain layer (Go, gopls, golangci-lint). No `gh` in implement-stage images.

### Phase 1: CI (GitHub Actions)

| Dependency | Purpose |
|---|---|
| `actions/checkout`, `actions/setup-go`, `jdx/mise-action` | Basics and pinned tools |
| `golangci/golangci-lint-action` | Lint |
| Drift check | `make generate manifests && git diff --exit-code` |
| `helm/kind-action` | kind cluster for e2e |
| ko, `docker/build-push-action` | Images to GHCR |
| `govulncheck`, Trivy | Vulnerability scans |
| `rhysd/actionlint` | Workflow lint |
| Renovate | Dependency bumps |

### Phase 1: local Kubernetes (Mac mini)

| Dependency | Purpose | Notes |
|---|---|---|
| Colima or OrbStack | Linux VM and Docker engine | OrbStack needs a paid licence for commercial use |
| k3d | k3s-in-Docker cluster with a local registry | Config in `deploy/dev/k3d.yaml`; k3s image pinned |
| kubectl (with kustomize) | Deploy | — |
| Tilt | Inner dev loop | Optional; `make deploy` works without it |
| sops + age | Local secrets | — |

Keep the k3s image (local) and kind node image (CI) on the same Kubernetes minor version, set in one variable. Disable k3s extras the factory doesn't use, so nothing relies on k3s-only behaviour.

### Home hardware: 2018 Mac mini (Intel)

| Item | Value | Notes |
|---|---|---|
| CPU | Intel Core i5, 6 cores, no hyper-threading | The limiting resource. Two sessions running `go test -race` at once will slow each other |
| Memory | 32 GB | Ample |
| Architecture | amd64 | Same as CI and enterprise; no multi-arch needed for home use |
| Session slots | 1 to start, 2 at most | The Max plan limits will usually bind first |

**VM sizing (starting point):** 5 CPUs, 18 GB memory, 100 GB disk. For Colima: `colima start --cpu 5 --memory 18 --disk 100`. Set this in `make dev-up`. **(verify)** Which Colima VM type performs best on Intel.

**Per-pod limits (starting point):** agent pod requests 1 CPU / 2 GB, limits 3 CPU / 6 GB. Tune from Phase 0 measurements.

**Host setup:**

- Turn off sleep so overnight runs aren't interrupted.
- Keep about 100 GB free. On a 128 or 256 GB internal disk, put the VM disk on an external SSD.
- Prune images and old workspaces on a schedule.

**macOS support.** **(verify)** The newest macOS this model can run, and how long it and the tools (Colima or OrbStack, Docker CLI) will keep supporting Intel Macs. Add the result to the risk register.

**Option for later: Linux on the Mac mini.** Running k3s directly on Linux removes the VM and makes gVisor possible at home. This model's T2 chip needs a community-patched kernel, so treat it as a hardening-phase experiment, not a starting point.

### Added in later phases

| Phase | Additions |
|---|---|
| 2 | Webhook receiver; cloudflared or tailscale; `githubv4` if blocking-edge APIs need GraphQL |
| 3 | Nothing new expected |
| 4 | release-please (path-scoped), Claude marketplace manifest, Python toolchain layer |
| 6 | Harbor (via `uv`), OTel SDK and Collector, Grafana, Jaeger or Tempo |
| 7 | Helm and chart-testing, cert-manager (if webhooks), egress proxy, Syft, cosign, arm64 images added alongside amd64 (for other users; not needed at home), External Secrets, gVisor/Kata, agent-sandbox controller and API types |

---

## 2. Image builds

Docker Desktop isn't required. Colima and OrbStack run a Docker Engine in their VM, and the open-source `docker` CLI and buildx talk to it.

**(decision)** Start with:

| Image | Builder | Why |
|---|---|---|
| Operator, writer, `fake-claude` | **ko** | No Dockerfile or daemon, cross-compiles amd64 and arm64, small distroless images |
| Agent image | **docker buildx** | Needs a real Dockerfile with toolchain layers |

- **Local:** build amd64 only, which is native on the Intel Mac mini; push to the k3d registry.
- **CI:** push to GHCR. Multi-arch, SBOM and signing arrive in Phase 7.

**No upfront comparison spike.** Revisit the choice, timeboxed to half a day and recorded as an ADR, only if one of these happens:

- Agent image builds exceed about 10 minutes or regularly break the dev loop.
- The factory needs to build images **inside the cluster** (per-repo toolchain images).
- Reproducible builds or provenance become a hardening requirement that buildx can't meet.

Candidates if revisited: Podman + buildah, standalone BuildKit, apko + melange or Nix, Dagger. Criteria: build time, multi-arch, image size and CVE count, reproducibility, supply-chain features, dev-loop fit, licensing.

---

## 3. Backlog: specify when the phase starts

| Item | What to define | Needed by |
|---|---|---|
| Transcript storage | Location (volume first, S3-compatible later), retention, redaction, linking from PRs | Phase 1 minimal; Phase 6 full |
| Human interaction model | Labels and comment commands (`/factory retry`, `abort`), notifications | Phase 2 |
| Ticket readiness checklist | What a ticket must contain before pickup | Draft in Phase 0; enforced in Phase 2 |
| Blast-radius rules | Inputs and thresholds for L4 auto-merge | Phase 3 |
| Usage accounting | Budgets in tokens; API-price equivalent for dashboards | Phase 5 |
| API versioning | `v1alpha1` → `v1beta1`, conversion; JSON Schema for `.factory.yaml` | Phase 4 |
| Portfolio deliverables | README narrative, diagrams, demo recordings per phase, comparison write-up vs Kelos, Sandcastle and gh-aw | Start capturing in Phase 0 |

---

## 4. Risk register

| Risk | Likelihood | Fallback |
|---|---|---|
| Max plan terms or billing for `claude -p` change | High (changed several times in 2026) | Switch the Secret to an API key; lower volume |
| Factory exhausts the limits Nick needs for interactive work | Medium | Schedule windows, one slot, pause switch |
| Claude Code flags or event format change | Medium | Pinned version; nightly contract test; Renovate PR runs it |
| Matt Pocock's skills are renamed or restructured | Medium | Vendored, pinned copies; upgrade deliberately |
| Locally written tickets are too vague for unattended runs | Medium | Readiness checklist; `needs-info` hand-back; tune `to-tickets` use in Phase 0 |
| agent-sandbox (alpha) breaks or changes API | Medium | `Runtime` interface; stay on Jobs |
| Agent output quality too low for unattended PRs | Medium | Smaller tickets, stronger hooks, stay at L2 |
| Scope outruns available time | High | Cut lines in the brief; Phases 0–3 are the v1 |
| Vendors ship equivalent hosted features | High | Differentiate on policy, isolation and operability; say so in the README |
| Intel Mac loses macOS or tool support | Medium | Install Linux on the Mac mini, or move the home cluster to another machine; images are already amd64 |
| Prompt injection through issue text | Medium | Trusted-actor labels, read-only agent tokens, protected paths |
