/**
 * D'où better-auth tire l'adresse du visiteur (limitation de débit, sessions).
 *
 * Seul X-Real-IP fait foi : nginx le réécrit à chaque requête avec l'adresse que kamal-proxy
 * lui a transmise (voir le bloc « IP réelle » de infrastructure/nginx/nginx.conf.template).
 * X-Forwarded-For n'est pas lu : il porte aussi ce que le visiteur a bien voulu y mettre.
 *
 * L'API n'expose aucun port : elle n'est joignable qu'à travers nginx, sur le réseau Docker.
 * En développement, sans en-tête, better-auth retombe sur 127.0.0.1.
 */
export const authIpAddressOptions = {
  ipAddressHeaders: ['x-real-ip'],
}
