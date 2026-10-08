import { APP_NAME } from '@template-dev/shared'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AuthLayoutProps {
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  /** Sous la carte et son pied — le panneau de connexion de développement. */
  below?: React.ReactNode
}

export default function AuthLayout({
  title,
  description,
  children,
  footer,
  below,
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md">
        <p className="mb-6 text-center text-2xl font-semibold tracking-tight">{APP_NAME}</p>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          {children}
        </Card>
        {footer && (
          <div className="mt-4 space-y-1 text-center text-sm text-muted-foreground">{footer}</div>
        )}
        {below}
      </div>
    </div>
  )
}

export function FormMessage({
  tone,
  children,
}: {
  tone: 'error' | 'info'
  children: React.ReactNode
}) {
  const styles =
    tone === 'error'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
  return <div className={`rounded border p-3 text-sm ${styles}`}>{children}</div>
}

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export const primaryButton = 'w-full'
export const textLink = 'font-medium text-foreground underline-offset-4 hover:underline'
