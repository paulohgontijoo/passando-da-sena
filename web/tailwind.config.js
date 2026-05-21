/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:   '#1a1a2e',
        accent:    '#e94560',
        highlight: '#f5a623',
        muted:     '#8892b0',
        bg:        '#f8f9fa',
        surface:   '#161b22',
        brand:     '#e2e8f0',
      },
    },
  },
  plugins: [],
}
