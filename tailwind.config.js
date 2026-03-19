/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f4f7f4',
          100: '#e3ebe3',
          200: '#c7d9c8',
          300: '#a3bya5',
          400: '#86a788', // Primary Sage
          500: '#678969',
          600: '#506c52',
          700: '#415743',
          800: '#364738',
          900: '#2d3a2f',
        },
        mint: {
          50: '#f2fbf7',
          100: '#e1f5eb',
          200: '#c4ebd6',
          300: '#9addbc',
          400: '#69c79f',
          500: '#43ab81', // Primary Mint
          600: '#318965',
          700: '#296e52',
          800: '#235843',
          900: '#1d4938',
        },
        cream: {
          50: '#fdfbf7',
          100: '#fcf8ec',
          200: '#f7edcc',
          300: '#f1dea4',
          400: '#eacb75',
          500: '#e1b04a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.05)',
      }
    },
  },
  plugins: [],
}
