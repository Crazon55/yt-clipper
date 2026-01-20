module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}", // This tells Tailwind to also look in the root folder
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}