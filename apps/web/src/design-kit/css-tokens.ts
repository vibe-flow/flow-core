/**
 * Lire et écrire les défauts du thème dans `index.css` — la seule source des valeurs du projet.
 *
 * Le panneau s'en sert pour savoir ce qui est « modifié » ; `design:apply` pour écrire les valeurs
 * retenues comme nouveaux défauts. Module pur : du texte en entrée, du texte en sortie.
 */
import { FONTS, PRIMARIES, googleFontsUrl } from './tokens'

/** Les valeurs de thème qu'on échange (panneau → JSON → `design:apply`) : des ids et des nombres. */
export interface ThemeValues {
  font?: string
  primary?: string
  radius?: number
  density?: number
}

/** Les défauts lus dans `index.css`. `font`/`primary` valent `null` hors des choix proposés. */
export interface ThemeDefaults {
  font: string | null
  fontStack: string
  primary: string | null
  /** `--primary` du mode clair, tel qu'écrit. */
  primaryHsl: string
  radius: number
  density: number
}

const FONT_IMPORT_MARK = '/* design-kit: police */'

interface Block {
  open: number // index juste après `{`
  close: number // index de `}`
}

function findBlock(css: string, selector: string): Block {
  const re = new RegExp(`(^|\\n)\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`)
  const m = re.exec(css)
  if (!m) throw new Error(`index.css : bloc « ${selector} » introuvable`)
  const open = m.index + m[0].length
  const close = css.indexOf('}', open)
  if (close < 0) throw new Error(`index.css : bloc « ${selector} » non fermé`)
  return { open, close }
}

function varRegex(name: string) {
  return new RegExp(`(${name.replace(/-/g, '\\-')}\\s*:\\s*)([^;]+)(;)`)
}

export function getVar(css: string, selector: string, name: string): string | null {
  const { open, close } = findBlock(css, selector)
  const m = varRegex(name).exec(css.slice(open, close))
  return m ? m[2].trim() : null
}

export function setVar(css: string, selector: string, name: string, value: string): string {
  const { open, close } = findBlock(css, selector)
  const body = css.slice(open, close)
  const re = varRegex(name)
  let next: string
  if (re.test(body)) {
    next = body.replace(re, `$1${value}$3`)
  } else {
    // Ajouté en fin de bloc, avec l'indentation des autres variables.
    const indent = /\n(\s+)--/.exec(body)?.[1] ?? '    '
    next = body.replace(/\s*$/, '') + `\n${indent}${name}: ${value};\n` + closingIndent(body)
  }
  return css.slice(0, open) + next + css.slice(close)
}

function closingIndent(body: string): string {
  return /\n([ \t]*)$/.exec(body)?.[1] ?? ''
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

export function fontIdFromStack(stack: string): string | null {
  return FONTS.find((f) => norm(f.stack) === norm(stack))?.id ?? null
}

export function primaryIdFromValue(primary: string | null): string | null {
  if (!primary) return null
  return PRIMARIES.find((p) => norm(p.light.primary) === norm(primary))?.id ?? null
}

export function readThemeDefaults(css: string): ThemeDefaults {
  const fontStack = getVar(css, ':root', '--font-sans') ?? 'ui-sans-serif, system-ui, sans-serif'
  const primaryHsl = getVar(css, ':root', '--primary') ?? '222.2 47.4% 11.2%'
  return {
    font: fontIdFromStack(fontStack),
    fontStack,
    primary: primaryIdFromValue(primaryHsl),
    primaryHsl,
    radius: parseFloat(getVar(css, ':root', '--radius') ?? '0.5'),
    density: parseFloat(getVar(css, ':root', '--density') ?? '1'),
  }
}

/** Écrit des valeurs de thème comme nouveaux défauts de `index.css`. Un id inconnu est une erreur. */
export function writeThemeDefaults(css: string, values: ThemeValues): string {
  let out = css
  if (values.font !== undefined) {
    const font = FONTS.find((f) => f.id === values.font)
    if (!font) throw new Error(`police inconnue : ${values.font}`)
    out = setVar(out, ':root', '--font-sans', font.stack)
    out = out
      .split('\n')
      .filter((line) => !line.includes(FONT_IMPORT_MARK))
      .join('\n')
    const url = googleFontsUrl(font)
    if (url) out = `@import url('${url}'); ${FONT_IMPORT_MARK}\n` + out
  }
  if (values.primary !== undefined) {
    const p = PRIMARIES.find((x) => x.id === values.primary)
    if (!p) throw new Error(`couleur inconnue : ${values.primary}`)
    out = setVar(out, ':root', '--primary', p.light.primary)
    out = setVar(out, ':root', '--primary-foreground', p.light.foreground)
    out = setVar(out, '.dark', '--primary', p.dark.primary)
    out = setVar(out, '.dark', '--primary-foreground', p.dark.foreground)
  }
  if (values.radius !== undefined) out = setVar(out, ':root', '--radius', `${values.radius}rem`)
  if (values.density !== undefined) out = setVar(out, ':root', '--density', `${values.density}`)
  return out
}
