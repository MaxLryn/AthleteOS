/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        dm: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        bg: {
          1: '#08090c',
          2: '#0f1117',
          3: '#161a24',
          4: '#1e2335',
          5: '#252c40',
        },
        accent: {
          blue:   '#4f8ef7',
          purple: '#a855f7',
          green:  '#22d3a0',
          amber:  '#f59e0b',
          red:    '#f43f5e',
          sky:    '#38bdf8',
        }
      }
    }
  },
  plugins: [],
}
