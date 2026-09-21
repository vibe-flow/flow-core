import { create } from 'zustand'

/**
 * Une nouvelle version de l'app est publiée et attend : `appliquer` la met en place (le service
 * worker prend la main, la page se recharge). Rempli par `lib/mise-a-jour.ts`, lu par le composant
 * `MiseAJour` qui l'applique au changement de page ou sur le bandeau.
 */
interface MiseAJourState {
  disponible: boolean
  appliquer: () => void
  signaler: (appliquer: () => void) => void
}

export const useMiseAJourStore = create<MiseAJourState>((set) => ({
  disponible: false,
  appliquer: () => {},
  signaler: (appliquer) => {
    let fait = false
    set({
      disponible: true,
      // Jamais deux fois : un second appel pendant le rechargement relancerait tout.
      appliquer: () => {
        if (fait) return
        fait = true
        appliquer()
      },
    })
  },
}))
