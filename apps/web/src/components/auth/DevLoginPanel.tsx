import { useEffect, useState } from 'react' // eslint-disable-line no-restricted-imports
import { authClient, devSignIn, fetchDevUsers } from '@/lib/auth-client'
import type { DevUser } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

/**
 * Connexion en un clic sur n'importe quel compte — développement seulement.
 * L'API ne sert la liste que si NODE_ENV=development ; ailleurs ce composant ne rend rien.
 */
export default function DevLoginPanel({ onSignedIn }: { onSignedIn: () => void }) {
  const [users, setUsers] = useState<DevUser[] | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    void fetchDevUsers().then((list) => {
      if (alive) setUsers(list)
    })
    return () => {
      alive = false
    }
  }, [])

  if (!users) return null

  const signIn = async (user: DevUser) => {
    setError('')
    setPendingId(user.id)
    const ok = await devSignIn(user.id)
    if (ok) {
      // Le cookie vient d'être posé hors du client better-auth : on lui fait relire la session.
      await authClient.getSession({ query: { disableCookieCache: true } })
      authClient.$store.notify('$sessionSignal')
      onSignedIn()
      return
    }
    setPendingId(null)
    setError(`Connexion refusée pour ${user.email} (compte ${user.status}).`)
  }

  return (
    <div className="mt-6 rounded-lg border border-dashed border-amber-400 bg-amber-50 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700">
        Développement — se connecter en tant que
      </p>
      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
      {users.length === 0 && (
        <p className="text-xs text-amber-800">
          Aucun compte en base. Lancer le seed : <code>bun run prisma:seed</code>.
        </p>
      )}
      <div className="space-y-2">
        {users.map((user) => (
          <Button
            key={user.id}
            type="button"
            variant="outline"
            className="h-auto w-full justify-between gap-3 py-2 text-left"
            disabled={pendingId !== null}
            onClick={() => signIn(user)}
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{user.name || user.email}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {user.role}
              {user.status !== 'ACTIVE' ? ` · ${user.status}` : ''}
            </span>
          </Button>
        ))}
      </div>
    </div>
  )
}
