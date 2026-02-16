/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Aidatim brand colors
        aidatim: {
          blue: {
            DEFAULT: '#0B6FA8', // Hoofdkleur
            light: '#3B9DD4',
            dark: '#08537E',    // Donkerder variant voor hover
          },
          green: {
            DEFAULT: '#63B233', // Secundaire kleur (acties/succes)
            light: '#85D455',
            dark: '#4E9A2A',    // Donkerder groen uit logo
          },
          orange: {
            DEFAULT: '#F7941D', // Accentkleur
            light: '#FFB35C',
            dark: '#C8720B',
          },
          gray: {
            DEFAULT: '#6F6F6E', // Tekstkleur
            light: '#BFBFBF',   // Lichte tekst
            dark: '#4A4A4A',
          },
        },
        // Map standaard Tailwind classes naar brand colors voor consistentie
        primary: {
          DEFAULT: '#0B6FA8',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: '#63B233',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#F7941D',
          foreground: '#FFFFFF',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
      },
    },
  },
  plugins: [],
}

