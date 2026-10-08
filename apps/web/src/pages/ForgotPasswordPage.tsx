import { useState } from 'react' // eslint-disable-line no-restricted-imports
import { Link } from 'react-router-dom'
import { ForgotPasswordSchema } from '@template-dev/shared'
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = ForgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError('')
    setPending(true)
    await authClient.requestPasswordReset({
      email: parsed.data.email,
      redirectTo: '/reset-password',
    })
    setPending(false)
    // Même réponse que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites.
    setSent(true)
  }

  return (
    <AuthLayout
      title="Mot de passe oublié"
      description="Indiquez votre adresse : vous recevrez un lien pour choisir un nouveau mot de passe."
      footer={
        <p>
          <Link to="/login" className={textLink}>
            Retour à la connexion
          </Link>
        </p>
      }
    >
      {sent ? (
        <CardContent>
          <FormMessage tone="info">
            Si un compte existe pour cette adresse, un e-mail vient de partir. Le lien reste valable
            une heure.
          </FormMessage>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <CardContent className="space-y-4">
            {error && <FormMessage tone="error">{error}</FormMessage>}
            <Field id="email" label="Adresse e-mail">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          </CardContent>
          <CardFooter>
            <Button type="submit" className={primaryButton} disabled={pending}>
              {pending ? 'Envoi…' : 'Recevoir le lien'}
            </Button>
          </CardFooter>
        </form>
      )}
    </AuthLayout>
  )
}
