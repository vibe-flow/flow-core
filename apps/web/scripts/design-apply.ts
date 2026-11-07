/**
 * `bun run design:apply <fichier.json | ->` — écrit les valeurs copiées du panneau de réglages
 * comme nouveaux défauts : le thème dans `src/index.css`, les réglages d'une variante dans son
 * fichier. Après coup, le panneau ne voit plus rien de « modifié » : rien à réintégrer.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { z } from 'zod'
import { writeThemeDefaults } from '../src/design-kit/css-tokens'
import { setVariantDefaults } from '../src/design-kit/values'

const WEB = resolve(import.meta.dir, '..')
const ROOT = resolve(WEB, '../..')
const INDEX_CSS = join(WEB, 'src/index.css')
const PROTOTYPES = join(WEB, 'src/prototypes')

const Value = z.union([z.number(), z.string(), z.boolean()])
const KitValuesSchema = z
  .object({
    theme: z
      .object({
        font: z.string().optional(),
        primary: z.string().optional(),
        radius: z.number().optional(),
        density: z.number().optional(),
      })
      .strict()
      .optional(),
    prototypes: z.record(z.record(z.record(Value))).optional(),
  })
  .strict()

function variantFile(slug: string, id: string): string {
  const dir = join(PROTOTYPES, slug)
  let files: string[]
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.tsx'))
  } catch {
    throw new Error(`prototype « ${slug} » introuvable (${relative(ROOT, dir)})`)
  }
  const idRe = new RegExp(`\\bid\\s*:\\s*['"]${id}['"]`)
  const hit = files.find((f) => idRe.test(readFileSync(join(dir, f), 'utf8')))
  if (!hit) throw new Error(`variante ${slug}/${id} introuvable`)
  return join(dir, hit)
}

async function main() {
  const arg = process.argv[2]
  if (!arg) {
    console.error('usage : bun run design:apply <fichier.json | ->   (- : entrée standard)')
    process.exit(2)
  }
  const text =
    arg === '-' ? await Bun.stdin.text() : readFileSync(resolve(process.cwd(), arg), 'utf8')
  const values = KitValuesSchema.parse(JSON.parse(text))
  // Tout est calculé avant d'écrire : une valeur refusée n'écrit rien du tout.
  const writes: { file: string; content: string; keys: string[] }[] = []
  if (values.theme && Object.keys(values.theme).length) {
    const content = writeThemeDefaults(readFileSync(INDEX_CSS, 'utf8'), values.theme)
    writes.push({ file: INDEX_CSS, content, keys: Object.keys(values.theme) })
  }
  for (const [slug, byId] of Object.entries(values.prototypes ?? {})) {
    for (const [id, tweaks] of Object.entries(byId)) {
      const file = variantFile(slug, id)
      const content = setVariantDefaults(readFileSync(file, 'utf8'), tweaks)
      writes.push({ file, content, keys: Object.keys(tweaks) })
    }
  }
  for (const w of writes) writeFileSync(w.file, w.content)

  console.warn(
    writes.length
      ? `Défauts écrits :\n${writes.map((w) => `  ${relative(ROOT, w.file)} : ${w.keys.join(', ')}`).join('\n')}`
      : 'Rien à écrire.',
  )
}

main().catch((e: unknown) => {
  console.error(`design:apply : ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
