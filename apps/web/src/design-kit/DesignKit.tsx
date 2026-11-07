/**
 * Le kit de design, monté par `App` en développement seulement (`import.meta.env.DEV`) : le thème
 * réglé, le panneau, et `window.designKit.values()` pour qu'un agent lise les valeurs sans passer
 * par le presse-papiers. Mode d'emploi : `.flow/design-kit.md`.
 */
import { useEffect } from 'react'
import ThemeOverrides from './ThemeOverrides'
import TweaksPanel, { useModifiedValues } from './TweaksPanel'
import { useCaptureMode } from './PrototypesPage'
import { useDesignKit } from './store'
import type { KitValues } from './values'

declare global {
  interface Window {
    designKit?: { values: () => KitValues; reset: () => void }
  }
}

export default function DesignKit() {
  const capture = useCaptureMode()
  const values = useModifiedValues()
  const reset = useDesignKit((s) => s.reset)

  useEffect(() => {
    window.designKit = { values: () => values, reset }
  }, [values, reset])

  return (
    <>
      <ThemeOverrides />
      {!capture && <TweaksPanel />}
    </>
  )
}
