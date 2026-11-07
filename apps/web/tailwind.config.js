import defaultTheme from 'tailwindcss/defaultTheme'

// Densité : les marges, retraits et écarts suivent `--density` (index.css, 1 par défaut). Les
// largeurs et hauteurs restent fixes : une densité serre l'air, pas les objets.
const dense = Object.fromEntries(
  Object.entries(defaultTheme.spacing).map(([k, v]) => [
    k,
    v.endsWith('rem') ? `calc(${v} * var(--density, 1))` : v,
  ]),
)

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
    // Le kit de design et ses prototypes n'existent qu'en développement.
    ...(globalThis.process?.env.NODE_ENV === 'production'
      ? ['!./src/design-kit/**', '!./src/prototypes/**']
      : []),
  ],
  theme: {
    padding: dense,
    gap: dense,
    space: dense,
    margin: { auto: 'auto', ...dense },
    extend: {
      fontFamily: {
        sans: 'var(--font-sans)',
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
