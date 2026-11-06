/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F06AC',
          light: '#5882E8',
          dark: '#0F42C0',
        },
        secondary: '#0F42C0',
        accent: '#5882E8',
        highlight: '#E3EF4F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
}
