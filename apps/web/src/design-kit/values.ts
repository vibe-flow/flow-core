/**
 * Le vocabulaire du kit : prototypes, variantes, réglages — et le calcul de ce qui a été modifié.
 * Module pur (sans React ni DOM), testé, et lu par `design:apply`.
 */
import type { ComponentType } from 'react'
import type { ThemeDefaults, ThemeValues } from './css-tokens'

// ─── Réglages propres à une variante ────────────────────────────────────────────────────────

/** Un réglage agit sur une variable CSS (`cssVar: '--kpi-size'`) ou un attribut (`attr: 'data-layout'`). */
type Binding = { cssVar: `--${string}`; attr?: never } | { attr: `data-${string}`; cssVar?: never }

export type Tweak = Binding & { label: string } & (
    | { type: 'slider'; min: number; max: number; step: number; unit?: string; default: number }
    | { type: 'choice'; options: { value: string; label: string }[]; default: string }
    | { type: 'toggle'; default: boolean }
  )

export type TweakValue = number | string | boolean

export const MAX_TWEAKS = 4

export interface Variant {
  /** Id stable : `1a`, `1b`… — c'est lui qu'on cite et qu'on vise par `?v=`. */
  id: string
  /** Ce que la variante est (« File d'actions »), jamais « option A ». */
  name: string
  /** L'axe sur lequel elle se distingue (« ce qui attend d'abord »). */
  axis: string
  /** Le compromis, en une phrase : ce qu'on gagne, ce qu'on perd. */
  tradeoff: string
  tweaks?: Record<string, Tweak>
  Component: ComponentType
}

export interface Prototype {
  title: string
  /** La question à laquelle les variantes répondent. */
  question: string
  variants: Variant[]
}

export function defineVariant(v: Variant): Variant {
  const n = Object.keys(v.tweaks ?? {}).length
  if (n > MAX_TWEAKS) {
    throw new Error(`Variante ${v.id} : ${n} réglages, ${MAX_TWEAKS} au plus.`)
  }
  return v
}

export function definePrototype(p: Prototype): Prototype {
  const ids = p.variants.map((v) => v.id)
  const dup = ids.find((id, i) => ids.indexOf(id) !== i)
  if (dup) throw new Error(`Prototype « ${p.title} » : l'id ${dup} est pris deux fois.`)
  return p
}

/** La valeur courante d'un réglage : celle choisie, sinon son défaut déclaré. */
export function tweakValue(tweak: Tweak, chosen: TweakValue | undefined): TweakValue {
  return chosen ?? tweak.default
}

/** Ce que les réglages posent sur l'enveloppe de la variante : variables CSS et attributs `data-`. */
export function tweakBindings(
  tweaks: Record<string, Tweak> | undefined,
  chosen: Record<string, TweakValue> | undefined,
): { style: Record<string, string>; attrs: Record<string, string> } {
  const style: Record<string, string> = {}
  const attrs: Record<string, string> = {}
  for (const [key, t] of Object.entries(tweaks ?? {})) {
    const v = tweakValue(t, chosen?.[key])
    if (t.cssVar) {
      style[t.cssVar] =
        t.type === 'slider' ? `${v}${t.unit ?? ''}` : t.type === 'toggle' ? (v ? '1' : '0') : `${v}`
    } else if (t.attr) {
      attrs[t.attr] = String(v)
    }
  }
  return { style, attrs }
}

// ─── Ce qui a été modifié ───────────────────────────────────────────────────────────────────

/** Le format copié par « Copier les valeurs » et lu par `design:apply`. */
export interface KitValues {
  theme?: ThemeValues
  /** `{ <slug>: { <id de variante>: { <réglage>: valeur } } }` */
  prototypes?: Record<string, Record<string, Record<string, TweakValue>>>
}

export interface KitState {
  theme: ThemeValues
  /** Clé `<slug>/<id>`. */
  tweaks: Record<string, Record<string, TweakValue>>
}

export type FindVariant = (slug: string, id: string) => Variant | undefined

/** Seulement ce qui diffère des défauts : rien de modifié, objet vide. */
export function modifiedValues(
  state: KitState,
  defaults: ThemeDefaults,
  findVariant: FindVariant,
): KitValues {
  const out: KitValues = {}

  const theme: ThemeValues = {}
  const t = state.theme
  if (t.font !== undefined && t.font !== defaults.font) theme.font = t.font
  if (t.primary !== undefined && t.primary !== defaults.primary) theme.primary = t.primary
  if (t.radius !== undefined && t.radius !== defaults.radius) theme.radius = t.radius
  if (t.density !== undefined && t.density !== defaults.density) theme.density = t.density
  if (Object.keys(theme).length) out.theme = theme

  for (const [key, chosen] of Object.entries(state.tweaks)) {
    const [slug, id] = key.split('/')
    const variant = findVariant(slug, id)
    if (!variant?.tweaks) continue
    const changed: Record<string, TweakValue> = {}
    for (const [name, value] of Object.entries(chosen)) {
      const tweak = variant.tweaks[name]
      if (tweak && value !== tweak.default) changed[name] = value
    }
    if (Object.keys(changed).length) {
      out.prototypes ??= {}
      out.prototypes[slug] ??= {}
      out.prototypes[slug][id] = changed
    }
  }
  return out
}

// ─── Écrire les défauts d'une variante dans son fichier ─────────────────────────────────────

function matchingBrace(src: string, open: number): number {
  let depth = 0
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++
    else if (src[i] === '}' && --depth === 0) return i
  }
  throw new Error('accolade non fermée')
}

function literal(v: TweakValue): string {
  return typeof v === 'string' ? `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'` : String(v)
}

/**
 * Réécrit `default: …` des réglages nommés, dans le bloc `tweaks: { … }` du source d'une variante.
 * Un réglage introuvable est une erreur : mieux vaut s'arrêter qu'écrire à côté.
 */
export function setVariantDefaults(source: string, values: Record<string, TweakValue>): string {
  const tm = /\btweaks\s*:\s*\{/.exec(source)
  if (!tm) throw new Error('bloc « tweaks » introuvable')
  const tOpen = tm.index + tm[0].length - 1
  let out = source
  for (const [name, value] of Object.entries(values)) {
    const tClose = matchingBrace(out, tOpen)
    const block = out.slice(tOpen, tClose)
    const km = new RegExp(`[\\s{,]['"]?${name}['"]?\\s*:\\s*\\{`).exec(block)
    if (!km) throw new Error(`réglage « ${name} » introuvable`)
    const kOpen = tOpen + km.index + km[0].length - 1
    const kClose = matchingBrace(out, kOpen)
    const body = out.slice(kOpen, kClose)
    const dm = /(\bdefault\s*:\s*)('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|[^,}\s]+)/.exec(body)
    if (!dm) throw new Error(`réglage « ${name} » : pas de « default »`)
    const next =
      body.slice(0, dm.index) + dm[1] + literal(value) + body.slice(dm.index + dm[0].length)
    out = out.slice(0, kOpen) + next + out.slice(kClose)
  }
  return out
}
