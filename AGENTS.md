# AGENTS.md — 和润天下官网门户（HRWAI Portal）

独立 Nuxt 4 应用，承载 www 子域名官网。领域词汇见 `CONTEXT.md`（single-context）；架构决策见 `docs/adr/`。

## Agent skills

### Issue tracker

Issues are tracked on GitHub issues (via `gh` CLI, repo `DriftingLi/hrwai-portal`). See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical labels, identical to role names: `needs-triage` / `needs-info` / `ready-for-agent` / `ready-for-human` / `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
