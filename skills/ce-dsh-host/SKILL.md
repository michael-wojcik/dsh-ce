---
name: ce-dsh-host
description: "Binds Compound Engineering's host-neutral dispatch language to DeepSeek Harness primitives, so every CE subagent becomes an Agent Teams teammate collected inside the turn that launched it. Use when a CE skill dispatches reviewers, panel peers, media analyzers, or implementation units in this harness; when a CE step must collect launched agents in the same turn; or when a CE watch loop needs the harness's non-blocking wait."
---

# CE on DeepSeek Harness

**Outcome.** Every subagent a CE skill needs runs as an Agent Teams teammate: one shared task per dispatch, the launch collected inside the turn that made it by repeated bounded `wait_agent` calls, and the artifact on disk still the fact the merge reads. The packaged CE skills are unmodified upstream and carry no host bindings; this adapter is consulted by the routing rule in `AGENTS.md` or the host instruction that mounted it. The dispatch-heavy skills in practice are `ce-babysit-pr`, `ce-bakeoff`, `ce-brainstorm`, `ce-code-review`, `ce-compound`, `ce-compound-refresh`, `ce-debug`, `ce-doc-review`, `ce-dogfood`, `ce-explain`, `ce-ideate`, `ce-optimize`, `ce-plan`, `ce-pov`, `ce-prototype`, `ce-resolve-pr-feedback`, `ce-retune`, `ce-simplify-code`, `ce-sweep`, `ce-work`, and `lfg`.

**Done.** Every dispatch became a teammate, every teammate was collected in-turn or recorded as failed, and the merge read artifacts rather than this context.

**Precondition.** The Agent Teams bundle (`dsh-experimental-agent-team-profile`) **ships switched off**. Absence of `spawn_teammate` means the bundle is off: nothing in this skill applies, so follow the calling skill's own host-neutral text, or the profile-specific ladder in `references/dispatch-protocol.md`. Presence is **not** permission, though — the tool's own description reads "Only the Lead may call this tool", so a dispatched agent that sees `spawn_teammate` in its schema still cannot use it and must take the not-the-Lead row below.

## Pick the primitive

| The work is | Use | Why |
|---|---|---|
| Any CE subagent dispatch — one agent or a batch, leaf or worker | `spawn_teammate`, one shared task per dispatch | This is the harness default for CE work. The member is durable and addressable, and the task board records the dispatch. |
| Collecting those launches | repeated `wait_agent` with a bound | CE's own text prescribes exactly this: a blocking collection wait repeated back to back until every launch is terminal or its artifact lands, which it states is *not* the forbidden detached-delegate poll loop. |
| A dispatch that must run on a **different model** — panel peer, cross-model author or reviewer, per-persona tier | `workflow` with `provider`/`model` overrides, or CE's external-adapter path | A teammate runs the session model; `spawn_teammate` takes no model override. See the exception below. |
| A dispatch issued by an agent that is not the Team Lead | `workflow` batch, then inline | `spawn_teammate` is annotated Lead-only in its own description, so it appears in a teammate's schema but is uncallable there. Do not read presence as permission. |
| A background shell process — the `ce-babysit-pr` detector | `bash` with `run_in_background`, then `job_output` with `wait: true` | Not a subagent dispatch; a process wait. |

**A dispatch that cannot be a teammate.** `spawn_teammate` takes no model override and a teammate runs the session model, so a peer that must run **in-harness on a second configured provider** has no teammate form; `workflow`'s `agent(prompt, { provider, model })` is the only primitive that expresses it. (The other dispatches that leave the teammate rung are those issued by an agent that is not the Lead, in the table above.) Two things that look like exceptions are not. A peer that runs through an external CLI — CE's own cross-model route — is hosted *by* a teammate that runs the CLI and reports, because the model diversity comes from the CLI rather than from the teammate. And per-persona model tiering still runs as teammates whenever the tiers would not actually differ.

## Read next

- `references/dispatch-protocol.md` — the validated spawn, collect, and release protocol: naming, the shared task, the brief a teammate needs, the terminal condition, and every failure direction. Read before any CE dispatch.
- `references/primitive-map.md` — exact tool names, what counts as collected, the Lead-only and uniqueness constraints, and the fallback ladder. Read when a launch fails or a primitive is unfamiliar in this session.
- `references/background-watch.md` — the `ce-babysit-pr` watch loop on background jobs. Read before starting a babysit session.

## Harness memory and state

- **Session memory.** When a CE skill asks for prior-session history — `ce-compound` step 2 and its `references/session-history.md` — use the harness's own `session_search` and `session_event_search` instead. Do **not** run the bundled `scripts/session-history/*` decoders or `discover-sessions.sh`: they target Claude Code, Codex, Cursor, Pi and oh-my-pi files and do not know DSH sessions. If the query tools are absent or return nothing, say so and continue from repo files under `docs/solutions/`.
- **Team state.** When team mode is on, mirror loop phases to `team_task_create` / `team_task_update` so a multi-agent run has a durable board. When it is off, say the board is unavailable rather than pretending.
- **Workspaces and PRs.** Prefer `create_worktree` over shell `git worktree`; when the Forge bundle is present, read PR state through it instead of shelling out.

## Say the degraded path out loud

When a primitive this skill names is unavailable — no spawner, one provider only, no session-query tools — state that in the final report and name the fallback taken. Do not silently run the work inline and present it as the full protocol. The baseline arm of the routing experiment was more honest than the adapter arm on this point, which is the one behaviour this skill must fix.

## Two facts that change how a dispatch is written

A `workflow` script has no filesystem access, so it passes paths and the agents read them. A teammate has full tool access, so it reads its own persona file directly — pass paths rather than inlining content, unless the calling skill's own template inlines it as part of that skill's contract, as `ce-sweep`'s does.

A teammate cannot be deleted and its name cannot be reused. Name every teammate with a per-run suffix or a second run in the same session fails to spawn.