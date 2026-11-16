import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const yaml = (await import('js-yaml')).default

test('bundle manifest declares the patch', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml')
  assert.ok(pkg.dsh.engines.dsh)
})

test('preset composes the standard tool set plus the CE rows', () => {
  const text = readFileSync(join(root, 'cordis.patch.yml'), 'utf8').replace(/!!js /g, '')
  const patch = yaml.load(text)
  const preset = patch[0].insert[0]
  assert.equal(preset.name, '@deepseek-ai/dsh-agent-preset')
  assert.equal(preset.config.id, 'compound')
  const names = preset.config.plugins.map((p) => p.name)
  for (const needed of [
    '@deepseek-ai/dsh-tool-bash',
    '@deepseek-ai/dsh-tool-fs',
    '@deepseek-ai/dsh-tool-skill',
    'dsh-ce',
    '@deepseek-ai/dsh-tool-agent-team',
    '@deepseek-ai/dsh-tool-subagent',
  ]) {
    assert.ok(names.includes(needed), 'missing ' + needed)
  }
  const reviewer = preset.config.plugins.find((p) => p.id === 'ce-reviewer')
  assert.equal(reviewer.config.toolName, 'ce_reviewer')
  assert.equal(reviewer.config.modelSelection, true)
  assert.equal(reviewer.config.modelDiscovery, true)
  const fsSearch = preset.config.plugins.find((row) => row.id === 'tool-fs-search')
  assert.equal(fsSearch.config.sampleOverCapGlobResults, false)
  const todo = preset.config.plugins.find((row) => row.id === 'tool-todo')
  assert.equal(todo.config.allowParallelInProgress, true)
})

// The web bundle disables the host-plane compaction rows, so each preset owns a
// per-Agent compaction group. A preset that omits it silently loses automatic
// compaction, context-overflow recovery, and `/compact`.
test('preset mounts a per-Agent compaction group', () => {
  const text = readFileSync(join(root, 'cordis.patch.yml'), 'utf8').replace(/!!js /g, '')
  const patch = yaml.load(text)
  const preset = patch[0].insert[0]
  const group = preset.config.plugins.find((row) => row.id === 'compaction')
  assert.ok(group, 'missing compaction group')
  assert.equal(group.name, 'cordis:group')
  assert.equal(group.group, true)
  assert.equal(group.isolate?.compaction, true)
  assert.equal(group.isolate?.toolResultPruner, true)
  const names = group.config.map((row) => row.name)
  for (const needed of [
    '@deepseek-ai/dsh-compaction-basic',
    '@deepseek-ai/dsh-command-compact',
    '@deepseek-ai/dsh-compaction-tool-result-pruner',
  ]) {
    assert.ok(names.includes(needed), 'missing ' + needed)
  }
  const pruner = group.config.find((row) => row.id === 'tool-result-pruner')
  assert.deepEqual(pruner.config, { thresholdChars: 8192, headChars: 4096, tailChars: 1024 })
})
