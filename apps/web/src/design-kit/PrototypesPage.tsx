import { useEffect, useRef, useState } from 'react' // eslint-disable-line no-restricted-imports
import { Link, Route, Routes, useParams, useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Columns2, LayoutGrid } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { PROTOTYPES } from './registry'
import { useDesignKit } from './store'
import { tweakBindings, type Prototype, type Variant } from './values'

/** `?capture=1` : sans le sélecteur ni le panneau, pour une capture d'écran ou un cadre de planche. */
export function useCaptureMode() {
  const [params] = useSearchParams()
  return params.get('capture') === '1'
}

// ─── Liste ──────────────────────────────────────────────────────────────────────────────────

function PrototypeList() {
  const entries = Object.entries(PROTOTYPES)
  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Prototypes</CardTitle>
            <CardDescription>
              Des variantes d’écran à comparer, en développement seulement. Chaque dossier de{' '}
              <code className="font-mono">src/prototypes/</code> apparaît ici.
            </CardDescription>
          </CardHeader>
        </Card>
        {entries.length === 0 && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Aucun prototype : voir <code className="font-mono">.flow/design-kit.md</code>.
            </CardContent>
          </Card>
        )}
        {entries.map(([slug, p]) => (
          <Card key={slug}>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <div className="space-y-1.5">
                <CardTitle className="text-lg">
                  <Link to={slug} className="hover:underline">
                    {p.title}
                  </Link>
                </CardTitle>
                <CardDescription>{p.question}</CardDescription>
              </div>
              <Link
                to={`${slug}?v=all`}
                className="flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
              >
                <Columns2 className="h-4 w-4" /> Planche
              </Link>
            </CardHeader>
            <CardContent>
              <ul className="divide-y rounded-md border">
                {p.variants.map((v) => (
                  <li key={v.id}>
                    <Link
                      to={`${slug}?v=${v.id}`}
                      className="flex items-baseline gap-3 px-3 py-2 text-sm hover:bg-accent"
                    >
                      <span className="font-mono text-xs font-semibold">{v.id}</span>
                      <span className="font-medium">{v.name}</span>
                      <span className="truncate text-muted-foreground">— {v.axis}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Une variante ───────────────────────────────────────────────────────────────────────────

function VariantView({ slug, variant }: { slug: string; variant: Variant }) {
  const chosen = useDesignKit((s) => s.tweaks[`${slug}/${variant.id}`])
  const { style, attrs } = tweakBindings(variant.tweaks, chosen)
  const { Component } = variant
  return (
    <div className="group/v min-h-screen" data-variant={variant.id} style={style} {...attrs}>
      <Component />
    </div>
  )
}

function Switcher({
  slug,
  prototype,
  current,
  select,
}: {
  slug: string
  prototype: Prototype
  current: string
  select: (id: string) => void
}) {
  const vs = prototype.variants
  const i = vs.findIndex((v) => v.id === current)
  const v = vs[i]
  const btn =
    'flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-medium transition-colors'
  return (
    <nav
      aria-label="Variantes"
      className="fixed bottom-3 left-3 z-[2147482000] flex max-w-[calc(100vw-4.75rem)] items-center gap-1 rounded-full border bg-card p-1 text-card-foreground shadow-lg sm:left-1/2 sm:max-w-[calc(100vw-12rem)] sm:-translate-x-1/2"
      style={{ '--density': '1', '--radius': '0.5rem' } as React.CSSProperties}
    >
      <Link to="/prototypes" title="Tous les prototypes" className={cn(btn, 'hover:bg-accent')}>
        <LayoutGrid className="h-4 w-4" />
      </Link>
      {current !== 'all' && (
        <button
          type="button"
          title="Précédente (←)"
          onClick={() => select(vs[(i - 1 + vs.length) % vs.length].id)}
          className={cn(btn, 'hover:bg-accent')}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {vs.map((x, n) => (
        <button
          key={x.id}
          type="button"
          title={`${n + 1} · ${x.name} — ${x.axis}`}
          aria-pressed={x.id === current}
          onClick={() => select(x.id)}
          className={cn(
            btn,
            'font-mono',
            x.id === current ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
          )}
        >
          {x.id}
        </button>
      ))}
      {current !== 'all' && (
        <button
          type="button"
          title="Suivante (→)"
          onClick={() => select(vs[(i + 1) % vs.length].id)}
          className={cn(btn, 'hover:bg-accent')}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      {v && (
        <span className="hidden min-w-0 truncate px-2 text-xs sm:block" title={v.tradeoff}>
          <span className="font-medium">{v.name}</span>
          <span className="text-muted-foreground"> · {v.axis}</span>
        </span>
      )}
      <button
        type="button"
        title="Toutes les variantes côte à côte"
        aria-pressed={current === 'all'}
        onClick={() => select('all')}
        className={cn(
          btn,
          'gap-1.5',
          current === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
        )}
      >
        <Columns2 className="h-4 w-4" />
        <span className="hidden sm:inline">Planche</span>
      </button>
      <span className="sr-only">{slug}</span>
    </nav>
  )
}

// ─── Planche : toutes les variantes côte à côte ─────────────────────────────────────────────

/**
 * Chaque variante dans un cadre à la largeur d'un vrai écran (1280, ou 390 au téléphone), réduit
 * pour tenir dans sa colonne : ses points de rupture sont ceux d'un écran, pas d'une colonne.
 */
function ScaledFrame({ src, title }: { src: string; title: string }) {
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const frameWidth = window.innerWidth < 768 ? 390 : 1280
  const [scale, setScale] = useState(1)
  const [height, setHeight] = useState(600)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setScale(el.clientWidth / frameWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [frameWidth])

  const onLoad = () => {
    const doc = frame.current?.contentDocument
    if (!doc) return
    const measure = () => setHeight(doc.documentElement.scrollHeight)
    measure()
    new ResizeObserver(measure).observe(doc.body)
  }

  return (
    <div ref={box} className="overflow-hidden" style={{ height: height * scale }}>
      <iframe
        ref={frame}
        src={src}
        title={title}
        onLoad={onLoad}
        className="block origin-top-left border-0"
        style={{ width: frameWidth, height, transform: `scale(${scale})` }}
      />
    </div>
  )
}

function Board({ slug, prototype }: { slug: string; prototype: Prototype }) {
  const n = prototype.variants.length
  return (
    <div className="min-h-screen bg-muted/40 px-3 pb-20 pt-4 sm:px-6">
      <Card className="mb-4">
        <CardHeader className="p-4">
          <CardTitle className="text-lg">{prototype.title}</CardTitle>
          <CardDescription>{prototype.question}</CardDescription>
        </CardHeader>
      </Card>
      <div
        className="grid items-start gap-4 lg:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]"
        style={{ '--n': Math.min(n, 3) } as React.CSSProperties}
      >
        {prototype.variants.map((v) => (
          <Card key={v.id} className="overflow-hidden">
            <Link to={`?v=${v.id}`} className="block space-y-1 border-b px-4 py-3 hover:bg-accent">
              <div className="flex items-baseline gap-2">
                <span className="rounded bg-primary px-1.5 font-mono text-xs font-semibold text-primary-foreground">
                  {v.id}
                </span>
                <span className="font-semibold">{v.name}</span>
              </div>
              <p className="text-sm">
                <span className="text-muted-foreground">Axe : </span>
                {v.axis}
              </p>
              <p className="text-sm text-muted-foreground">{v.tradeoff}</p>
            </Link>
            <ScaledFrame
              src={`/prototypes/${slug}?v=${v.id}&capture=1`}
              title={`${v.id} · ${v.name}`}
            />
          </Card>
        ))}
      </div>
    </div>
  )
}

// ─── Un prototype ───────────────────────────────────────────────────────────────────────────

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)
}

function PrototypeView() {
  const { slug = '' } = useParams()
  const prototype = PROTOTYPES[slug]
  const [params, setParams] = useSearchParams()
  const capture = useCaptureMode()
  const setOnScreen = useDesignKit((s) => s.setOnScreen)

  const vs = prototype?.variants ?? []
  const asked = params.get('v')
  const current = asked === 'all' ? 'all' : (vs.find((v) => v.id === asked) ?? vs[0])?.id

  const select = (id: string) => {
    const next = new URLSearchParams(params)
    next.set('v', id)
    setParams(next, { replace: true })
  }

  useEffect(() => {
    if (capture || !current) return
    setOnScreen(current === 'all' ? vs.map((v) => `${slug}/${v.id}`) : [`${slug}/${current}`])
    return () => setOnScreen([])
  }, [slug, current, capture, vs, setOnScreen])

  useEffect(() => {
    if (capture || !vs.length) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return
      const i = vs.findIndex((v) => v.id === current)
      const n = Number(e.key)
      let next: string | undefined
      if (n >= 1 && n <= vs.length) next = vs[n - 1].id
      else if (e.key === 'ArrowRight') next = vs[(i + 1) % vs.length].id
      else if (e.key === 'ArrowLeft') next = vs[(i - 1 + vs.length) % vs.length].id
      if (next) {
        e.preventDefault()
        const p = new URLSearchParams(window.location.search)
        p.set('v', next)
        setParams(p, { replace: true })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [vs, current, capture, setParams])

  if (!prototype || !current) {
    return (
      <div className="min-h-screen bg-muted/40 p-8">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle>Prototype introuvable</CardTitle>
            <CardDescription>
              « {slug} » n’existe pas.{' '}
              <Link to="/prototypes" className="underline">
                Voir la liste
              </Link>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const variant = vs.find((v) => v.id === current)
  return (
    <>
      {current === 'all' ? (
        <Board slug={slug} prototype={prototype} />
      ) : (
        variant && <VariantView slug={slug} variant={variant} />
      )}
      {!capture && <Switcher slug={slug} prototype={prototype} current={current} select={select} />}
    </>
  )
}

export default function PrototypesPage() {
  return (
    <Routes>
      <Route index element={<PrototypeList />} />
      <Route path=":slug" element={<PrototypeView />} />
    </Routes>
  )
}
