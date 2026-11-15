import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const NAME_RE = /^[a-z0-9][a-z0-9-]*$/

function parseFrontmatter(raw) {
  if (!raw.startsWith('---')) return undefined
  const end = raw.indexOf('\n---', 3)
  if (end < 0) return undefined
  const header = raw.slice(3, end)
  const body = raw.slice(end + 4).replace(/^\r?\n/, '')
  const data = {}
  for (const line of header.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('- ')) continue
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const key = line.slice(0, colon).trim()
    let value = line.slice(colon + 1).trim()
    if (value.length >= 2) {
      const first = value[0]
      const last = value[value.length - 1]
      if ((first === '"' && last === '"') || (first === "'" && last === "'")) value = value.slice(1, -1)
    }
    data[key] = value
  }
  return { data, body }
}

function flag(data, key) {
  const value = data[key]
  if (value === undefined) return undefined
  const normalized = String(value).toLowerCase()
  if (normalized === 'true' || normalized === 'yes' || normalized === 'on' || normalized === '1') return true
  if (normalized === 'false' || normalized === 'no' || normalized === 'off' || normalized === '0') return false
  return undefined
}

export function createProvider(root, logger) {
  return {
    name: 'ce-skills',
    async list() {
      const candidates = []
      for (const entry of readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue
        const file = join(root, entry.name, 'SKILL.md')
        if (!existsSync(file)) continue
        const parsed = parseFrontmatter(readFileSync(file, 'utf8'))
        if (!parsed) {
          logger?.warn?.('dsh-ce: ignoring ' + file + ': missing frontmatter')
          continue
        }
        const name = parsed.data.name || entry.name
        const description = parsed.data.description
        if (!description || !NAME_RE.test(name)) {
          logger?.warn?.('dsh-ce: ignoring ' + file + ': invalid name or description')
          continue
        }
        candidates.push({
          name,
          description,
          whenToUse: parsed.data.whenToUse,
          invocation: {
            modelInvocable: flag(parsed.data, 'disable-model-invocation') !== true,
            userInvocable: flag(parsed.data, 'user-invocable') !== false,
          },
          source: 'custom',
          provider: 'ce-skills',
          rank: 600,
          locator: file,
          path: file,
          resourceBase: { kind: 'directory', path: dirname(file) },
        })
      }
      return { candidates, complete: true }
    },
    async get(candidate) {
      const file = candidate.locator
      if (typeof file !== 'string' || !existsSync(file)) return undefined
      const parsed = parseFrontmatter(readFileSync(file, 'utf8'))
      if (!parsed) return undefined
      return { ...candidate, content: parsed.body }
    },
  }
}
