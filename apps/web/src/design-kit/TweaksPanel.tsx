import { useCallback, useEffect, useMemo, useState } from 'react' // eslint-disable-line no-restricted-imports
import { Check, ChevronDown, Copy, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { THEME_DEFAULTS } from './defaults'
import { findVariant } from './registry'
import { useDesignKit } from './store'
import { DENSITY, FONTS, PRIMARIES, RADIUS } from './tokens'
import { modifiedValues, tweakValue, type KitValues, type Tweak, type TweakValue } from './values'

function countValues(v: KitValues): number {
  const theme = Object.keys(v.theme ?? {}).length
  const tweaks = Object.values(v.prototypes ?? {})
    .flatMap((byId) => Object.values(byId))
    .reduce((n, t) => n + Object.keys(t).length, 0)
  return theme + tweaks
}

export function useModifiedValues(): KitValues {
  const theme = useDesignKit((s) => s.theme)
  const tweaks = useDesignKit((s) => s.tweaks)
  return useMemo(
    () => modifiedValues({ theme, tweaks }, THEME_DEFAULTS, findVariant),
    [theme, tweaks],
  )
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Presse-papiers refusé (contexte non sécurisé, cadre) : l'ancienne méthode.
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

// ─── Champs ─────────────────────────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  modified,
  children,
}: {
  label: string
  value?: string
  modified?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          {label}
          {modified && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Modifié" />}
        </span>
        {value && <span className="font-mono text-muted-foreground">{value}</span>}
      </div>
      {children}
    </div>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: React.ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={o.value === value}
          className={cn(
            'flex min-h-8 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded px-2 text-xs transition-colors',
            o.value === value
              ? 'bg-background font-medium text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Range({
  min,
  max,
  step,
  value,
  onChange,
}: {
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-8 w-full cursor-pointer accent-[hsl(var(--primary))]"
    />
  )
}

function TweakField({
  tweak,
  value,
  isDefault,
  onChange,
}: {
  tweak: Tweak
  value: TweakValue
  isDefault: boolean
  onChange: (v: TweakValue) => void
}) {
  if (tweak.type === 'slider') {
    return (
      <Field label={tweak.label} value={`${value}${tweak.unit ?? ''}`} modified={!isDefault}>
        <Range {...tweak} value={value as number} onChange={onChange} />
      </Field>
    )
  }
  if (tweak.type === 'choice') {
    return (
      <Field label={tweak.label} modified={!isDefault}>
        <Segmented options={tweak.options} value={value as string} onChange={onChange} />
      </Field>
    )
  }
  return (
    <label className="flex min-h-8 items-center justify-between gap-3 text-xs font-medium">
      <span className="flex items-center gap-1.5">
        {tweak.label}
        {!isDefault && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Modifié" />}
      </span>
      <Switch checked={value as boolean} onCheckedChange={onChange} />
    </label>
  )
}

function Section({
  title,
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3 rounded-md border bg-background p-3">
      <header>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </header>
      {children}
    </section>
  )
}

// ─── Sections ───────────────────────────────────────────────────────────────────────────────

const PROJECT = '__projet'

function ThemeSection({ values }: { values: KitValues }) {
  const theme = useDesignKit((s) => s.theme)
  const mode = useDesignKit((s) => s.mode)
  const setTheme = useDesignKit((s) => s.setTheme)
  const setMode = useDesignKit((s) => s.setMode)
  const d = THEME_DEFAULTS
  const changed = values.theme ?? {}
  const radius = theme.radius ?? d.radius
  const density = theme.density ?? d.density

  return (
    <Section title="Thème" hint="Les variables de index.css">
      <Field label="Police" modified={'font' in changed}>
        <Segmented
          value={theme.font ?? d.font ?? PROJECT}
          onChange={(v) => setTheme('font', v === PROJECT ? undefined : v)}
          options={[
            ...(d.font ? [] : [{ value: PROJECT, label: 'Projet' }]),
            ...FONTS.map((f) => ({
              value: f.id,
              label: <span style={{ fontFamily: f.stack }}>{f.label}</span>,
            })),
          ]}
        />
      </Field>
      <Field label="Couleur primaire" modified={'primary' in changed}>
        <Segmented
          value={theme.primary ?? d.primary ?? PROJECT}
          onChange={(v) => setTheme('primary', v === PROJECT ? undefined : v)}
          options={[
            ...(d.primary
              ? []
              : [
                  {
                    value: PROJECT,
                    label: <Swatch color={`hsl(${d.primaryHsl})`} label="Projet" />,
                  },
                ]),
            ...PRIMARIES.map((p) => ({
              value: p.id,
              label: (
                <Swatch
                  color={`hsl(${mode === 'dark' ? p.dark.primary : p.light.primary})`}
                  label={p.label}
                />
              ),
            })),
          ]}
        />
      </Field>
      <Field label="Arrondi" value={`${radius}rem`} modified={'radius' in changed}>
        <Range {...RADIUS} value={radius} onChange={(v) => setTheme('radius', v)} />
      </Field>
      <Field label="Densité" value={`×${density.toFixed(2)}`} modified={'density' in changed}>
        <Range {...DENSITY} value={density} onChange={(v) => setTheme('density', v)} />
      </Field>
      <Field label="Mode" value="aperçu, non retenu">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'light', label: 'Clair' },
            { value: 'dark', label: 'Sombre' },
          ]}
        />
      </Field>
    </Section>
  )
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <>
      <span className="h-3 w-3 shrink-0 rounded-full border" style={{ background: color }} />
      {label}
    </>
  )
}

function VariantSection({ variantKey }: { variantKey: string }) {
  const [slug, id] = variantKey.split('/')
  const variant = findVariant(slug, id)
  const chosen = useDesignKit((s) => s.tweaks[variantKey])
  const setTweak = useDesignKit((s) => s.setTweak)
  if (!variant) return null
  const tweaks = Object.entries(variant.tweaks ?? {})

  return (
    <Section title={`${variant.id} · ${variant.name}`} hint={variant.tradeoff}>
      {tweaks.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucun réglage pour cette variante.</p>
      )}
      {tweaks.map(([name, tweak]) => {
        const value = tweakValue(tweak, chosen?.[name])
        return (
          <TweakField
            key={name}
            tweak={tweak}
            value={value}
            isDefault={value === tweak.default}
            onChange={(v) => setTweak(variantKey, name, v)}
          />
        )
      })}
    </Section>
  )
}

// ─── Panneau ────────────────────────────────────────────────────────────────────────────────

function ResizeHandle() {
  const setPanelWidth = useDesignKit((s) => s.setPanelWidth)
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      const right =
        window.innerWidth - (e.currentTarget.parentElement?.getBoundingClientRect().right ?? 0)
      const move = (ev: PointerEvent) => setPanelWidth(window.innerWidth - right - ev.clientX)
      const up = () => {
        window.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
      }
      window.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
    },
    [setPanelWidth],
  )
  return (
    <div
      onPointerDown={onPointerDown}
      title="Glisser pour redimensionner"
      className="absolute inset-y-0 -left-1 hidden w-2 cursor-col-resize rounded-l-lg hover:bg-primary/20 sm:block"
    />
  )
}

/** Le panneau isole ses propres mesures : la densité et l'arrondi réglés ne le déforment pas. */
const PANEL_ISOLATION = {
  '--density': '1',
  '--radius': '0.5rem',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
} as React.CSSProperties

export default function TweaksPanel() {
  const open = useDesignKit((s) => s.panelOpen)
  const width = useDesignKit((s) => s.panelWidth)
  const onScreen = useDesignKit((s) => s.onScreen)
  const setOpen = useDesignKit((s) => s.setPanelOpen)
  const reset = useDesignKit((s) => s.reset)
  const values = useModifiedValues()
  const count = countValues(values)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(t)
  }, [copied])

  const copy = async () => setCopied(await copyText(JSON.stringify(values, null, 2)))

  if (!open) {
    return (
      <div className="fixed bottom-3 right-3 z-[2147483000]" style={PANEL_ISOLATION}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-full border bg-card px-3 text-sm font-medium text-card-foreground shadow-lg hover:bg-accent"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span className="hidden sm:inline">Réglages</span>
          {count > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-white">
              {count}
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <aside
      aria-label="Réglages de design"
      className="fixed bottom-3 right-3 z-[2147483000] flex max-h-[min(85vh,760px)] flex-col rounded-lg border bg-card text-card-foreground shadow-2xl"
      style={{ ...PANEL_ISOLATION, width: `min(${width}px, calc(100vw - 1.5rem))` }}
    >
      <ResizeHandle />
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div>
          <h2 className="text-sm font-semibold">Réglages</h2>
          <p className="text-xs text-muted-foreground">
            {count
              ? `${count} valeur${count > 1 ? 's' : ''} modifiée${count > 1 ? 's' : ''}`
              : 'Valeurs du projet'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={reset}
            disabled={!count}
            title="Revenir aux valeurs du projet"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            title="Replier"
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto bg-muted/50 p-3">
        <ThemeSection values={values} />
        {onScreen.map((key) => (
          <VariantSection key={key} variantKey={key} />
        ))}
      </div>

      <footer className="space-y-1.5 border-t p-3">
        <button
          type="button"
          onClick={copy}
          disabled={!count}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? 'Copié' : count ? 'Copier les valeurs' : 'Rien de modifié'}
        </button>
        <p className="text-center text-[11px] text-muted-foreground">
          Retenues par <code className="font-mono">bun run design:apply</code>
        </p>
      </footer>
    </aside>
  )
}
