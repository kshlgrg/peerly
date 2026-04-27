/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#050505",
        panel: "#0b0b0f",
        line: "#d9ff00",
        mint: "#12ffd0",
        amber: "#f8ff00",
        cream: "#f7ffe7",
        copper: "#ff4fd8",
        moss: "#a6ff00",
        violet: "#7b2cff",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(217, 255, 0, 0.7), 8px 8px 0 rgba(255, 79, 216, 0.88), -8px -8px 0 rgba(123, 44, 255, 0.72)",
      },
    },
  },
  plugins: [],
};
