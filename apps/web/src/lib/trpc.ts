import { createTRPCReact, httpBatchLink } from '@trpc/react-query'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '../../../api/src/trpc/trpc.router'

export const trpc = createTRPCReact<AppRouter>()

// Le type de ce que le serveur renvoie vraiment (une Date y est une chaîne ISO) : à préférer à
// z.infer d'un schéma partagé pour typer une donnée reçue.
export type RouterOutputs = inferRouterOutputs<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>

export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: '/trpc',
        // La session voyage dans un cookie httpOnly : rien à rafraîchir, rien à mettre en en-tête.
        fetch(url, options) {
          return fetch(url, { ...options, credentials: 'include' })
        },
      }),
    ],
  })
}
