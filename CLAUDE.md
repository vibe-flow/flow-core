# flow-core

@.flow/conventions.md

## Description

Template runnable de l'écosystème `flow` : monorepo Bun (React/Vite + NestJS + Prisma) qui sert de base à chaque nouveau projet client cloné via `/vibe-stack:init-project`.

Source de vérité des conventions transversales (`.flow/conventions.md`) qui sont synchronisées dans les projets dérivés via `/vibe-stack:sync-vibe-stack`.

## Notes

- Repo runnable : `bin/dev` démarre web + api (voir « Dev local » dans les conventions). Le template n'a ni base ni projet BSM à lui : pour le lancer, renseigner `dev.database` et `bws.project_id` dans `.flow/project.json`, ou exporter `JWT_SECRET` / `JWT_REFRESH_SECRET`
- Versioning par tags `v<x.y.z>` (release officielle) — `/vibe-stack:sync-vibe-stack` se base sur ces tags
- Les modules optionnels vivent dans le repo séparé [flow-modules](https://github.com/vibe-flow/flow-modules)
- Les skills Claude Code qui orchestrent le tout vivent dans [flow-plugin](https://github.com/vibe-flow/flow-plugin)
