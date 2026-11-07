/** Données fictives communes aux variantes : une menuiserie de huit personnes. */

export type Etat = 'en-cours' | 'en-attente' | 'clos'

export const INDICATEURS = [
  { id: 'ca', label: 'Chiffre d’affaires du mois', valeur: '48 260 €', delta: '+12 %', bon: true },
  { id: 'devis', label: 'Devis en attente', valeur: '9', delta: '3 depuis lundi', bon: true },
  {
    id: 'impayes',
    label: 'Factures en retard',
    valeur: '4 180 €',
    delta: '2 factures',
    bon: false,
  },
  {
    id: 'chantiers',
    label: 'Chantiers en cours',
    valeur: '6',
    delta: '1 démarre jeudi',
    bon: true,
  },
]

export const CHANTIERS: {
  client: string
  objet: string
  avancement: number
  etat: Etat
  fin: string
}[] = [
  {
    client: 'Mairie de Lunel',
    objet: 'Bibliothèque — rayonnages chêne',
    avancement: 72,
    etat: 'en-cours',
    fin: '28 nov.',
  },
  {
    client: 'M. et Mme Ferrand',
    objet: 'Cuisine sur mesure',
    avancement: 40,
    etat: 'en-cours',
    fin: '12 déc.',
  },
  {
    client: 'Hôtel Les Arceaux',
    objet: 'Têtes de lit, 14 chambres',
    avancement: 15,
    etat: 'en-attente',
    fin: '20 janv.',
  },
  {
    client: 'Cabinet Aubert',
    objet: 'Banque d’accueil',
    avancement: 100,
    etat: 'clos',
    fin: '3 nov.',
  },
  {
    client: 'SCI Les Pins',
    objet: 'Escalier hélicoïdal',
    avancement: 85,
    etat: 'en-cours',
    fin: '19 nov.',
  },
]

export const ACTIONS: {
  groupe: string
  titre: string
  detail: string
  cout: 'rapide' | 'long'
  etat: Etat
}[] = [
  {
    groupe: 'À valider',
    titre: 'Devis Hôtel Les Arceaux',
    detail: '14 200 € · envoyé il y a 6 jours',
    cout: 'rapide',
    etat: 'en-attente',
  },
  {
    groupe: 'À valider',
    titre: 'Commande de chêne massif',
    detail: 'Scierie Vidal · 3 m³',
    cout: 'rapide',
    etat: 'en-attente',
  },
  {
    groupe: 'À relancer',
    titre: 'Facture Cabinet Aubert',
    detail: '2 840 € · échue depuis 12 jours',
    cout: 'rapide',
    etat: 'en-attente',
  },
  {
    groupe: 'À relancer',
    titre: 'Facture SCI Les Pins (acompte)',
    detail: '1 340 € · échue depuis 4 jours',
    cout: 'rapide',
    etat: 'en-attente',
  },
  {
    groupe: 'À préparer',
    titre: 'Plans de la cuisine Ferrand',
    detail: 'Relire les cotes avec l’atelier',
    cout: 'long',
    etat: 'en-cours',
  },
]

export const ETAT: Record<Etat, { label: string; classe: string }> = {
  'en-cours': {
    label: 'En cours',
    classe: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  },
  'en-attente': {
    label: 'En attente',
    classe: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  },
  clos: { label: 'Clos', classe: 'bg-muted text-muted-foreground' },
}
