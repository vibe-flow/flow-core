import { useEffect, useRef, useState } from 'react' // eslint-disable-line no-restricted-imports
import { authClient, fetchSsoInfo } from '@/lib/auth-client'
import type { SsoInfo } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

/**
 * « Se connecter avec <installation> » — seulement quand l'API a un fournisseur SSO.
 *
 * `auto` part sans clic : c'est l'adresse qu'ouvre le lien d'une installation (`/login?sso`),
 * déjà connectée chez son fournisseur — la personne arrive dans l'application sans rien voir.
 */
export default function SsoLoginButton({ next, auto }: { next: string; auto: boolean }) {
  const [info, setInfo] = useState<SsoInfo | null>(null)
  const [pending, setPending] = useState(false)
  const started = useRef(false)

  const signIn = async (provider: SsoInfo) => {
    setPending(true)
    await authClient.signIn.oauth2({
      providerId: provider.providerId,
      callbackURL: next,
      errorCallbackURL: '/login?error=sso',
    })
  }

  useEffect(() => {
    let alive = true
    void fetchSsoInfo().then((found) => {
      if (!alive) return
      setInfo(found)
      if (found && auto && !started.current) {
        started.current = true
        void signIn(found)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  if (!info) return null

  return (
    <div className="space-y-3">
      <Button type="button" className="w-full" disabled={pending} onClick={() => void signIn(info)}>
        {pending ? 'Redirection…' : `Se connecter avec ${info.name}`}
      </Button>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
    </div>
  )
}
