#!/usr/bin/env node
// Generate index.json in the DSH plugin market format 1.
// Usage: node scripts/build-market-index.mjs [--source npm|git] [--commit <40-hex sha>]
import { readFileSync, writeFileSync } from 'node:fs'

const args = process.argv.slice(2)
const opt = (name) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const commit = opt('--commit')
const sourceType = opt('--source') ?? 'npm'
if (sourceType === 'git' && !/^[0-9a-f]{40}$/.test(commit ?? '')) {
  console.error('usage: build-market-index.mjs [--source npm|git] [--commit <40-hex sha>]')
  process.exit(2)
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const source = sourceType === 'npm'
  ? { type: 'npm' }
  : { type: 'git', url: 'https://github.com/michael-wojcik/dsh-ce', commit }
const index = {
  format: 1,
  title: 'Compound Engineering for DeepSeek Harness',
  description: 'Preset-scoped Compound Engineering skills, a native reviewer, and session-native memory for DSH.',
  metadata: { categories: {}, labels: {}, sortKeys: {} },
  plugins: [
    {
      name: pkg.name,
      title: 'Compound Engineering',
      description: 'Adds a Compound Engineering agent preset to DSH: the 38 CE skills scoped to that preset, a native ce_reviewer, and session-query memory bindings.',
      author: 'Michael Wojcik',
      homepage: pkg.homepage,
      repository: { url: pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '') },
      metadata: { keywords: pkg.keywords ?? [], labels: [], sortKeys: {} },
      versions: [
        {
          version: pkg.version,
          publishTimestamp: Math.floor(Date.now() / 1000),
          source,
          engines: { dsh: pkg.engines.dsh },
        },
      ],
    },
  ],
}

writeFileSync(new URL('../index.json', import.meta.url), JSON.stringify(index, null, 2) + '\n')
console.log('wrote index.json for ' + pkg.name + '@' + pkg.version + ' from ' + sourceType)
