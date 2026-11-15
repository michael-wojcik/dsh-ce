import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

test('vendored CE content matches upstream.sha256', () => {
  const manifest = readFileSync(join(root, 'upstream.sha256'), 'utf8').trim().split('\n')
  const failures = []
  for (const line of manifest) {
    const [expected, rel] = line.split('  ')
    const actual = createHash('sha256').update(readFileSync(join(root, 'skills', rel))).digest('hex')
    if (actual !== expected) failures.push(rel)
  }
  assert.deepEqual(failures, [], 'modified upstream files: ' + failures.join(', '))
})
