/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        // Dark theme color configuration
        dark: {
          bg: '#0f0f0f',
          'bg-secondary': '#1a1a1a',
          'bg-tertiary': '#2a2a2a',
          text: '#ffffff',
          'text-secondary': '#e5e5e5',
          'text-muted': '#a0a0a0',
          border: '#2a2a2a',
          'border-light': '#3a3a3a',
        },
        // Low saturation colored elements
        accent: {
          blue: '#4a5568',
          gray: '#718096',
          slate: '#2d3748',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
      spacing: {
        '2': '8px', // Unified spacing
      },
      borderRadius: {
        'low': '4px', // Low radius rounded corners
        'medium': '6px',
      },
    },
  },
  plugins: [],
};
