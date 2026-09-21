import { VitePWA } from 'vite-plugin-pwa'

/**
 * Chaque app est une PWA : installable sur un écran d'accueil, et surtout **à jour** — un service
 * worker sait qu'une version a été publiée, là où un onglet ouvert depuis la veille garde le code
 * de la veille.
 *
 * Trois partis pris qui méritent d'être compris avant d'être changés :
 *
 * - `registerType: 'prompt'` — la nouvelle version attend qu'on lui donne la main au lieu de la
 *   prendre d'elle-même. C'est `lib/mise-a-jour.ts` qui décide du moment : au prochain changement
 *   de page, jamais au milieu d'une saisie.
 *
 * - `manifest: false` — le manifeste vit dans `public/manifest.webmanifest`, fichier statique
 *   qu'on relit et qu'on modifie sans passer par la config.
 *
 * - `globPatterns` ne précache que les fichiers du build, **jamais les données** : une app métier
 *   qui sert une liste périmée depuis le cache est pire qu'une app qui affiche une erreur réseau.
 *   Le cache accélère le démarrage, il ne fait pas de hors-ligne.
 */
export function pwaPlugin() {
  return VitePWA({
    registerType: 'prompt',
    injectRegister: false,
    manifest: false,
    workbox: {
      globPatterns: ['**/*.{js,css,html,woff2,svg,png}'],
      navigateFallback: '/index.html',
      // Sans cette liste, le service worker répondrait `index.html` aux appels d'API et aux
      // téléchargements : du HTML là où l'on attend du JSON ou un fichier.
      navigateFallbackDenylist: [/^\/api/, /^\/trpc/, /^\/health/],
    },
  })
}
