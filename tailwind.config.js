/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
      },
      colors: {
        office: {
          bg: '#0a0a1a',
          panel: '#111128',
          border: '#1e1e3a',
          accent: '#7B68EE',
        },
      },
    },
  },
  plugins: [],
}
