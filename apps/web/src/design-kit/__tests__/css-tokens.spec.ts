import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getVar, readThemeDefaults, setVar, writeThemeDefaults } from '../css-tokens'

const INDEX_CSS = readFileSync(resolve(__dirname, '../../index.css'), 'utf8')

describe('readThemeDefaults', () => {
  it('lit les défauts du vrai index.css', () => {
    const d = readThemeDefaults(INDEX_CSS)
    expect(d.radius).toBe(0.5)
    expect(d.density).toBe(1)
    expect(d.font).toBeNull() // pile système : hors des polices proposées
    expect(d.primary).toBeNull()
    expect(d.primaryHsl).toBe('222.2 47.4% 11.2%')
  })
})

describe('setVar', () => {
  const css = ':root {\n    --a: 1;\n  }\n\n  .dark {\n    --a: 2;\n  }\n'

  it('remplace une variable dans le seul bloc visé', () => {
    const out = setVar(css, '.dark', '--a', '3')
    expect(getVar(out, ':root', '--a')).toBe('1')
    expect(getVar(out, '.dark', '--a')).toBe('3')
  })

  it('ajoute une variable absente avec l’indentation du bloc', () => {
    const out = setVar(css, ':root', '--b', '4')
    expect(out).toContain('    --a: 1;\n    --b: 4;\n  }')
  })
})

describe('writeThemeDefaults', () => {
  it('écrit police, couleur, arrondi et densité, puis les relit comme défauts', () => {
    const out = writeThemeDefaults(INDEX_CSS, {
      font: 'inter',
      primary: 'sapin',
      radius: 0.75,
      density: 0.9,
    })
    const d = readThemeDefaults(out)
    expect(d).toMatchObject({ font: 'inter', primary: 'sapin', radius: 0.75, density: 0.9 })
    expect(getVar(out, '.dark', '--primary')).toBe('152 60% 52%')
    expect(out.startsWith("@import url('https://fonts.googleapis.com/css2?family=Inter")).toBe(true)
    // Le reste du fichier est intact.
    expect(getVar(out, ':root', '--background')).toBe('0 0% 100%')
    expect(out).toContain('touch-action: manipulation;')
  })

  it('remplace l’import de police au lieu de l’empiler', () => {
    const once = writeThemeDefaults(INDEX_CSS, { font: 'inter' })
    const twice = writeThemeDefaults(once, { font: 'plex' })
    expect(twice.match(/@import url/g)).toHaveLength(1)
    expect(twice).toContain('IBM+Plex+Sans')
  })

  it('refuse un id inconnu', () => {
    expect(() => writeThemeDefaults(INDEX_CSS, { primary: 'fuchsia' })).toThrow(/inconnue/)
  })

  it('ne touche à rien sans valeur', () => {
    expect(writeThemeDefaults(INDEX_CSS, {})).toBe(INDEX_CSS)
  })
})
