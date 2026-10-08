/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        f1: {
          dark: '#15151e',
          red: '#e10600',
          muted: '#808080',
          border: '#333333'
        }
      }
    },
  },
  plugins: [],
}
