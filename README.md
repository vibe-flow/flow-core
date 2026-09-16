# flow-core

Template runnable de l'écosystème [`flow`](https://github.com/vibe-flow) — monorepo Bun React/Vite + NestJS + Prisma.

Cloné par chaque nouveau projet client via `/vibe-stack:init-project`. Source de vérité des conventions transversales (`.flow/conventions.md`), synchronisées dans les projets dérivés via `/vibe-stack:sync-vibe-stack`.

## Écosystème

| Repo                                                      | Rôle                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------- |
| **flow-core** _(ce repo)_                                 | Template runnable React/Vite + NestJS + Prisma + Bun                   |
| [flow-modules](https://github.com/vibe-flow/flow-modules) | Briques optionnelles (magic-link, mcp, langgraph, etc.)                |
| [flow-plugin](https://github.com/vibe-flow/flow-plugin)   | Plugin Claude Code (skills + hooks). Invoqué via `/vibe-stack:<skill>` |

## Stack

- **Runtime** : Bun (workspace monorepo)
- **Frontend** : React + Vite + TailwindCSS + shadcn/ui
- **Backend** : NestJS + tRPC + Prisma + PostgreSQL
- **Validation** : Zod (schemas partagés)
- **Tests** : Vitest
- **Logging** : Pino

Conventions complètes : [.flow/conventions.md](.flow/conventions.md)

## Quick Start

Pré-requis : [local-services](https://github.com/vibe-flow/local-services) démarré (Postgres, Redis), `jq`, `bws` et `BWS_ACCESS_TOKEN`. Aucun fichier `.env` : `bin/dev` compose l'environnement depuis `.flow/project.json` (base et ports de dev) et le projet Bitwarden Secrets Manager (secrets) — voir « Dev local » dans [.flow/conventions.md](.flow/conventions.md).

```bash
bun install
bin/dev bunx prisma migrate dev   # migrations (+ seed à la création de la base)
bin/dev bun prisma/seed.ts        # seed seul
bin/dev                           # API + web
```

## Structure

```
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # NestJS backend
├── packages/
│   └── shared/       # Zod schemas + types partagés
├── prisma/           # Schema et migrations
├── .flow/
│   ├── conventions.md   # Conventions managées (synchronisées via /vibe-stack:sync-vibe-stack)
│   ├── project.json     # Identité du projet, UUID BSM, base et ports de dev
│   └── vibe-stack-lock.json  # Tracking commits flow-core + modules
└── CLAUDE.md         # Instructions Claude Code (importe .flow/conventions.md)
```

## Démarrer un projet à partir de ce template

Avec le plugin Claude Code [flow-plugin](https://github.com/vibe-flow/flow-plugin) installé :

```
/vibe-stack:init-project <slug>
```

Le skill crée le repo depuis `flow-core`, renomme le projet, crée son projet Bitwarden Secrets Manager et ses secrets JWT, l'enregistre dans le portal de `local-services` (base locale, ports, `<slug>.localhost`), crée la migration initiale, lance le seed et fait un commit initial propre.

## Default Credentials

Après seeding : `admin@example.com` / `Admin123!`

## License

MIT
