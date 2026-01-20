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
        background: {
          DEFAULT: '#0a0a0a',
          card: '#111111',
          hover: '#1a1a1a',
        },
        accent: {
          red: '#ef4444',
          green: '#10b981',
          blue: '#3b82f6',
          purple: '#8b5cf6',
          amber: '#f59e0b',
          pink: '#ec4899',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      }
    },
  },
  plugins: [],
}