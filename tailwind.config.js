/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#1a1714',
          900: '#2c2722',
          700: '#5c534a',
          500: '#8a7f74',
        },
        paper: {
          50: '#f7f3eb',
          100: '#efe8d8',
          200: '#e2d6c0',
        },
        rust: {
          500: '#c45c26',
          600: '#a64b1d',
          700: '#833c18',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Source Sans 3"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(26, 23, 20, 0.06), 0 12px 32px -16px rgba(26, 23, 20, 0.28)',
      },
    },
  },
  plugins: [],
}
