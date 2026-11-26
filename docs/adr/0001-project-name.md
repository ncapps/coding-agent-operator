# 0001. Project name: coding-agent-operator

- **Status:** accepted
- **Date:** 2026-11-26

## Context

The project needed a name for the GitHub repo (`ncapps/...`), Go module, images and docs. It is also a portfolio piece, so the name should tell a reader what it is at a glance.

## Decision

Use the self-describing name **`coding-agent-operator`**, following the Kubernetes `<thing>-operator` convention.

## Alternatives considered

| Option | Why not |
|---|---|
| `factory` | Generic and hard to search; Factory.ai sells a coding-agent product under that name |
| `jidoka` | An Apache-2.0 Elixir LLM agent framework (`agentjido/jidoka`) already uses it, plus a manufacturing AI company |
| `nightshift` | At least four AI coding-agent projects already use it, including one that picks up `ready-for-agent` issues and one with a budget-aware scheduler for subscription plans; also Apple's Night Shift. It also understates the governance value |
| Nautical names (`slipway`, `drydock`, `bosun`) | Theme dropped |
| `claude-code-operator` | Uses a vendor's product name, and would be wrong once v2 adds other harnesses |

## Consequences

- Readers understand the project from the name alone; few collisions.
- The name is long. A shorter CLI name may be chosen later.
- "The factory" remains the informal term for the project in the docs.
- Still open: the Kubernetes API group (brief §12, question 13) and plugin name prefix (question 14).
