import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useMiseAJourStore } from '@/stores/mise-a-jour.store'

/**
 * Applique une nouvelle version au **changement de page** : on navigue, rien n'est en cours de
 * saisie, et c'est le moment où l'on s'attend à voir l'écran changer. Tant qu'on reste sur la
 * même page, un bandeau discret propose de le faire tout de suite.
 *
 * Seul le chemin compte : un filtre ou une recherche dans l'adresse (`?q=…`) n'est pas un
 * changement de page — recharger à ce moment-là couperait la personne en pleine manipulation.
 */
export default function MiseAJour() {
  const { pathname } = useLocation()
  const disponible = useMiseAJourStore((s) => s.disponible)
  const appliquer = useMiseAJourStore((s) => s.appliquer)
  const precedent = useRef(pathname)

  useEffect(() => {
    if (pathname === precedent.current) return
    precedent.current = pathname
    if (useMiseAJourStore.getState().disponible) useMiseAJourStore.getState().appliquer()
  }, [pathname])

  if (!disponible) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
    >
      <div className="flex items-center gap-3 rounded-full bg-gray-900 py-2 pl-4 pr-2 text-sm text-white shadow-lg">
        <span>Une nouvelle version est disponible.</span>
        <button
          type="button"
          onClick={appliquer}
          className="rounded-full bg-white px-3 py-1 font-semibold text-gray-900 hover:bg-gray-100"
        >
          Mettre à jour
        </button>
      </div>
    </div>
  )
}
