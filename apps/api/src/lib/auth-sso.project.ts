import type { SsoClaims } from './auth-sso'

/**
 * FICHIER DU PROJET — flow-core le livre vide, le projet le remplit ; la synchronisation du
 * gabarit n'y touche pas.
 *
 * Ce que le projet pose sur une fiche créée par la connexion SSO, à sa création seulement : reçoit
 * les claims du fournisseur (jeton d'identité ou userinfo, tels quels : `sub`, `email`, `name`,
 * `preferred_username`, `groups`…), rend les champs à écrire (ex. Maria : `{ companyId }`). Les
 * champs doivent exister sur `User` (prisma/schema.prisma). Le rôle n'en fait pas partie : il vient
 * des groupes (lib/auth-sso.ts) et l'emporte sur ce qui serait rendu ici.
 *
 * Une erreur levée ici refuse la création, donc la connexion.
 */
export function ssoNewUserFields(
  _claims: SsoClaims,
): Record<string, unknown> | Promise<Record<string, unknown>> {
  return {}
}
