import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      colors: {
        surface: {
          DEFAULT: "#0a0a0b",
          raised: "#141415",
          overlay: "#1c1c1e",
          border: "#2a2a2c",
        },
      },
      boxShadow: {
        dock: "0 -8px 32px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgba(255,255,255,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
