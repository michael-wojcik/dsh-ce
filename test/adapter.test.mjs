import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const skill = readFileSync(join(root, 'skills/ce-dsh-host/SKILL.md'), 'utf8')

test('adapter binds memory to session-query tools, not bundled decoders', () => {
  assert.match(skill, /session_search/)
  assert.match(skill, /session_event_search/)
  assert.match(skill, /Do \*\*not\*\* run the bundled/)
  assert.match(skill, /do not know DSH sessions/)
})

test('adapter binds team state, worktrees, and the honesty rule', () => {
  assert.match(skill, /team_task_create/)
  assert.match(skill, /create_worktree/)
  assert.match(skill, /Say the degraded path out loud/)
})
