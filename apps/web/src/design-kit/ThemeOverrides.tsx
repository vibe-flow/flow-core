import { useEffect } from 'react'
import { useDesignKit } from './store'
import { FONTS, PRIMARIES, googleFontsUrl } from './tokens'
import type { ThemeValues } from './css-tokens'

/** Le CSS qui pose les réglages de thème par-dessus `index.css` (spécificité `html:root`). */
export function themeOverrideCss(theme: ThemeValues): string {
  const root: string[] = []
  const dark: string[] = []
  const font = FONTS.find((f) => f.id === theme.font)
  if (font) root.push(`--font-sans: ${font.stack};`)
  const p = PRIMARIES.find((x) => x.id === theme.primary)
  if (p) {
    root.push(`--primary: ${p.light.primary};`, `--primary-foreground: ${p.light.foreground};`)
    dark.push(`--primary: ${p.dark.primary};`, `--primary-foreground: ${p.dark.foreground};`)
  }
  if (theme.radius !== undefined) root.push(`--radius: ${theme.radius}rem;`)
  if (theme.density !== undefined) root.push(`--density: ${theme.density};`)
  return [
    root.length ? `html:root { ${root.join(' ')} }` : '',
    dark.length ? `html.dark { ${dark.join(' ')} }` : '',
  ].join('\n')
}

function headElement<T extends HTMLElement>(id: string, tag: string): T {
  let el = document.getElementById(id) as T | null
  if (!el) {
    el = document.createElement(tag) as T
    el.id = id
    document.head.appendChild(el)
  }
  return el
}

/** Applique au document le thème réglé et le mode clair/sombre. Ne rend rien. */
export default function ThemeOverrides() {
  const theme = useDesignKit((s) => s.theme)
  const mode = useDesignKit((s) => s.mode)

  useEffect(() => {
    headElement<HTMLStyleElement>('design-kit-theme', 'style').textContent = themeOverrideCss(theme)
    const font = FONTS.find((f) => f.id === theme.font)
    const url = font ? googleFontsUrl(font) : null
    const link = headElement<HTMLLinkElement>('design-kit-font', 'link')
    link.rel = 'stylesheet'
    if (url) link.href = url
    else link.removeAttribute('href')
  }, [theme])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', mode === 'dark')
  }, [mode])

  return null
}
