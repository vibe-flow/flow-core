import { useState } from 'react' // eslint-disable-line no-restricted-imports
import { Link, useSearchParams } from 'react-router-dom'
import { AUTH, ResetPasswordSchema } from '@template-dev/shared'
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

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const invalidLink = !token || params.has('error')
  // Une invitation est un lien de mot de passe à longue durée : même page, autres mots.
  const invitation = params.has('invitation')

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [pending, setPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = ResetPasswordSchema.safeParse({ password, confirmation })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError('')
    setPending(true)
    const { error: resetError } = await authClient.resetPassword({
      newPassword: parsed.data.password,
      token: token ?? '',
    })
    setPending(false)
    if (resetError) {
      setError("Ce lien n'est plus valable. Demandez-en un nouveau.")
      return
    }
    setDone(true)
  }

  const footer = (
    <p>
      <Link to="/login" className={textLink}>
        Retour à la connexion
      </Link>
    </p>
  )

  if (invalidLink) {
    return (
      <AuthLayout title="Lien expiré" footer={footer}>
        <CardContent className="space-y-3 text-sm">
          <p>Ce lien n'est plus valable : il a expiré ou a déjà servi.</p>
          <Link to="/forgot-password" className={textLink}>
            Recevoir un nouveau lien
          </Link>
        </CardContent>
      </AuthLayout>
    )
  }

  if (done) {
    return (
      <AuthLayout title="Mot de passe mis à jour" footer={footer}>
        <CardContent>
          <FormMessage tone="info">
            Votre nouveau mot de passe est enregistré. Vous pouvez vous connecter.
          </FormMessage>
        </CardContent>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title={invitation ? 'Créer mon mot de passe' : 'Nouveau mot de passe'}
      description={invitation ? 'Choisissez le mot de passe de votre accès.' : undefined}
      footer={footer}
    >
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <Field
            id="password"
            label={`Mot de passe (${AUTH.minPasswordLength} caractères minimum)`}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field id="confirmation" label="Confirmez le mot de passe">
            <Input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </Field>
        </CardContent>
        <CardFooter>
          <Button type="submit" className={primaryButton} disabled={pending}>
            {pending ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </CardFooter>
      </form>
    </AuthLayout>
  )
}
