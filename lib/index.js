import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProvider } from './provider.js'

export const name = 'dsh-ce'

/** Mount inside the CE preset so the catalog is preset-scoped. */
export const inject = ['skills']

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))

export function apply(ctx) {
  const root = join(packageRoot, 'skills')
  ctx.skills.registerProvider(() => createProvider(root, ctx.logger))
  ctx.logger?.info?.('[dsh-ce] serving CE skills from ' + root)
}
