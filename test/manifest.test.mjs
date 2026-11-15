import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const yaml = (await import(pathToFileURL(join(homedir(), '.dsh/profiles/node_modules/js-yaml/index.js')).href)).default

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