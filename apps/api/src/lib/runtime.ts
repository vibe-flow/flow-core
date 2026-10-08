// L'environnement se déclare, il ne se devine pas.
//
// `NODE_ENV` doit valoir `production` ou `development` (`test` sous Vitest). Absent ou autre :
// l'API refuse de démarrer. Les facilités de développement ne s'activent QUE sur `development` ;
// l'image de production fixe `production` (Dockerfile.api), la plateforme de dev et `bin/dev`
// fixent `development`. Un oubli empêche donc de démarrer, il ne peut pas ouvrir une porte.
const value = process.env.NODE_ENV

if (value !== 'production' && value !== 'development' && value !== 'test') {
  throw new Error(
    `NODE_ENV doit valoir "production" ou "development" (reçu : ${value === undefined ? 'rien' : `"${value}"`}). ` +
      'En développement, lancer par bin/dev ou la plateforme de dev ; en production, par l’image Dockerfile.api.',
  )
}

export const IS_PRODUCTION = value === 'production'
export const IS_DEVELOPMENT = value === 'development'
