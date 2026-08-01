/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	safelist: ["text-left", "text-right", "text-center"],
	theme: {
		extend: {
			fontFamily: {
				sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
			},
			// Escala fluida: cresce suavemente entre 1280px e 1920px.
			// Piso de 12px — nenhum texto do sistema fica menor que isso.
			fontSize: {
				"2xs": ["clamp(0.75rem, 0.72rem + 0.10vw, 0.8125rem)", { lineHeight: "1.35" }],
				xs: ["clamp(0.8125rem, 0.78rem + 0.14vw, 0.875rem)", { lineHeight: "1.4" }],
				sm: ["clamp(0.875rem, 0.84rem + 0.18vw, 0.9375rem)", { lineHeight: "1.45" }],
				base: ["clamp(0.9375rem, 0.90rem + 0.20vw, 1rem)", { lineHeight: "1.5" }],
				lg: ["clamp(1.0625rem, 1.00rem + 0.28vw, 1.1875rem)", { lineHeight: "1.4" }],
				xl: ["clamp(1.25rem, 1.15rem + 0.40vw, 1.5rem)", { lineHeight: "1.3" }],
				"2xl": ["clamp(1.5rem, 1.35rem + 0.60vw, 1.875rem)", { lineHeight: "1.25" }],
				"3xl": ["clamp(1.875rem, 1.60rem + 0.90vw, 2.25rem)", { lineHeight: "1.2" }],
			},
			borderRadius: {
				DEFAULT: "10px",
				md: "10px",
				lg: "12px",
				xl: "16px",
				"2xl": "20px",
			},
			colors: {
				primary: {
					50: "#eef2ff",
					100: "#e0e7ff",
					200: "#c7d2fe",
					300: "#a5b4fc",
					400: "#818cf8",
					500: "#6366f1",
					600: "#4f46e5",
					700: "#4338ca",
					800: "#3730a3",
					900: "#312e81",
					950: "#1e1b4b",
				},
				ink: {
					DEFAULT: "#0f172a",
					muted: "#64748b",
					faint: "#94a3b8",
				},
				surface: {
					DEFAULT: "#ffffff",
					sunken: "#f8fafc",
					raised: "#ffffff",
				},
				// Tons 200/300/400 completam a escala: sem eles, classes como
				// `border-success-200` e `focus:border-danger-400` não geram CSS.
				// Valores espelham a escala original do Tailwind:
				// success↔emerald, warning↔amber, danger↔red, info↔sky.
				success: { 50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399", 500: "#10b981", 600: "#059669", 700: "#047857" },
				warning: { 50: "#fffbeb", 100: "#fef3c7", 200: "#fde68a", 300: "#fcd34d", 400: "#fbbf24", 500: "#f59e0b", 600: "#d97706", 700: "#b45309" },
				danger: { 50: "#fef2f2", 100: "#fee2e2", 200: "#fecaca", 300: "#fca5a5", 400: "#f87171", 500: "#ef4444", 600: "#dc2626", 700: "#b91c1c" },
				info: { 50: "#f0f9ff", 100: "#e0f2fe", 200: "#bae6fd", 300: "#7dd3fc", 400: "#38bdf8", 500: "#0ea5e9", 600: "#0284c7", 700: "#0369a1" },
			},
			boxShadow: {
				"soft": "0 2px 8px -2px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
				"card": "0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.03)",
				"card-hover": "0 8px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -4px rgba(0,0,0,0.04)",
				"elevated": "0 10px 30px -8px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.05)",
				"glow-indigo": "0 0 20px -5px rgba(99,102,241,0.25)",
			},
			keyframes: {
				"fade-in": {
					from: { opacity: "0" },
					to: { opacity: "1" },
				},
				"fade-in-up": {
					from: { opacity: "0", transform: "translateY(8px)" },
					to: { opacity: "1", transform: "translateY(0)" },
				},
				"slide-in-bottom": {
					from: { transform: "translateY(100%)" },
					to: { transform: "translateY(0)" },
				},
				"scale-in": {
					from: { opacity: "0", transform: "scale(0.95)" },
					to: { opacity: "1", transform: "scale(1)" },
				},
			},
			animation: {
				"fade-in": "fade-in 200ms ease-out",
				"fade-in-up": "fade-in-up 250ms ease-out",
				"slide-in-bottom": "slide-in-bottom 300ms cubic-bezier(0.16,1,0.3,1)",
				"scale-in": "scale-in 200ms ease-out",
			},
		},
	},
	plugins: [],
};
