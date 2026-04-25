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
        bg:             'rgb(var(--color-bg) / <alpha-value>)',
        surface:        'rgb(var(--color-surface) / <alpha-value>)',
        'surface-2':    'rgb(var(--color-surface-2) / <alpha-value>)',
        accent:         '#6366F1',
        'accent-hover': '#4F46E5',
        'text-primary':   'rgb(var(--color-text-primary) / <alpha-value>)',
        'text-secondary': 'rgb(var(--color-text-secondary) / <alpha-value>)',
        border:         'rgb(var(--color-border) / <alpha-value>)',
        'border-bright':'rgb(var(--color-border-bright) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
