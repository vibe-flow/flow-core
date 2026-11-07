/**
 * Les prototypes, découverts tout seuls : chaque dossier `src/prototypes/<slug>/` dont l'`index.ts`
 * exporte par défaut un `definePrototype(…)`. Rien à déclarer ailleurs.
 */
import type { Prototype, Variant } from './values'

const modules = import.meta.glob<{ default: Prototype }>('../prototypes/*/index.ts', {
  eager: true,
})

export const PROTOTYPES: Record<string, Prototype> = Object.fromEntries(
  Object.entries(modules)
    .map(([path, mod]) => [path.split('/').at(-2) as string, mod.default] as const)
    .sort(([a], [b]) => a.localeCompare(b)),
)

export function findVariant(slug: string, id: string): Variant | undefined {
  return PROTOTYPES[slug]?.variants.find((v) => v.id === id)
}
