import { Clock, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { defineVariant } from '@/design-kit/values'
import { ACTIONS, CHANTIERS, ETAT, INDICATEURS } from './donnees'

const GROUPES = [...new Set(ACTIONS.map((a) => a.groupe))]

function Action({ a }: { a: (typeof ACTIONS)[number] }) {
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          a.cout === 'rapide' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        )}
        title={a.cout === 'rapide' ? 'Deux secondes' : 'Demande du temps'}
      >
        {a.cout === 'rapide' ? <Zap className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{a.titre}</p>
        <p className="truncate text-sm text-muted-foreground">{a.detail}</p>
      </div>
      <Button size="sm" variant={a.cout === 'rapide' ? 'default' : 'outline'}>
        {a.cout === 'rapide' ? 'Faire' : 'Ouvrir'}
      </Button>
    </li>
  )
}

function FileDactions() {
  return (
    <div className="min-h-screen bg-muted/40 px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_var(--aside-width)]">
        <div className="space-y-6">
          <header className="rounded-lg border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">Bonjour Claire</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              {ACTIONS.length} choses attendent une décision
            </h1>
          </header>

          {/* Groupé : une carte par groupe ; à plat : une seule liste. */}
          <div className="hidden space-y-4 group-data-[grouped=true]/v:block">
            {GROUPES.map((g) => {
              const items = ACTIONS.filter((a) => a.groupe === g)
              return (
                <Card key={g}>
                  <CardHeader className="flex-row items-center gap-2 space-y-0 border-b py-3">
                    <CardTitle className="text-sm">{g}</CardTitle>
                    <span className="rounded-full bg-muted px-2 text-xs font-medium text-muted-foreground">
                      {items.length}
                    </span>
                  </CardHeader>
                  <ul className="divide-y">
                    {items.map((a) => (
                      <Action key={a.titre} a={a} />
                    ))}
                  </ul>
                </Card>
              )
            })}
          </div>
          <Card className="group-data-[grouped=true]/v:hidden">
            <ul className="divide-y">
              {ACTIONS.map((a) => (
                <Action key={a.titre} a={a} />
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Le mois</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                {INDICATEURS.map((k) => (
                  <div key={k.id} className="flex items-baseline justify-between gap-3 py-2">
                    <dt className="text-sm text-muted-foreground">{k.label}</dt>
                    <dd className="font-semibold tabular-nums">{k.valeur}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Chantiers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {CHANTIERS.filter((c) => c.etat !== 'clos').map((c) => (
                <div key={c.objet} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{c.objet}</span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                      ETAT[c.etat].classe,
                    )}
                  >
                    {ETAT[c.etat].label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

export default defineVariant({
  id: '1b',
  name: 'File d’actions',
  axis: 'ce qui attend une décision d’abord',
  tradeoff: 'On agit sans chercher ; la santé de l’activité passe au second plan, en colonne.',
  tweaks: {
    asideWidth: {
      type: 'slider',
      label: 'Largeur de la colonne',
      cssVar: '--aside-width',
      min: 16,
      max: 28,
      step: 1,
      unit: 'rem',
      default: 20,
    },
    grouped: { type: 'toggle', label: 'Grouper par nature', attr: 'data-grouped', default: true },
  },
  Component: FileDactions,
})
