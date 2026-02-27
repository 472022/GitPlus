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
        github: {
          dark: {
            bg: '#0d1117',
            'bg-secondary': '#161b22',
            border: '#30363d',
            text: '#c9d1d9',
            'text-secondary': '#8b949e',
            accent: '#58a6ff',
            'btn-bg': '#21262d',
            'btn-hover': '#30363d',
          },
          light: {
            bg: '#ffffff',
            'bg-secondary': '#f6f8fa',
            border: '#d0d7de',
            text: '#24292f',
            'text-secondary': '#57606a',
            accent: '#0969da',
            'btn-bg': '#f6f8fa',
            'btn-hover': '#f3f4f6',
          },
        }
      }
    },
  },
  plugins: [],
}
