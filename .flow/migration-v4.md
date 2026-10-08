# Passer un projet à flow-core v4 — better-auth

La v4 remplace l'authentification maison (lien magique + JWT + passport) par
[better-auth](https://www.better-auth.com). Cette note s'adresse à un projet né d'une version
antérieure et qui se synchronise.

## Ce qui change

| Avant                                                                                    | Après                                                                                            |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| JWT d'accès + jeton de rafraîchissement, dans le `localStorage`                          | une session, dans un cookie httpOnly                                                             |
| lien magique maison (`MagicToken`)                                                       | deux modes au choix du projet : `password` ou `magic-link` (`packages/shared/src/app.config.ts`) |
| `ctx.user.userId`                                                                        | **`ctx.user.id`**                                                                                |
| `JwtAuthGuard`, `JwtPayload`                                                             | `SessionGuard`, `SessionUser`                                                                    |
| SSE authentifié par `?token=` dans l'URL                                                 | SSE authentifié par le cookie                                                                    |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `AUTH_*` | `BETTER_AUTH_SECRET` (≥ 32 caractères, obligatoire en production), `BETTER_AUTH_URL` (optionnel) |
| `NODE_ENV` par défaut à `development`                                                    | `NODE_ENV` **obligatoire** : `production` ou `development`, sinon l'API ne démarre pas           |
| connexion de dev sous `AUTH_DEV_LOGIN` / `VITE_DEV_LOGIN`                                | connexion de dev active si et seulement si `NODE_ENV=development`                                |
| module `mail` (`MailService.sendMagicLink`)                                              | `apps/api/src/lib/auth-mail.ts`, seul point d'envoi des mails d'auth                             |

## Avant de commencer

1. **Le typecheck du projet doit passer** (`bun run typecheck`, arrivé avec la v4). C'est lui qui
   trouve les `ctx.user.userId` oubliés. Un oubli donne `undefined`, et Prisma ignore un filtre
   `undefined` : la requête porte alors sur tous les utilisateurs. Si les routeurs du projet sont
   encore annotés `ReturnType<TrpcService['router']>`, les passer d'abord au patron `buildRouter`
   (voir les conventions) — sinon le typecheck ne voit rien.
2. Choisir le mode dans `packages/shared/src/app.config.ts`. Un projet qui tournait au lien magique
   garde `magic-link` : rien ne change pour ses utilisateurs. `password` leur demande de poser un
   mot de passe (voir plus bas).

## Base de données

Une migration Prisma, générée dans le projet après la synchro (`bunx prisma migrate dev --name better_auth`).
Relire le SQL avant de l'appliquer en production — il doit faire, dans cet ordre :

1. `users` : ajouter `emailVerified` (booléen, défaut `false`) et `image` (texte, nul).
2. `users.name` devient obligatoire. **Remplir d'abord** les noms vides, sinon la migration échoue :
   `UPDATE users SET name = split_part(email, '@', 1) WHERE name IS NULL;`
3. Les comptes existants ont déjà prouvé leur adresse en cliquant un lien :
   `UPDATE users SET "emailVerified" = true WHERE status = 'ACTIVE';`
4. Créer `sessions`, `accounts`, `verifications`.
5. Supprimer `refresh_tokens` et `magic_tokens`.

Au déploiement, **tout le monde est déconnecté une fois** : les JWT n'existent plus.

### Si le projet passe en mode `password`

Aucun compte n'a de mot de passe. Chacun en pose un par « Mot de passe oublié » (better-auth crée
l'identifiant au premier mot de passe posé), ou reçoit une invitation
(`auth.resendAccess`). Prévenir les utilisateurs avant la bascule.

## Secrets et environnement

- BSM : créer `BETTER_AUTH_SECRET` (`openssl rand -base64 48`), supprimer `JWT_SECRET` et
  `JWT_REFRESH_SECRET`.
- `.kamal/secrets` et `config/deploy.yml` : remplacer les deux lignes JWT par `BETTER_AUTH_SECRET`.
- `FRONTEND_URL` doit être l'adresse publique exacte du web en production : c'est l'origine de
  confiance de better-auth **et** la seule origine que CORS admet.
- `NODE_ENV` : rien à faire en production (l'image `Dockerfile.api` le fixe), ni sur la plateforme
  de dev, ni avec `bin/dev`. Tout autre lanceur doit le poser.

## Code du projet

- `ctx.user.userId` → `ctx.user.id` partout ; `req.user.userId` → `req.user.id` dans les contrôleurs.
- `@UseGuards(JwtAuthGuard)` → `@UseGuards(SessionGuard)` ; `JwtPayload` → `SessionUser`.
- Tout appel à `MailService.sendMagicLink` disparaît. Un projet qui a étendu `MailService` pour ses
  propres mails garde son module : la synchro supprime celui du core, pas le sien.
- Web : `useAuthStore` n'existe plus (plus de jetons côté navigateur) — restent `useUser`,
  `useIsAuthenticated`, `useAuthLoading`. Tout `fetch` maison vers l'API passe
  `credentials: 'include'` au lieu d'un en-tête `Authorization`. La clé `auth-storage` du
  `localStorage` est orpheline.
- `VerifyPage` et la route `/auth/verify` disparaissent ; arrivent `/forgot-password`,
  `/reset-password` (aussi « créer mon mot de passe » d'une invitation) et `/signup` si
  l'inscription est ouverte.
- nginx : le bloc « IP réelle » est maintenant dans `nginx.conf.template`. Un projet qui avait
  `infrastructure/nginx/extra/real-ip.conf` le supprime (les directives en double font échouer nginx).

## Ce que le cookie ne couvre pas

Un projet dont l'API est appelée par autre chose qu'un navigateur (un serveur MCP, un client OAuth,
un script) ne peut pas s'appuyer sur le cookie de session. better-auth a un plugin `bearer` et des
clés d'API : à cadrer dans le projet, la v4 ne le fait pas.

## Vérifier

- `bun run typecheck` et `bun run test` passent.
- En développement : l'écran de connexion montre le panneau « se connecter en tant que », un clic
  ouvre l'application.
- En production : `curl -s -o /dev/null -w '%{http_code}' https://<domaine>/api/auth/dev/users`
  répond **404**.
