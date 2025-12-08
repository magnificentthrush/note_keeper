import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // New Palette
        deep: {
          950: "#05050A", // Very dark indigo/black
          900: "#0A0A12",
          800: "#12121F",
        },
        neon: {
          violet: "#7C3AED", // Base violet
          purple: "#A855F7",
          blue: "#3B82F6",
          cyan: "#06b6d4",
          pink: "#ec4899",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "deep-space": "linear-gradient(to bottom, #05050A, #0A0A12)",
        "glass-gradient": "linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%)",
        "neon-glow": "conic-gradient(from 180deg at 50% 50%, #7C3AED 0deg, #3B82F6 180deg, #7C3AED 360deg)",
      },
      boxShadow: {
        "neon": "0 0 20px -5px rgba(124, 58, 237, 0.3)",
        "neon-strong": "0 0 30px -5px rgba(124, 58, 237, 0.5)",
        "glass": "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      }
    },
  },
  plugins: [],
};

export default config;


