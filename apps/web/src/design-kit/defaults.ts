/** Les défauts du projet, lus dans `index.css` lui-même : après `design:apply`, ils suivent. */
import css from '../index.css?raw'
import { readThemeDefaults } from './css-tokens'

export const THEME_DEFAULTS = readThemeDefaults(css)
