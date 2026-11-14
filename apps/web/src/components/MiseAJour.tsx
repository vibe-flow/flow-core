import { Fragment, useEffect, useRef } from 'react'
// eslint-disable-next-line no-restricted-imports -- état éphémère (résultat de fetch), ne survit pas au refresh
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { usePersistedState } from '@/hooks/use-persisted-state'
import { useMiseAJourStore } from '@/stores/mise-a-jour.store'
import { chargerVersions, nonVues, titre, type Version } from '@/lib/nouveautes'

/**
 * UNE seule bulle, jamais deux. Deux signaux, un même affichage :
 *  - des nouveautés non vues (API `/api/versions`) : « Quoi de neuf », les points, à fermer ;
 *  - une version aussi en attente : la même bulle, plus « Mettre à jour » — fermer ou mettre à jour
 *    marque la version vue, pour ne pas la redire après le rechargement ;
 *  - une version en attente sans nouveauté à dire : le bandeau sobre d'avant.
 *
 * La nouvelle version s'applique de toute façon au **changement de page** (on navigue, rien n'est en
 * cours de saisie) ; « Mettre à jour » ne fait que la prendre tout de suite, devant la personne.
 */
export default function MiseAJour() {
  const { pathname } = useLocation()
  const disponible = useMiseAJourStore((s) => s.disponible)
  const appliquer = useMiseAJourStore((s) => s.appliquer)
  const precedent = useRef(pathname)
  const [versions, setVersions] = useState<Version[]>([])
  const [vue, setVue] = usePersistedState<string | null>('nouveautes.vue', null)

  useEffect(() => {
    let vivant = true
    void chargerVersions().then((v) => {
      if (vivant) setVersions(v)
    })
    return () => {
      vivant = false
    }
  }, [])

  // Seul le chemin compte : un filtre dans l'adresse (`?q=…`) n'est pas un changement de page.
  useEffect(() => {
    if (pathname === precedent.current) return
    precedent.current = pathname
    if (useMiseAJourStore.getState().disponible) useMiseAJourStore.getState().appliquer()
  }, [pathname])

  const fraiches = nonVues(versions, vue)
  const derniere = versions[0]?.version
  const fermer = () => {
    if (derniere) setVue(derniere)
  }
  // « Mettre à jour » depuis la bulle : prend la version et marque les nouveautés vues (pas de redite après reload).
  const rechargerDepuisBulle = () => {
    if (derniere) setVue(derniere)
    appliquer()
  }

  if (!fraiches.length && !disponible) return null

  // Une version en attente, rien de neuf à dire : le bandeau sobre.
  if (!fraiches.length) {
    return (
      <Cadre>
        <div className="flex items-center gap-3 rounded-full bg-foreground py-2 pl-4 pr-2 text-sm text-background shadow-lg">
          <span>Une nouvelle version est disponible.</span>
          <Button
            type="button"
            size="sm"
            onClick={appliquer}
            className="rounded-full bg-background px-3 text-foreground hover:bg-background/90"
          >
            Mettre à jour
          </Button>
        </div>
      </Cadre>
    )
  }

  // La bulle : les nouveautés, et « Mettre à jour » quand une version attend.
  return (
    <Cadre>
      <div className="pointer-events-auto w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg">
        <div className="flex items-center gap-2 border-b px-4 py-2.5">
          <Etincelle className="h-4 w-4 text-primary" />
          <span className="flex-1 text-sm font-semibold">Quoi de neuf</span>
          <button
            type="button"
            aria-label="Plus tard"
            onClick={fermer}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Croix className="h-4 w-4" />
          </button>
        </div>
        <ul className="max-h-[45vh] space-y-2.5 overflow-y-auto px-4 pb-2.5 pt-3">
          {fraiches.map((v) => (
            <li key={v.version} className="text-[13px] leading-snug">
              <span className="mr-1.5 font-mono text-[11.5px] text-muted-foreground">
                {v.version}
              </span>
              <Ligne texte={titre(v)} />
            </li>
          ))}
        </ul>
        {disponible && (
          <>
            <p className="flex items-start gap-2 border-t px-4 py-2.5 text-[12.5px] leading-snug text-muted-foreground">
              <Rechargement className="mt-px h-3.5 w-3.5 shrink-0" />
              Une nouvelle version est prête — « Mettre à jour » la prend tout de suite, sinon elle
              se prend au prochain changement de page.
            </p>
            <div className="flex justify-end border-t px-4 py-2.5">
              <Button type="button" size="sm" onClick={rechargerDepuisBulle}>
                Mettre à jour
              </Button>
            </div>
          </>
        )}
      </div>
    </Cadre>
  )
}

/** Le même ancrage en bas pour les deux formes, au-dessus de tout, à l'abri des encoches. */
function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-3 sm:justify-end sm:px-5"
    >
      {children}
    </div>
  )
}

/** Une ligne de note : ce qui est entre accents graves passe en police de code, le reste tel quel. */
function Ligne({ texte }: { texte: string }) {
  return (
    <>
      {texte.split(/(`[^`]+`)/).map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 2 ? (
          <code key={i} className="rounded bg-muted px-1 font-mono text-[0.92em]">
            {p.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  )
}

/* Pictos légers, sans dépendance : le socle n'impose pas de librairie d'icônes. */
function Etincelle({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
    </svg>
  )
}
function Croix({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}
function Rechargement({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 11-2.64-6.36M21 3v6h-6" />
    </svg>
  )
}
