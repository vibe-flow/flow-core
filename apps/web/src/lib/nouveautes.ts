/**
 * Le « quoi de neuf » de l'application : les notes de version servies par l'API (`/api/versions`,
 * lues du `.dimora/versions.json` écrit par la plateforme de dev à chaque livraison). Le composant
 * `MiseAJour` les montre dans la MÊME et UNIQUE bulle que la mise à jour — jamais deux pop-up.
 *
 * Ce qui a été vu est gardé dans le navigateur, par appareil (`usePersistedState('nouveautes.vue')`,
 * synchronisé entre onglets) : la dernière version montrée puis fermée. Rien vu encore (nouvel
 * appareil, ou avant que ça existe) : les dernières versions une fois, pour que ça ait du sens d'emblée.
 */

export interface Highlight {
  titre: string
  texte: string
  kind: 'nouveautes' | 'ameliorations' | 'corrections'
}
export interface Version {
  version: string
  date: string
  title?: string
  resume?: string
  une: Highlight[]
  nouveautes: string[]
  ameliorations: string[]
  corrections: string[]
}

const PREMIER = 4
const MAX = 8

const num = (v: string) => v.replace(/^v/, '').split('.').map(Number)
/** a est plus récente que b */
export const plusRecente = (a: string, b: string) => {
  const x = num(a)
  const y = num(b)
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0)
  return false
}
export const compte = (v: Version) =>
  v.nouveautes.length + v.ameliorations.length + v.corrections.length
export const titre = (v: Version) =>
  v.resume ?? v.title ?? v.nouveautes[0] ?? v.ameliorations[0] ?? v.corrections[0] ?? ''

/** Les versions à dire : plus récentes que celle vue — les dernières quand rien n'a été vu. */
export function nonVues(list: Version[], vue: string | null): Version[] {
  const dites = list.filter((v) => compte(v) > 0)
  return (vue ? dites.filter((v) => plusRecente(v.version, vue)) : dites.slice(0, PREMIER)).slice(
    0,
    MAX,
  )
}

/** Charge les notes de version ; liste vide si l'API ne répond pas ou si le projet n'en a pas. */
export async function chargerVersions(): Promise<Version[]> {
  try {
    const r = await fetch('/api/versions')
    if (!r.ok) return []
    const d: unknown = await r.json()
    const versions = (d as { versions?: unknown })?.versions
    return Array.isArray(versions) ? (versions as Version[]) : []
  } catch {
    return []
  }
}
