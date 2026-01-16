// client/tailwind.config.js — можно оставить без изменений,
// но если хотите точный оттенок, добавьте:
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Опционально: кастомный синий акцент
        'app-blue': '#2563eb', // Tailwind blue-600
        'app-blue-hover': '#1d4ed8', // blue-700
      }
    },
  },
  plugins: [],
}