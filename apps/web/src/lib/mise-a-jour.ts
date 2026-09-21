import { registerSW } from 'virtual:pwa-register'
import { useMiseAJourStore } from '@/stores/mise-a-jour.store'

/** Un onglet ouvert toute la journée doit aller voir de lui-même. */
const INTERVALLE_MS = 10 * 60 * 1000

/**
 * Enregistre le service worker et surveille les nouvelles versions. Quand une version attend, le
 * store le sait ; `components/MiseAJour` l'applique au prochain changement de page (on navigue,
 * rien n'est en cours de saisie) et propose un bandeau en attendant.
 *
 * Pas de boucle de rechargement possible : à la toute première visite il n'y a rien à remplacer
 * (`onNeedRefresh` ne se déclenche pas), et `appliquer` ne s'exécute qu'une fois.
 */
export function surveillerMisesAJour() {
  if (!('serviceWorker' in navigator)) return

  const mettreAJour = registerSW({
    onNeedRefresh() {
      useMiseAJourStore.getState().signaler(() => void mettreAJour(true))
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Chercher une version n'a de sens que si l'écran est devant quelqu'un.
      const verifier = () => {
        if (document.visibilityState === 'visible') void registration.update()
      }
      window.setInterval(verifier, INTERVALLE_MS)
      document.addEventListener('visibilitychange', verifier)
    },
  })
}
