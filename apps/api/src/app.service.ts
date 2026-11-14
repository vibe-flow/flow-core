import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Injectable } from '@nestjs/common'

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

// La racine du monorepo depuis apps/api/src (même repère que app.module.ts).
const RACINE = resolve(__dirname, '../../..')
const FICHIER_VERSIONS = join(RACINE, '.dimora', 'versions.json')

const KINDS = ['nouveautes', 'ameliorations', 'corrections'] as const
const liste = (s: unknown): string[] =>
  Array.isArray(s) ? s.filter((x): x is string => typeof x === 'string') : []

/**
 * Les notes de version du projet, écrites par la plateforme de dev à chaque livraison
 * (`.dimora/versions.json`, embarqué avec le code), plus récentes d'abord — liste vide tant que le
 * projet n'en a pas. C'est la source du « quoi de neuf » que `components/MiseAJour` montre, dans la
 * même et unique bulle que la mise à jour : jamais deux pop-up.
 */
export function lireVersions(fichier: string = FICHIER_VERSIONS, max = 40): Version[] {
  try {
    if (!existsSync(fichier)) return []
    const d: unknown = JSON.parse(readFileSync(fichier, 'utf-8'))
    if (!Array.isArray(d)) return []
    return d
      .filter((e) => e && typeof e.version === 'string')
      .slice(0, max)
      .map((e) => ({
        version: e.version as string,
        date: typeof e.date === 'string' ? e.date : '',
        ...(typeof e.title === 'string' ? { title: e.title } : {}),
        ...(typeof e.resume === 'string' ? { resume: e.resume } : {}),
        une: Array.isArray(e.une)
          ? e.une
              .filter(
                (u: unknown): u is Highlight =>
                  !!u &&
                  typeof (u as Highlight).titre === 'string' &&
                  typeof (u as Highlight).texte === 'string',
              )
              .map((u: Highlight) => ({
                titre: u.titre,
                texte: u.texte,
                kind: KINDS.includes(u.kind) ? u.kind : 'nouveautes',
              }))
              .slice(0, 2)
          : [],
        nouveautes: liste(e.nouveautes),
        ameliorations: liste(e.ameliorations),
        corrections: liste(e.corrections),
      }))
  } catch {
    return []
  }
}

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  }

  getVersions(): { versions: Version[] } {
    return { versions: lireVersions() }
  }
}
