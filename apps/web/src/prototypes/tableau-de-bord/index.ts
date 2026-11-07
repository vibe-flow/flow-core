import { definePrototype } from '@/design-kit/values'
import chiffresDabord from './1a-chiffres-d-abord'
import fileDactions from './1b-file-d-actions'

export default definePrototype({
  title: 'Tableau de bord',
  question: 'Qu’est-ce que le gérant doit voir en ouvrant l’application le matin ?',
  variants: [chiffresDabord, fileDactions],
})
