import { describe, expect, it } from 'vitest'
import type { ThemeDefaults } from '../css-tokens'
import {
  defineVariant,
  modifiedValues,
  setVariantDefaults,
  tweakBindings,
  type Variant,
} from '../values'

const DEFAULTS: ThemeDefaults = {
  font: null,
  fontStack: 'ui-sans-serif, system-ui, sans-serif',
  primary: null,
  primaryHsl: '222.2 47.4% 11.2%',
  radius: 0.5,
  density: 1,
}

const variant: Variant = {
  id: '1b',
  name: 'File d’actions',
  axis: 'ce qui attend d’abord',
  tradeoff: '—',
  tweaks: {
    width: {
      type: 'slider',
      label: 'Largeur',
      cssVar: '--w',
      min: 10,
      max: 30,
      step: 1,
      unit: 'rem',
      default: 20,
    },
    grouped: { type: 'toggle', label: 'Groupé', attr: 'data-grouped', default: true },
    layout: {
      type: 'choice',
      label: 'Disposition',
      attr: 'data-layout',
      options: [
        { value: 'liste', label: 'Liste' },
        { value: 'grille', label: 'Grille' },
      ],
      default: 'liste',
    },
  },
  Component: () => null,
}
const find = (slug: string, id: string) => (slug === 'tdb' && id === '1b' ? variant : undefined)

describe('modifiedValues', () => {
  it('ne rend rien quand rien ne diffère des défauts', () => {
    const state = { theme: { radius: 0.5, density: 1 }, tweaks: { 'tdb/1b': { width: 20 } } }
    expect(modifiedValues(state, DEFAULTS, find)).toEqual({})
  })

  it('ne rend que les valeurs modifiées', () => {
    const state = {
      theme: { font: 'inter', radius: 0.5, density: 0.9 },
      tweaks: { 'tdb/1b': { width: 24, grouped: true, layout: 'grille' } },
    }
    expect(modifiedValues(state, DEFAULTS, find)).toEqual({
      theme: { font: 'inter', density: 0.9 },
      prototypes: { tdb: { '1b': { width: 24, layout: 'grille' } } },
    })
  })

  it('ignore une variante ou un réglage disparus', () => {
    const state = { theme: {}, tweaks: { 'autre/1a': { x: 1 }, 'tdb/1b': { ancien: 3 } } }
    expect(modifiedValues(state, DEFAULTS, find)).toEqual({})
  })

  it('compare la police au défaut du projet quand il est un choix proposé', () => {
    const state = { theme: { font: 'inter' }, tweaks: {} }
    expect(modifiedValues(state, { ...DEFAULTS, font: 'inter' }, find)).toEqual({})
  })
})

describe('tweakBindings', () => {
  it('pose variables CSS et attributs data-', () => {
    expect(tweakBindings(variant.tweaks, { grouped: false })).toEqual({
      style: { '--w': '20rem' },
      attrs: { 'data-grouped': 'false', 'data-layout': 'liste' },
    })
  })
})

describe('defineVariant', () => {
  it('refuse plus de quatre réglages', () => {
    const t = { type: 'toggle', label: 'x', attr: 'data-x', default: true } as const
    expect(() => defineVariant({ ...variant, tweaks: { a: t, b: t, c: t, d: t, e: t } })).toThrow(
      /4 au plus/,
    )
  })
})

describe('setVariantDefaults', () => {
  const source = `export default defineVariant({
  id: '1b',
  tweaks: {
    width: { type: 'slider', label: 'Largeur', cssVar: '--w', min: 10, max: 30, step: 1, unit: 'rem', default: 20 },
    grouped: { type: 'toggle', label: 'Groupé', attr: 'data-grouped', default: true },
    layout: {
      type: 'choice',
      options: [
        { value: 'liste', label: 'Liste' },
        { value: 'grille', label: 'Grille' },
      ],
      default: 'liste',
    },
  },
  Component: FileDactions,
})
`

  it('réécrit le défaut des seuls réglages nommés', () => {
    const out = setVariantDefaults(source, { width: 24, layout: 'grille', grouped: false })
    expect(out).toContain("unit: 'rem', default: 24 }")
    expect(out).toContain("attr: 'data-grouped', default: false }")
    expect(out).toContain("default: 'grille',")
    expect(out).toContain('min: 10, max: 30')
    expect(out.replace(/default: [^,}\n]+/g, '')).toBe(source.replace(/default: [^,}\n]+/g, ''))
  })

  it('échappe une chaîne', () => {
    expect(setVariantDefaults(source, { layout: "l'autre" })).toContain("default: 'l\\'autre',")
  })

  it('s’arrête sur un réglage inconnu', () => {
    expect(() => setVariantDefaults(source, { hauteur: 3 })).toThrow(/introuvable/)
  })
})
