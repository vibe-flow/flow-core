/**
 * Les choix proposés par le panneau de réglages pour le thème global.
 *
 * Volontairement fermés : quelques polices et teintes choisies, pas de sélecteur libre — un
 * réglage se juge d'un coup d'œil, pas en tâtonnant. Pour proposer autre chose, on ajoute une
 * entrée ici. Module pur (aucun import de Vite ni du DOM) : `design:apply` le lit aussi.
 */

export interface FontPreset {
  id: string
  label: string
  /** Valeur de `--font-sans` (pile CSS complète). */
  stack: string
  /** Famille Google Fonts (`Inter:wght@400;500;600;700`), absente pour une police système. */
  google?: string
}

const SANS_FALLBACK = 'ui-sans-serif, system-ui, sans-serif'

export const FONTS: FontPreset[] = [
  {
    id: 'inter',
    label: 'Inter',
    stack: `'Inter', ${SANS_FALLBACK}`,
    google: 'Inter:wght@400;500;600;700',
  },
  {
    id: 'geist',
    label: 'Geist',
    stack: `'Geist', ${SANS_FALLBACK}`,
    google: 'Geist:wght@400;500;600;700',
  },
  {
    id: 'plex',
    label: 'IBM Plex Sans',
    stack: `'IBM Plex Sans', ${SANS_FALLBACK}`,
    google: 'IBM+Plex+Sans:wght@400;500;600;700',
  },
  {
    id: 'source-serif',
    label: 'Source Serif 4',
    stack: `'Source Serif 4', ui-serif, Georgia, serif`,
    google: 'Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700',
  },
]

export function googleFontsUrl(font: FontPreset): string | null {
  return font.google ? `https://fonts.googleapis.com/css2?family=${font.google}&display=swap` : null
}

/** Une teinte primaire : `--primary` et `--primary-foreground`, en clair et en sombre (HSL shadcn). */
export interface PrimaryPreset {
  id: string
  label: string
  light: { primary: string; foreground: string }
  dark: { primary: string; foreground: string }
}

export const PRIMARIES: PrimaryPreset[] = [
  {
    id: 'encre',
    label: 'Encre',
    light: { primary: '221 83% 45%', foreground: '0 0% 100%' },
    dark: { primary: '217 91% 65%', foreground: '222 47% 11%' },
  },
  {
    id: 'sapin',
    label: 'Sapin',
    light: { primary: '158 64% 28%', foreground: '0 0% 100%' },
    dark: { primary: '152 60% 52%', foreground: '160 50% 8%' },
  },
  {
    id: 'prune',
    label: 'Prune',
    light: { primary: '271 56% 45%', foreground: '0 0% 100%' },
    dark: { primary: '270 80% 75%', foreground: '270 50% 12%' },
  },
  {
    id: 'rubis',
    label: 'Rubis',
    light: { primary: '346 77% 45%', foreground: '0 0% 100%' },
    dark: { primary: '346 85% 68%', foreground: '345 50% 10%' },
  },
]

/** Bornes des curseurs globaux. */
export const RADIUS = { min: 0, max: 1.25, step: 0.125 } // rem
export const DENSITY = { min: 0.75, max: 1.25, step: 0.05 } // multiplicateur des espacements
