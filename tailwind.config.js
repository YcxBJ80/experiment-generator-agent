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
        // 暗色主题颜色配置
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
        // 低饱和度彩色元素
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
        '2': '8px', // 统一间距
      },
      borderRadius: {
        'low': '4px', // 低弧度圆角
        'medium': '6px',
      },
    },
  },
  plugins: [],
};
