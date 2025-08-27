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
    },
  },
  plugins: [],
};
