/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        glass: "var(--glass-bg)",
        glassBorder: "var(--glass-border)",
        glassDark: "rgba(2, 6, 23, 0.8)", 
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}