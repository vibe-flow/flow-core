import { useState } from 'react' // eslint-disable-line no-restricted-imports
import { Link } from 'react-router-dom'
import { SignUpSchema } from '@template-dev/shared'
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

type Errors = Partial<Record<'name' | 'email' | 'password' | 'confirmation', string>>

export default function SignUpPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmation: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [pending, setPending] = useState(false)

  const update = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const parsed = SignUpSchema.safeParse(form)
    if (!parsed.success) {
      const next: Errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors
        next[key] ??= issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})

    setPending(true)
    const { name, email, password } = parsed.data
    const { error: signUpError } = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: '/',
    })
    setPending(false)

    if (signUpError) {
      setError(
        signUpError.status === 422
          ? 'Un compte existe déjà avec cette adresse. Connectez-vous, ou choisissez « Mot de passe oublié ».'
          : "La création du compte n'a pas abouti. Réessayez dans un instant.",
      )
      return
    }
    setSentTo(email)
  }

  if (sentTo) {
    return (
      <AuthLayout
        title="Confirmez votre adresse"
        footer={
          <p>
            <Link to="/login" className={textLink}>
              Retour à la connexion
            </Link>
          </p>
        }
      >
        <CardContent className="space-y-3 text-sm">
          <p>
            Un e-mail vient de partir à <strong>{sentTo}</strong>. Cliquez sur le lien qu'il
            contient pour activer votre compte : vous arriverez directement dans votre espace.
          </p>
          <p className="text-muted-foreground">
            Rien reçu d'ici quelques minutes ? Regardez dans vos indésirables.
          </p>
        </CardContent>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Créer mon compte"
      description="Un e-mail de confirmation vous sera envoyé."
      footer={
        <p>
          Déjà un compte ?{' '}
          <Link to="/login" className={textLink}>
            Me connecter
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} noValidate>
        <CardContent className="space-y-4">
          {error && <FormMessage tone="error">{error}</FormMessage>}
          <Field id="name" label="Prénom et nom" error={errors.name}>
            <Input id="name" autoComplete="name" value={form.name} onChange={update('name')} />
          </Field>
          <Field id="email" label="Adresse e-mail" error={errors.email}>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
            />
          </Field>
          <Field id="password" label="Mot de passe (8 caractères minimum)" error={errors.password}>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={update('password')}
            />
          </Field>
          <Field id="confirmation" label="Confirmez le mot de passe" error={errors.confirmation}>
            <Input
              id="confirmation"
              type="password"
              autoComplete="new-password"
              value={form.confirmation}
              onChange={update('confirmation')}
            />
          </Field>
        </CardContent>
        <CardFooter>
          <Button type="submit" className={primaryButton} disabled={pending}>
            {pending ? 'Création…' : 'Créer mon compte'}
          </Button>
        </CardFooter>
      </form>
    </AuthLayout>
  )
}
