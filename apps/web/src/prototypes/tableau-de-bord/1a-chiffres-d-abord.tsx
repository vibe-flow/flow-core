import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { defineVariant } from '@/design-kit/values'
import { CHANTIERS, ETAT, INDICATEURS } from './donnees'

function ChiffresDabord() {
  return (
    <div className="min-h-screen bg-muted/40 px-4 py-6 sm:px-8 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4 rounded-lg border bg-card p-5 shadow-sm">
          <div>
            <p className="text-sm text-muted-foreground">Novembre 2026</p>
            <h1 className="text-2xl font-semibold tracking-tight">Atelier Morel</h1>
          </div>
          <Button>Nouveau devis</Button>
        </header>

        <section className="grid grid-cols-2 gap-4 lg:group-data-[kpi-cols=4]/v:grid-cols-4">
          {INDICATEURS.map((k) => (
            <Card key={k.id}>
              <CardContent className="space-y-2 p-4 sm:p-5">
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="whitespace-nowrap text-[length:min(var(--kpi-size),8vw)] font-semibold leading-none tracking-tight">
                  {k.valeur}
                </p>
                <p
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium group-data-[trend=false]/v:hidden',
                    k.bon
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-amber-700 dark:text-amber-400',
                  )}
                >
                  {k.bon ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {k.delta}
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Chantiers</CardTitle>
            <span className="text-sm text-muted-foreground">{CHANTIERS.length} suivis</span>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y border-t">
              {CHANTIERS.map((c) => (
                <li
                  key={c.objet}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-6 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_6rem_6.5rem]"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.objet}</p>
                    <p className="truncate text-sm text-muted-foreground">{c.client}</p>
                  </div>
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${c.avancement}%` }}
                      />
                    </div>
                    <span className="w-10 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                      {c.avancement} %
                    </span>
                  </div>
                  <span className="hidden text-sm text-muted-foreground sm:block">fin {c.fin}</span>
                  <span
                    className={cn(
                      'col-start-2 row-start-1 justify-self-end rounded-full px-2 py-0.5 text-xs font-medium sm:col-auto sm:row-auto',
                      ETAT[c.etat].classe,
                    )}
                  >
                    {ETAT[c.etat].label}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default defineVariant({
  id: '1a',
  name: 'Chiffres d’abord',
  axis: 'la santé de l’activité en un regard',
  tradeoff: 'On sait où on en est tout de suite ; ce qu’il faut faire se cherche dans la liste.',
  tweaks: {
    kpiSize: {
      type: 'slider',
      label: 'Taille des chiffres',
      cssVar: '--kpi-size',
      min: 1.5,
      max: 3.5,
      step: 0.25,
      unit: 'rem',
      default: 2.25,
    },
    columns: {
      type: 'choice',
      label: 'Indicateurs par ligne',
      attr: 'data-kpi-cols',
      options: [
        { value: '2', label: '2' },
        { value: '4', label: '4' },
      ],
      default: '4',
    },
    trend: {
      type: 'toggle',
      label: 'Tendance sous chaque chiffre',
      attr: 'data-trend',
      default: true,
    },
  },
  Component: ChiffresDabord,
})
