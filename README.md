# flow-core

Template runnable de l'écosystème [`flow`](https://github.com/vibe-flow) — monorepo Bun React/Vite + NestJS + Prisma.

Cloné par chaque nouveau projet client via `/flow:new-project`. Source de vérité des conventions transversales (`.flow/conventions.md`), synchronisées dans les projets dérivés via `/flow:update`.

## Écosystème

| Repo                                                      | Rôle                                                             |
| --------------------------------------------------------- | ---------------------------------------------------------------- |
| **flow-core** _(ce repo)_                                 | Template runnable React/Vite + NestJS + Prisma + Bun             |
| [flow-modules](https://github.com/vibe-flow/flow-modules) | Briques optionnelles (magic-link, mcp, langgraph, etc.)          |
| [flow-plugin](https://github.com/vibe-flow/flow-plugin)   | Plugin Claude Code (skills + hooks). Invoqué via `/flow:<skill>` |

## Stack

- **Runtime** : Bun (workspace monorepo)
- **Frontend** : React + Vite + TailwindCSS + shadcn/ui
- **Backend** : NestJS + tRPC + Prisma + PostgreSQL
- **Validation** : Zod (schemas partagés)
- **Tests** : Vitest
- **Logging** : Pino

Conventions complètes : [.flow/conventions.md](.flow/conventions.md)

## Quick Start

```bash
# 1. Cloner et installer
bun install

# 2. Setup environnement
cp .env.example .env
# Éditer .env avec les valeurs locales

# 3. Migrations et seed
bunx prisma migrate dev
bunx prisma db seed

# 4. Dev servers (API + Web)
bun run dev
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
│   ├── conventions.md   # Conventions managées (synchronisées via /flow:update)
│   ├── project.json     # Identité du projet
│   └── flow-lock.json   # Tracking commits flow-core + modules
└── CLAUDE.md         # Instructions Claude Code (importe .flow/conventions.md)
```

## Démarrer un projet à partir de ce template

Avec le plugin Claude Code [flow-plugin](https://github.com/vibe-flow/flow-plugin) installé :

```
/flow:new-project <slug>
```

Le skill clone `flow-core`, réécrit `package.json` / `.flow/project.json` / README, et fait un commit initial propre.

## Default Credentials

Après seeding : `admin@example.com` / `Admin123!`

## License

MIT
