import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))

function hostModules() {
  const candidates = [
    process.env.DSH_RUNTIME,
    join(homedir(), '.dsh', 'profiles', 'node_modules'),
  ].filter(Boolean)
  for (const dir of candidates) {
    if (existsSync(join(dir, '@deepseek-ai', 'cordis')) && existsSync(join(dir, '@deepseek-ai', 'dsh-skill'))) return dir
  }
  return undefined
}

const host = hostModules()
const skip = host ? false : 'no DSH host found; set DSH_RUNTIME'

async function boot(plugin) {
  const { Context } = await import(pathToFileURL(join(host, '@deepseek-ai', 'cordis', 'lib', 'index.js')).href)
  const { SkillRegistry } = await import(pathToFileURL(join(host, '@deepseek-ai', 'dsh-skill', 'lib', 'index.js')).href)
  const app = new Context()
  app.plugin(SkillRegistry)
  await app.start?.()
  const mounted = app.plugin(plugin)
  if (mounted && typeof mounted.then === 'function') await mounted
  return { app, mounted }
}

test('serves 39 skills (38 upstream + adapter)', { skip }, async () => {
  const plugin = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
  const { app } = await boot(plugin)
  const names = (await app.skills.list()).map((s) => s.name)
  assert.equal(names.length, 39, 'expected 39, got ' + names.length)
  assert.ok(names.includes('ce-dsh-host'), 'adapter missing')
  assert.ok(names.includes('ce-plan'), 'ce-plan missing')
})

test('honours CE manual-only flags', { skip }, async () => {
  const plugin = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
  const { app } = await boot(plugin)
  const all = await app.skills.list()
  const manual = all.filter((s) => s.invocation.modelInvocable === false)
  assert.equal(manual.length, 9, 'expected 9 manual-only, got ' + manual.length)
  const polish = all.find((s) => s.name === 'ce-polish')
  assert.equal(polish.invocation.userInvocable, true)
  const adapter = all.find((s) => s.name === 'ce-dsh-host')
  assert.equal(adapter.invocation.modelInvocable, true)
})

test('loads a body from the package', { skip }, async () => {
  const plugin = await import(pathToFileURL(join(root, 'lib', 'index.js')).href)
  const { app } = await boot(plugin)
  const def = await app.skills.get('ce-plan')
  assert.match(def.content, /plan/i)
})
