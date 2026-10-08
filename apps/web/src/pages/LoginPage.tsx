import { useState } from 'react' // eslint-disable-line no-restricted-imports
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AUTH, MagicLinkSchema, SignInSchema } from '@template-dev/shared'
import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CardContent, CardFooter } from '@/components/ui/card'
import AuthLayout, {
  Field,
  FormMessage,
  primaryButton,
  textLink,
} from '@/components/auth/AuthLayout'
import DevLoginPanel from '@/components/auth/DevLoginPanel'

// N'accepte qu'un chemin interne, pour qu'un lien piégé ne renvoie pas ailleurs après connexion.
function safeNext(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

const MESSAGES: Record<string, string> = {
  ACCOUNT_DISABLED: 'Ce compte est désactivé.',
  ACCOUNT_PENDING: "Ce compte attend d'être approuvé.",
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Un lien magique expiré ou déjà utilisé ramène ici avec `?error=`.
  const [error, setError] = useState(
    params.has('error') ? "Ce lien de connexion n'est plus valable. Demandez-en un nouveau." : '',
  )
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [pending, setPending] = useState(false)

  const magicLink = AUTH.mode === 'magic-link'

  const submitPassword = async () => {
    const parsed = SignInSchema.safeParse({ email, password })
    if (!parsed.success) return setError(parsed.error.issues[0].message)

    setPending(true)
    const { error: signInError } = await authClient.signIn.email(parsed.data)
    setPending(false)

    if (!signInError) return navigate(next, { replace: true })
    if (signInError.code && MESSAGES[signInError.code]) return setError(MESSAGES[signInError.code])
    if (signInError.status === 403) return setUnverified(true)
    setError('Adresse e-mail ou mot de passe incorrect.')
  }

  const submitMagicLink = async () => {
    const parsed = MagicLinkSchema.safeParse({ email })
    if (!parsed.success) return setError(parsed.error.issues[0].message)

    setPending(true)
    await authClient.signIn.magicLink({
      email: parsed.data.email,
      callbackURL: next,
      errorCallbackURL: '/login',
    })
    setPending(false)
    // Même réponse que le compte existe ou non : on ne révèle pas quelles adresses ont un compte.
    setLinkSent(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setUnverified(false)
    await (magicLink ? submitMagicLink() : submitPassword())
  }

  const resendVerification = async () => {
    await authClient.sendVerificationEmail({ email: email.trim(), callbackURL: '/' })
    setResent(true)
  }

  const footer = (
    <>
      {AUTH.signup !== 'invite-only' && !magicLink && (
        <p>
          Pas encore de compte ?{' '}
          <Link to="/signup" className={textLink}>
            Créer mon compte
          </Link>
        </p>
      )}
      {!magicLink && (
        <p>
          <Link to="/forgot-password" className={textLink}>
            Mot de passe oublié ?
          </Link>
        </p>
      )}
    </>
  )

  return (
    <AuthLayout
      title="Connexion"
      description={
        magicLink ? 'Recevez un lien de connexion par e-mail.' : 'Connectez-vous à votre compte.'
      }
      footer={footer}
      below={<DevLoginPanel onSignedIn={() => navigate(next, { replace: true })} />}
    >
      {linkSent ? (
        <CardContent>
          <FormMessage tone="info">
            Si un compte existe pour cette adresse, un lien de connexion vient de partir. Il est
            valable 15 minutes. Pensez à regarder dans vos indésirables.
          </FormMessage>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {error && <FormMessage tone="error">{error}</FormMessage>}
            {unverified && (
              <FormMessage tone="info">
                {resent ? (
                  'Un nouveau lien de confirmation vient de partir. Pensez à regarder dans vos indésirables.'
                ) : (
                  <>
                    Votre adresse n'est pas encore confirmée. Cliquez sur le lien reçu par e-mail,
                    ou{' '}
                    <button type="button" onClick={resendVerification} className={textLink}>
                      renvoyez-le
                    </button>
                    .
                  </>
                )}
              </FormMessage>
            )}
            <Field id="email" label="Adresse e-mail">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Field>
            {!magicLink && (
              <Field id="password" label="Mot de passe">
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Field>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className={primaryButton} disabled={pending}>
              {pending ? 'Envoi…' : magicLink ? 'Recevoir mon lien' : 'Me connecter'}
            </Button>
          </CardFooter>
        </form>
      )}
    </AuthLayout>
  )
}
