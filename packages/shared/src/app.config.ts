// Ce que le projet EST, par opposition à l'environnement où il tourne : versionné, lu par l'API
// (qui en construit l'authentification) et par le web (qui affiche l'écran correspondant).

/** `password` : e-mail + mot de passe. `magic-link` : un lien reçu par e-mail, aucun mot de passe. */
export type AuthMode = 'password' | 'magic-link'

/**
 * Comment naît un compte.
 * - `invite-only` : un administrateur invite ; personne ne s'inscrit seul.
 * - `open` : inscription libre, compte actif tout de suite.
 * - `approval` : inscription libre, compte en attente (`PENDING`) jusqu'à ce qu'un administrateur l'active.
 */
export type AuthSignup = 'invite-only' | 'open' | 'approval'

export const APP_NAME = 'Template Dev'

export const AUTH: {
  mode: AuthMode
  signup: AuthSignup
  minPasswordLength: number
  /** Durée d'une session sans activité, en jours. */
  sessionDays: number
  /** Durée de validité d'une invitation, en jours. */
  invitationDays: number
} = {
  mode: 'password',
  signup: 'invite-only',
  minPasswordLength: 8,
  sessionDays: 30,
  invitationDays: 7,
}
