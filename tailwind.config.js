/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/js/**/*.js"],
  safelist: [
    "bg-slate-950/85",
    "bg-slate-950/78",
    "bg-slate-950/65",
    "bg-slate-950/98",
    "hover:border-cyan-300/60",
    "hover:border-violet-300/60",
    "bg-cyan-300/10",
    "bg-violet-300/10",
    "text-cyan-200",
    "text-violet-200",
    "mt-[1px]",
    "shadow-[0_14px_34px_rgba(8,47,73,.45)]"
  ],
  theme: {
    extend: {
      fontFamily: { sans: ["Inter", "ui-sans-serif", "system-ui"] },
      boxShadow: { glow: "0 0 80px rgba(34, 211, 238, .18)" },
      animation: {
        float: "float 7s ease-in-out infinite",
        gradient: "gradient 12s ease infinite",
        shimmer: "shimmer 2.8s linear infinite"
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-16px)" }
        },
        gradient: {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        },
        shimmer: {
          "0%": { transform: "translateX(-120%)" },
          "100%": { transform: "translateX(120%)" }
        }
      }
    }
  },
  plugins: []
};
