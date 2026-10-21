import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palette sobre et rassurante, contrastes conformes WCAG 2.1 AA
        primary: {
          DEFAULT: "#1d4ed8",
          dark: "#1e3a8a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
