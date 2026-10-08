// L'environnement se déclare : sans NODE_ENV explicite, l'API ne démarre pas — et l'image de
// production le fixe. Ces deux faits sont tout ce qui sépare la production de la connexion de dev.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const original = process.env.NODE_ENV

async function load(value: string | undefined) {
  vi.resetModules()
  if (value === undefined) delete process.env.NODE_ENV
  else process.env.NODE_ENV = value
  return import('../runtime')
}

describe('runtime', () => {
  afterEach(() => {
    process.env.NODE_ENV = original
  })

  it('refuse de démarrer sans NODE_ENV', async () => {
    await expect(load(undefined)).rejects.toThrow(/NODE_ENV doit valoir/)
  })

  it('refuse une valeur inconnue', async () => {
    await expect(load('staging')).rejects.toThrow(/NODE_ENV doit valoir/)
  })

  it('development active les facilités de développement, production non', async () => {
    expect((await load('development')).IS_DEVELOPMENT).toBe(true)
    const prod = await load('production')
    expect(prod.IS_DEVELOPMENT).toBe(false)
    expect(prod.IS_PRODUCTION).toBe(true)
  })

  it("l'image de production fixe NODE_ENV=production", () => {
    const dockerfile = readFileSync(join(__dirname, '../../../../../Dockerfile.api'), 'utf8')
    expect(dockerfile).toMatch(/^ENV NODE_ENV=production$/m)
  })
})
