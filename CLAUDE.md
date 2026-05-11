# flow-core

@.flow/conventions.md

## Description

Template runnable de l'écosystème `flow` : monorepo Bun (React/Vite + NestJS + Prisma) qui sert de base à chaque nouveau projet client cloné via `/flow:new-project`.

Source de vérité des conventions transversales (`.flow/conventions.md`) qui sont synchronisées dans les projets dérivés via `/flow:update`.

## Notes

- Repo runnable : `bun dev` à la racine démarre web (5173) + api (3000)
- Versioning par tags `v<x.y.z>` (release officielle) — `/flow:update` se base sur ces tags
- Les modules optionnels vivent dans le repo séparé [flow-modules](https://github.com/vibe-flow/flow-modules)
- Les skills Claude Code qui orchestrent le tout vivent dans [flow-plugin](https://github.com/vibe-flow/flow-plugin)
