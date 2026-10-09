import { trpc } from '@/lib/trpc'
import { AUTH, can } from '@template-dev/shared'
import { useUser } from '@/stores/auth.store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block h-2 w-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-400'}`} />
  )
}

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-sm">
        <StatusDot ok={ok} />
        <span>{label}</span>
      </div>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  )
}

export default function DashboardPage() {
  const user = useUser()
  const { data: aiStatus } = trpc.ai.status.useQuery()
  // La liste des comptes est réservée à qui les gère : on ne la demande pas pour les autres.
  const managesAccounts = can(user, 'accounts.manage')
  const { data: users } = trpc.users.list.useQuery(undefined, { enabled: managesAccounts })

  const aiConfigured = aiStatus?.configured ?? false
  const userCount = users?.length ?? 0

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Vibe Stack</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Stack Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Stack Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-0.5">
            <StatusRow label="Database" ok={true} detail="Connected" />
            <StatusRow
              label="Auth"
              ok={true}
              detail={
                managesAccounts ? `${userCount} user${userCount !== 1 ? 's' : ''}` : AUTH.mode
              }
            />
            <StatusRow
              label="LLM"
              ok={aiConfigured}
              detail={aiConfigured ? 'LiteLLM' : 'Not configured'}
            />
          </CardContent>
        </Card>

        {/* Quick Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Project</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Stack</dt>
                <dd className="font-mono text-xs">vibe-stack</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Auth</dt>
                <dd className="font-mono text-xs">{AUTH.mode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">API</dt>
                <dd className="font-mono text-xs">tRPC</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
