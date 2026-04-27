/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17120e",
        panel: "#241a13",
        line: "#5d4634",
        mint: "#8fffd2",
        amber: "#fbbf24",
        cream: "#fff1cf",
        copper: "#d77a3f",
        moss: "#93c572",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "monospace"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 34px rgba(251, 191, 36, 0.14), inset 0 0 28px rgba(143, 255, 210, 0.05)",
      },
    },
  },
  plugins: [],
};
