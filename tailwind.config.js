/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.html",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "var(--navy)",
          deep: "var(--navy-deep)",
          soft: "var(--navy-soft)",
          gold: "var(--gold)",
          "gold-light": "var(--gold-light)"
        },
        canvas: "var(--canvas)",
        panel: "var(--panel)",
        line: "var(--line)",
        ink: "var(--ink)",
        muted: "var(--muted)",
        success: "var(--green)",
        danger: "var(--red)",
        warning: "var(--amber)"
      },
      boxShadow: {
        panel: "var(--shadow)"
      },
      fontFamily: {
        sans: ["Segoe UI", "Arial", "sans-serif"],
        display: ["Georgia", "serif"]
      }
    }
  },
  plugins: []
};
