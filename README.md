# dsh-ce

A DeepSeek Harness integration layer for [Compound Engineering](https://github.com/EveryInc/compound-engineering-plugin) (CE). CE's skills are vendored **unmodified** from upstream; everything DSH-specific lives in this package.

**Status:** verified live in the desktop app — preset-scoped catalog, a working `ce_reviewer` that spawns a child, the session-query memory binding, and `team_task_*` when teamwork is enabled. Reviewer independence needs a second configured provider.

## Verifying the composition without restarting the app

The app's own CLI and packages live in `app.asar`; extracting it gives a scratch runtime that can mount the bundle and report preset health:

```sh
npx @electron/asar extract /Applications/DeepSeek Harness.app/Contents/Resources/app.asar /tmp/dsh-asar/out
# scratch profile: bundles base + headless + dsh-ce, plus the preset registry row
DSH_HOME=/tmp/dsh-home node /tmp/dsh-asar/out/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js --profile verify "hello"
```

Without the registry row the preset reports `pending (waiting for service: agentPresets)`; with `@deepseek-ai/dsh-agent-preset-registry` mounted, `preset-compound` activates with no warning. That distinguishes "broken composition" from "the running Host has not reloaded".

## Why this exists

CE is MIT, skills-only, and ships to fourteen hosts. Forking its prose is a maintenance tax paid per upstream release (the reference fork measured 11 conflicts, 2 new skills and 38 new dispatch sites after five weeks). This package keeps the content upstream and owns only the integration surface DSH provides:

| Pillar | Where it lives | Status |
| --- | --- | --- |
| **Preset-scoped skills** | bundle patch inserts preset `compound`; the provider and the skill tool mount inside it | **verified live**: CE session carried `ce-plan`/`ce-retro`/`ce-dsh-host`; a PTC session carried none |
| **Native cross-model reviewer** | preset child `ce_reviewer` (`@deepseek-ai/dsh-tool-subagent`, `modelSelection`, `modelDiscovery`) plus `list_subagent_models` | **works live**: spawned child `agent-1` and returned its `reviewer-ok`; an independent peer needs a second route |
| **Harness-native memory and state** | adapter overrides `ce-compound`'s session-history step with `session_search`/`session_event_search`, forbids the bundled decoders, maps phases to `team_task_*`, workspaces to `create_worktree`, PRs to Forge | **verified live**: memory answer matched the adapter; teamwork added `team_task_*` (40-tool schema); `create_worktree` present |
| **Everything else** | `skills/` is a byte-for-byte copy of upstream at `ee46dde7` | verified by `diff -r` |

## Install

```sh
dsh plugin --profile web add /absolute/path/to/dsh-ce
```

Or in the app: **Plugins → Add plugin → local directory path**, then Enable. The preset `compound` appears in the composer's mode menu as **Compound Engineering**. Sessions on other presets see none of these skills.

## The reviewer

The preset mounts a subagent tool named `ce_reviewer` and `list_subagent_models`. Model ids are returned only when a provider argument is supplied. With one configured provider an independent peer is impossible; the adapter requires the model to say so rather than substituting the session model.

## Provenance and sync

- Upstream: `EveryInc/compound-engineering-plugin` at `ee46dde7` (2026-11-13), 38 skills.
- `skills/` is unmodified; `skills/ce-dsh-host` is ours. `upstream.sha256` pins every vendored file, and a test fails when one byte drifts.
- Re-sync against a CE checkout at the target tag:

```sh
node scripts/sync-upstream.mjs --from /path/to/compound-engineering --commit <sha> --dry-run
node scripts/sync-upstream.mjs --from /path/to/compound-engineering --commit <sha>
node --test test/*.test.mjs
```

The script preserves `skills/ce-dsh-host`, removes skills upstream deleted, regenerates `upstream.sha256`, and updates `upstream.json`.

## Tests

```sh
node --test test/*.test.mjs
```

8 tests: 39 skills served (38 CE + adapter), 9 manual-only honoured, bodies load, preset wiring asserted, and every vendored CE file matches `upstream.sha256`.

## Publishing

`npm pack --dry-run` ships 1.7 MB / 454 files (skills, adapter, patch, manifests, licence, README). Once published, list it in a DSH plugin index so Discover can install it; the bundle needs no setup beyond `dsh plugin add` and a session on preset `compound`.

## License

MIT. CE content is Every's work, unmodified; this package is unofficial.