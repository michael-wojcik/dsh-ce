#!/usr/bin/env node
// Re-sync vendored CE skills from a checkout while preserving our adapter.
// Usage: node scripts/sync-upstream.mjs --from /path/to/compound-engineering [--commit SHA] [--dry-run]
import { createHash } from 'node:crypto'
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const args = process.argv.slice(2)
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const from = opt('--from')
const commit = opt('--commit') ?? 'unknown'
const dryRun = args.includes('--dry-run')
if (!from) { console.error('usage: sync-upstream.mjs --from <CE checkout> [--commit SHA] [--dry-run]'); process.exit(2) }
const source = join(from, 'skills')
if (!existsSync(source)) { console.error('no skills/ in ' + from); process.exit(2) }

const dest = join(root, 'skills')
const adapter = 'ce-dsh-host'
const incoming = readdirSync(source).filter((n) => statSync(join(source, n)).isDirectory() || n.endsWith('.md'))
const keep = new Set([...incoming, adapter])

if (!dryRun) {
  for (const name of incoming) {
    if (name === adapter) continue
    cpSync(join(source, name), join(dest, name), { recursive: true, force: true })
  }
  for (const name of readdirSync(dest)) {
    if (!keep.has(name)) rmSync(join(dest, name), { recursive: true, force: true })
  }
}

const files = []
const walk = (dir, prefix) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    const rel = prefix ? prefix + '/' + name : name
    if (statSync(full).isDirectory()) walk(full, rel)
    else if (!rel.startsWith(adapter + '/')) files.push(rel)
  }
}
walk(dest, '')
files.sort()
const lines = files.map((rel) => createHash('sha256').update(readFileSync(join(dest, rel))).digest('hex') + '  ' + rel)
const skills = readdirSync(dest).filter((n) => existsSync(join(dest, n, 'SKILL.md')) && n !== adapter).length

if (dryRun) {
  console.log('dry run: ' + incoming.length + ' entries, ' + skills + ' CE skills, adapter preserved')
  process.exit(0)
}
writeFileSync(join(root, 'upstream.sha256'), lines.join('\n') + '\n')
const meta = JSON.parse(readFileSync(join(root, 'upstream.json'), 'utf8'))
meta.commit = commit
meta.commitDate = new Date().toISOString().slice(0, 10)
meta.skills = skills
meta.policy = 'skills copied unmodified; only ce-dsh-host is ours'
writeFileSync(join(root, 'upstream.json'), JSON.stringify(meta, null, 2) + '\n')
console.log('synced ' + skills + ' CE skills at ' + commit + ' (' + lines.length + ' files)')
