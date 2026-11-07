# Kit de design — pour l'agent

Proposer des écrans **dans le vrai code**, en variantes réglables, sans maquette intermédiaire. Le kit
n'existe qu'en développement (`import.meta.env.DEV`) : en production, ni le panneau ni les prototypes
n'entrent dans le bundle.

Il a deux pièces :

- **le panneau « Réglages »** (en bas à droite, sur toutes les pages en dev) : le thème global — police,
  couleur primaire, arrondi, densité, clair/sombre — et les réglages de la variante à l'écran ;
- **les prototypes** : `/prototypes` (liste) et `/prototypes/<slug>` (une variante, ou la planche),
  sans connexion, avec les vrais composants `@/components/ui`.

Code : `apps/web/src/design-kit/`. Prototypes : `apps/web/src/prototypes/<slug>/`.

## Créer un prototype

Un dossier par écran étudié, découvert tout seul :

```
apps/web/src/prototypes/<slug>/
├── index.ts                 ← definePrototype({ title, question, variants: [...] })
├── 1a-<nom-de-la-variante>.tsx
├── 1b-<nom-de-la-variante>.tsx
└── donnees.ts               ← données fictives communes (facultatif)
```

Chaque variante :

```tsx
export default defineVariant({
  id: '1b', // stable : on le cite, on le vise par ?v=1b
  name: 'File d’actions', // ce qu'elle est — jamais « option A »
  axis: 'ce qui attend une décision d’abord', // l'axe sur lequel elle se distingue
  tradeoff: 'On agit sans chercher ; les chiffres passent au second plan.', // gain et perte, une phrase
  tweaks: {
    /* 0 à 4 réglages, voir plus bas */
  },
  Component: FileDactions,
})
```

- **2 à 4 variantes**, qui diffèrent par un **axe** (ce qu'on montre d'abord, la densité, la navigation…),
  pas par des détails. Ids `1a`, `1b`… ; une deuxième série après retours : `2a`, `2b`…
- La variante est **une page entière** (`min-h-screen`, son propre fond) : la planche la mesure.
- Données fictives **réalistes**, en français, du métier du client : jamais de lorem ipsum.
- Les règles d'interface du projet valent ici comme ailleurs.

Exemple complet : `apps/web/src/prototypes/tableau-de-bord/`.

## Regarder

| Adresse                    | Ce qu'on voit                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `/prototypes`              | la liste des prototypes et de leurs variantes                                                      |
| `/prototypes/<slug>?v=1b`  | une variante ; touches `1`–`N`, `←` `→`, sélecteur en bas                                          |
| `/prototypes/<slug>?v=all` | la **planche** : toutes les variantes côte à côte, chacune à 1280 px réduite (390 px au téléphone) |
| `…&capture=1`              | sans sélecteur ni panneau : pour une capture d'écran                                               |

## Déclarer des réglages

Au plus **4 par variante**, seulement pour ce qui se juge à l'œil (une taille, une disposition, un
élément affiché ou non). Chacun pose **une variable CSS** ou **un attribut `data-`** sur l'enveloppe de la
variante, qui porte la classe `group/v` :

```tsx
tweaks: {
  kpiSize: { type: 'slider', label: 'Taille des chiffres', cssVar: '--kpi-size',
             min: 1.5, max: 3.5, step: 0.25, unit: 'rem', default: 2.25 },
  columns: { type: 'choice', label: 'Indicateurs par ligne', attr: 'data-kpi-cols',
             options: [{ value: '2', label: '2' }, { value: '4', label: '4' }], default: '4' },
  trend:   { type: 'toggle', label: 'Tendance', attr: 'data-trend', default: true },
}
```

Dans le composant, on s'en sert en Tailwind :

- variable CSS : `text-[length:var(--kpi-size)]`, `lg:grid-cols-[1fr_var(--aside-width)]` ;
- attribut : `lg:group-data-[kpi-cols=4]/v:grid-cols-4`, `group-data-[trend=false]/v:hidden`.

Un interrupteur lié à une variable CSS vaut `1` ou `0`.

## Le thème global

Les réglages globaux sont les variables de `apps/web/src/index.css` : `--font-sans`, `--primary`
(+ `--primary-foreground`, clair et sombre), `--radius`, `--density` (multiplie marges, retraits et
écarts Tailwind ; largeurs et hauteurs restent fixes). Les choix proposés (polices, teintes) sont dans
`design-kit/tokens.ts` : pour en proposer d'autres, on les ajoute là, pas de sélecteur libre. Le mode
clair/sombre est un aperçu, il n'est pas retenu.

## Appliquer les valeurs retenues

« **Copier les valeurs** » donne seulement ce qui diffère des défauts :

```json
{
  "theme": { "font": "inter", "primary": "sapin", "radius": 0.75 },
  "prototypes": { "tableau-de-bord": { "1a": { "kpiSize": 2.75, "trend": false } } }
}
```

Sans presse-papiers (navigateur piloté), le même objet : `window.designKit.values()` dans la page.

```bash
bun run design:apply valeurs.json      # ou : … | bun run design:apply -
```

écrit le thème comme nouveaux défauts de `index.css` (et l'import Google Fonts de la police en tête du
fichier), et les réglages comme nouveaux `default:` dans le fichier de la variante. Ensuite le panneau ne
voit plus rien de modifié : il n'y a rien à réintégrer. Une valeur inconnue (police, teinte, réglage
introuvable) arrête tout avant la moindre écriture.

## Garder une variante

1. `design:apply` des valeurs retenues.
2. Intégrer la variante dans la vraie page (`src/pages/…`) : son composant, ses données branchées sur
   tRPC à la place de `donnees.ts`. Ses réglages deviennent du code ordinaire : la valeur d'une variable
   CSS s'écrit en classe Tailwind (`text-[2.75rem]`), un attribut `data-` retenu devient la classe qu'il
   activait.
3. Supprimer le dossier `src/prototypes/<slug>/` en entier : les variantes écartées ne restent pas.
