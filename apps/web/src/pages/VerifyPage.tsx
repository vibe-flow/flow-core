import { useEffect, useRef } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function detectErrorType(error: { message: string; data?: { cause?: { code?: string } } } | null) {
  if (!error) return null
  const code = error.data?.cause?.code
  if (code === 'ACCOUNT_PENDING' || error.message.toLowerCase().includes('pending')) {
    return 'ACCOUNT_PENDING'
  }
  if (code === 'ACCOUNT_DISABLED' || error.message.toLowerCase().includes('disabled')) {
    return 'ACCOUNT_DISABLED'
  }
  return 'GENERIC'
}

export default function VerifyPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const token = searchParams.get('token') ?? ''
  const mutatedRef = useRef(false)

  const verifyMutation = trpc.auth.verifyMagicLink.useMutation({
    onSuccess: (data) => {
      setAuth(data)
      navigate('/dashboard')
    },
  })

  useEffect(() => {
    if (token && !mutatedRef.current) {
      mutatedRef.current = true
      verifyMutation.mutate({ token })
    }
  }, [token])

  // No token in URL — show error immediately
  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Lien invalide</CardTitle>
            <CardDescription>Aucun token fourni</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ce lien de connexion est invalide. Veuillez demander un nouveau lien.
            </p>
            <Link to="/login" className="block">
              <Button variant="outline" className="w-full">
                Retour à la page de connexion
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (verifyMutation.isPending || (!verifyMutation.isError && !verifyMutation.isSuccess)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          <p className="text-sm text-muted-foreground">Vérification en cours...</p>
        </div>
      </div>
    )
  }

  if (verifyMutation.isError) {
    const errorType = detectErrorType(verifyMutation.error as Parameters<typeof detectErrorType>[0])

    if (errorType === 'ACCOUNT_PENDING') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Compte en attente</CardTitle>
              <CardDescription>Validation requise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Votre compte est en attente de validation par un administrateur.
              </p>
              <Link to="/login" className="text-sm text-primary hover:underline">
                Retour à la page de connexion
              </Link>
            </CardContent>
          </Card>
        </div>
      )
    }

    if (errorType === 'ACCOUNT_DISABLED') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Compte désactivé</CardTitle>
              <CardDescription>Accès refusé</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Ce compte a été désactivé. Contactez un administrateur.
              </p>
              <Link to="/login" className="text-sm text-primary hover:underline">
                Retour à la page de connexion
              </Link>
            </CardContent>
          </Card>
        </div>
      )
    }

    // Generic error
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Lien invalide</CardTitle>
            <CardDescription>Ce lien n&apos;est plus utilisable</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Ce lien est invalide ou a expiré.</p>
            <Link to="/login" className="block">
              <Button variant="outline" className="w-full">
                Retour à la page de connexion
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
