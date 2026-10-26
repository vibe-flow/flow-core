// `.dimora/app.yml` déclare à Dimora les rôles de l'application : exactement ceux de
// ROLE_PERMISSIONS, la seule table. Ce test empêche les deux de diverger.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { ROLE_PERMISSIONS } from '@template-dev/shared'

const declaration = parse(
  readFileSync(resolve(__dirname, '../../../../../.dimora/app.yml'), 'utf8'),
) as { sso?: unknown; roles?: Record<string, unknown> }

describe('.dimora/app.yml', () => {
  it("dit que l'application se connecte par le SSO", () => {
    expect(declaration.sso).toBe(true)
  })

  it('déclare exactement les rôles de ROLE_PERMISSIONS, chacun avec son libellé', () => {
    expect(Object.keys(declaration.roles ?? {}).sort()).toEqual(
      Object.keys(ROLE_PERMISSIONS).sort(),
    )
    for (const label of Object.values(declaration.roles ?? {})) {
      expect(typeof label === 'string' && label.trim().length > 0).toBe(true)
    }
  })
})
