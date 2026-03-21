/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		extend: {
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
