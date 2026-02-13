import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      colors: {
        parchment: "#F5F2ED",
        sage: "#8A9A5B",
        charcoal: "#2C2C2C",
        ink: "#1A1A1A",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        serif: ["var(--font-playfair-display)"],
      },
    },
  },
  plugins: [],
} satisfies Config;
