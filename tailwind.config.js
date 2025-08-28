/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#376fad",
        secondary: "#1e293b",
        tricolor: "#f8fafc",
      },
      fontFamily: {
        billfont: ["Poppins"],
      },
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
        '3xl': '1920px',
        '4xl': '2100px', // Add this custom breakpoint
      },
    },
  },
  plugins: [],
};