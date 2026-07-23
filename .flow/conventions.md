# Conventions `flow`

> **Fichier managé** — ne pas éditer à la main. Synchronisé par `/flow:update` depuis `flow-core`.
> Source de vérité : [CDC `flow` §6 et §7](https://github.com/vibe-flow/flow-core/blob/main/README.md).

Conventions transversales de l'écosystème `flow`. Ce fichier est importé par le `CLAUDE.md` racine et chargé automatiquement dans le contexte Claude Code à chaque session.

## Stack

### Backend

- **Runtime** : Bun (jamais npm/yarn — `bun add`, `bun run`, `bunx`)
- **Framework** : NestJS
- **Validation** : Zod uniquement (jamais class-validator)
- **API** : tRPC par défaut, REST si exposition externe nécessaire
- **ORM** : Prisma, migrations strictement append-only
- **Tests** : Vitest (jamais Jest)
- **Logging** : Pino via `LoggerService` central
- **AI** : module unifié (`modules/ai/ai.service.ts`) — appels directs LiteLLM (chat, embeddings, structured extract)
- **Python** : scripts standalone dans `scripts/python/`, appelés via `pythonService.runScript()`

### Frontend

- **Bundler** : Vite
- **Framework** : React
- **UI** : shadcn/ui + Tailwind (pas de CSS custom sauf nécessité absolue)
- **State global** : Zustand (`stores/`), jamais Context API ni Redux
- **Data fetching** : TanStack Query (via tRPC), jamais fetch/axios direct
- **Auth** : hooks de `useAuthStore` (`useIsAuthenticated`, `useUser`, etc.)

### Partagé (`packages/shared/`)

- Schemas Zod dans `packages/shared/src/schemas/`
- Types inférés : `export type X = z.infer<typeof XSchema>`
- **Aucune dépendance serveur** (pas de Prisma, pas de Node APIs)
- Vérifier l'index avant d'en créer un nouveau (anti-duplication)

## Workflow Git

- **Solo, trunk-based** : `main` est la seule branche longue. Commit direct sur `main` autorisé (on bosse seul).
- Branche `feature/<slug>`, `fix/<slug>` ou `hotfix/<slug>` **optionnelle** : à créer pour isoler un chantier long, une expérimentation ou une review — pas une obligation.
- Merger via PR quand on veut une trace ou une review ; sinon commit direct sur `main`.
- Worktrees dans `.worktrees/` disponibles pour paralléliser (`git worktree add .worktrees/<slug> main`).

## Structure d'un module backend

Dans `apps/api/src/modules/<nom>/` :

```
<nom>/
├── <nom>.service.ts       ← logique métier
├── <nom>.trpc.ts          ← routes tRPC (classes @Injectable enregistrées dans TrpcModule)
├── <nom>.module.ts        ← module NestJS
└── __tests__/
    └── <nom>.spec.ts      ← tests Vitest
```

### Règles

- `@Inject()` explicite sur chaque paramètre de constructeur (tsx/Bun ne génère pas les metadata `design:paramtypes`)
- Un service = logique métier. Un `.trpc.ts` = routes. Ne pas mélanger.
- Les classes `.trpc.ts` sont enregistrées dans `TrpcModule`, **pas** dans leur propre module
- Procédures tRPC : `trpc.procedure` (public), `trpc.protectedProcedure` (auth), `trpc.adminProcedure` (admin)
- Toujours valider avec `.input(ZodSchema)` — jamais de validation manuelle
- Utiliser `TRPCError` (pas les exceptions NestJS) dans les procédures tRPC
- Importer les schemas Zod depuis `@<projet>/shared`, jamais les redéfinir localement

## Persistance d'état UI

**Règle** : tout état que l'utilisateur s'attend à retrouver au refresh doit être persisté.

| Type d'état                                                              | Outil                                           | Storage                                                                     |
| ------------------------------------------------------------------------ | ----------------------------------------------- | --------------------------------------------------------------------------- |
| Filtres, tri, pagination, préférences de page                            | `usePersistedState(key, default)`               | localStorage + sync onglets + sync BDD si module `user-preferences` présent |
| Paramètres partageables par URL (recherche, filtres principaux)          | `useUrlState(key, default)`                     | URL                                                                         |
| Préférences globales app (sidebar, theme, densité)                       | `ui.store.ts` (qui utilise `usePersistedState`) | localStorage                                                                |
| État éphémère (modals, loading, hover, animations, formulaires en cours) | `useState`                                      | mémoire                                                                     |

Règle ESLint `no-restricted-imports` warn sur `useState` pour forcer la réflexion. `useState` reste OK pour l'éphémère.

## SSE (Server-Sent Events)

- Événements custom en `snake_case`, toujours typés dans `sse.schema.ts` (`discriminatedUnion`)
- Ne pas émettre manuellement pour les opérations Prisma basiques — le middleware le fait via `PrismaService.onMutation`
- Ajouter les nouveaux types d'événements dans `SseEventSchema` (`discriminatedUnion` dans `packages/shared`)
- Mapping `entity → router` dans `useEntityInvalidation.ts` pour chaque nouveau module tRPC
- `useSseEvent()` côté client pour écouter des événements custom

## Tests

- **Framework** : Vitest (imports depuis `'vitest'`, jamais `'jest'`)
- Tests à côté du code : `__tests__/<module>.spec.ts`
- Tests d'intégration API : `TestingModule` NestJS avec `PrismaService` réel

## Migrations Prisma

- Toujours `bunx prisma migrate dev --name <description>` pour créer une migration
- **JAMAIS** modifier un fichier de migration déjà appliqué (checksum = drift)
- **JAMAIS** `prisma db push` (modifie la base sans migration)
- **JAMAIS** `prisma migrate reset` sauf accord explicite du dev
- Les enums nécessitent parfois du SQL manuel (`ALTER TYPE`)

## Vérification du code

- **Utiliser `bun run lint:check`** (ESLint, léger)
- **Éviter `bunx tsc --noEmit`** (peut crash OOM sur gros projets — réservé au CI dans un job dédié si nécessaire)
- `bun run dev` fonctionne (tsx compile à la volée)

## Secrets & Config

**Principe** : zéro fichier `.env*` dans le repo, jamais. Une seule source par catégorie, tout reproductible depuis Git + BSM.

### Trois catégories, trois emplacements

| Type                                                        | Où ça vit                                                                               | Exemple                                                     |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Secret** (sensible, ne doit pas fuiter)                   | Bitwarden Secret Manager (BSM), déclaré dans `.kamal/secrets`                           | `DATABASE_URL`, `JWT_SECRET`, `BREVO_API_KEY`               |
| **Config par environnement** (varie dev/prod, non-sensible) | `config/deploy.yml` → `env.clear` pour la prod ; defaults `??` dans le code pour le dev | `FRONTEND_URL`, `NODE_ENV`, `LOG_LEVEL`, `LITELLM_BASE_URL` |
| **Config statique** (jamais ne change)                      | Code en dur (`config/*.ts`, `vite.config.ts`)                                           | constantes métier, pagination max                           |

**Critère simple** : si tu peux le push sur GitHub en clair sans problème → c'est de la config, pas un secret.

### BSM — convention

- **Un projet vibe-stack = un projet BSM dédié**, dont l'UUID vit dans `.flow/deploy.json` (`secrets_provider.bws_project_id` + `bws_shared_project_id` pour les secrets transversaux). L'org Bitwarden est en plan **Teams** → projets illimités (l'ancien plafond de 3 projets du free tier n'existe plus).
- **Noms de secrets simples, sans préfixe** : `DATABASE_URL`, `JWT_SECRET`, `VITE_MAPBOX_TOKEN`… Chaque app ayant son projet dédié, il n'y a rien à désambiguïser. (L'ancien préfixe `<service>/<KEY>` était un contournement du plafond 3 projets — abandonné.)
- **Un seul machine account partagé** (token `BWS_ACCESS_TOKEN`, dans `~/.zshrc`) avec accès à tous les projets. L'isolation se fait au niveau **projet**, pas au niveau machine account. Un machine account par projet ne serait qu'un durcissement sécurité optionnel (réduire le périmètre d'un token fuité) — non requis aujourd'hui.
- En CI : `BWS_ACCESS_TOKEN` est le seul secret GitHub Actions à configurer ; tout le reste vient de BSM.
- En dev local : **`bws run --project-id <uuid> -- bun dev`** (UUID = celui de `.flow/deploy.json`). Le `--project-id` est **obligatoire** : sans lui, `bws run` agrège tous les projets visibles par le machine account partagé → collision sur les clés homonymes (ex. `VITE_MAPBOX_TOKEN` présent dans plusieurs projets).

### Fichier `.kamal/secrets` (versionné)

Script déclaratif résolu à chaque `kamal deploy`. Aucune valeur en clair : lit les deux UUID depuis `.flow/deploy.json`, fetch chaque projet par UUID (`<uuid>/all`), puis extrait par nom de clé :

```bash
set -euo pipefail
: "${BWS_ACCESS_TOKEN:?missing}"
BWS_PROJECT_ID="$(jq -er '.secrets_provider.bws_project_id' .flow/deploy.json)"
BWS_SHARED_PROJECT_ID="$(jq -er '.secrets_provider.bws_shared_project_id' .flow/deploy.json)"

# Transversaux (registry) depuis le projet shared
SECRETS_SHARED=$(kamal secrets fetch --adapter bitwarden-sm "${BWS_SHARED_PROJECT_ID}/all")
REGISTRY_USER=$(kamal secrets extract REGISTRY_USER ${SECRETS_SHARED})
KAMAL_REGISTRY_PASSWORD=$(kamal secrets extract KAMAL_REGISTRY_PASSWORD ${SECRETS_SHARED})

# Secrets propres à l'app depuis son projet dédié
SECRETS=$(kamal secrets fetch --adapter bitwarden-sm "${BWS_PROJECT_ID}/all")
DATABASE_URL=$(kamal secrets extract DATABASE_URL ${SECRETS})
JWT_SECRET=$(kamal secrets extract JWT_SECRET ${SECRETS})
# … une ligne `extract` par secret consommé
```

### Workflow — ajouter un nouveau secret

1. Créer dans BSM : `bws secret create <KEY> "<value>" <bws_project_id>` (UUID depuis `.flow/deploy.json`)
2. Ajouter la ligne `extract` correspondante dans `.kamal/secrets`
3. Si l'app le consomme : référence `process.env.<KEY>` dans le code
4. Commit : `feat(secrets): add <KEY>`

**Claude doit faire les étapes 1 et 2 automatiquement** quand on lui demande d'ajouter un secret — c'est la convention, pas un skill séparé.

### Workflow — rotation d'un secret

1. Édit la valeur dans BSM
2. `kamal deploy` (re-fetch automatique)
3. Done. Aucun fichier à toucher.

### Dev local — defaults dans le code

Pour que `bun dev` marche sans config préalable, le code définit des defaults dev via `??` :

```typescript
// apps/api/src/config/app.config.ts
export const appConfig = {
  port: parseInt(process.env.PORT ?? '3000'),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/dev',
}
```

Pour utiliser les VRAIS secrets en dev (Stripe test, etc.) : `bws run --project-id <uuid> -- bun dev` (UUID depuis `.flow/deploy.json`).

### Frontend Vite — vars build-time

Les `VITE_*` sont injectées au build (pas au runtime). Pour la prod, déclarer dans `config/deploy.yml` → `builder.args` (clear) ou `builder.secrets` (BSM). En dev, le proxy Vite (`/api` → `:3000`) gomme la plupart des différences d'URL.

## Interdictions strictes

- `class-validator` → utiliser Zod
- `localStorage` direct pour l'auth → utiliser `useAuthStore`
- Appels LLM directs → passer par `AiService`
- Code Python dans NestJS → utiliser les scripts via `pythonService.runScript()`
- Dépendances hors workspace (chaque package doit être dans le monorepo Bun)
- `Jest` → utiliser Vitest
- `tsc --noEmit` pour type-checking → utiliser `bun run lint:check`
- **Fichiers `.env*`** dans le repo (`.env`, `.env.local`, `.env.prod`, `.env.example`, etc.) → tout passe par BSM + `config/deploy.yml` + defaults code. Voir section "Secrets & Config".
- **Secrets en clair** dans le repo (hard-coded keys, etc.) → BSM uniquement.

## Dossier `.flow/`

Pièce charnière entre un projet et l'écosystème `flow`. Versionné dans le repo du projet.

| Fichier             | Rôle                                                                                                                        | Géré par                                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `conventions.md`    | Ce fichier — conventions transversales. Importé en première ligne du `CLAUDE.md` racine                                     | `/flow:update` — **jamais édité à la main**              |
| `project.json`      | Identité du projet : `id`, `name`, `stack`                                                                                  | Dev (init par `/flow:new-project`)                       |
| `config/deploy.yml` | Config Kamal (hors `.flow/`) : service, image, hosts, accessory API, registry                                               | `/flow:deploy-setup`, puis dev                           |
| `.kamal/secrets`    | Liste déclarative des secrets attendus (versionné, valeurs en BSM)                                                          | `/flow:deploy-setup`, mis à jour à chaque nouveau secret |
| `flow-lock.json`    | Tracking du commit `flow-core` synchronisé + commits des modules importés                                                   | `/flow:update`, `/flow:import-module`, `/flow:upstream`  |
| `deploy.json`       | Métadonnées de déploiement : host SSH, registry, et UUIDs BSM (`secrets_provider.bws_project_id` + `bws_shared_project_id`) | `/flow:deploy-setup`                                     |
