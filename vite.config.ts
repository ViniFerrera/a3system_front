import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
	plugins: [react()],
	base: "/",
	resolve: {
		alias: {
			"@": path.resolve(process.cwd(), "./src"),
		},
	},
	server: {
		port: 7072,
		host: true,
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					// O React precisa vir primeiro e em chunk proprio. Sem isso o
					// rollup o arrasta para dentro dos chunks de recharts/markdown,
					// que passam a ser pre-carregados na entrada.
					react: ["react", "react-dom", "react/jsx-runtime"],
					recharts: ["recharts"],
					xlsx: ["xlsx"],
					markdown: ["react-markdown"],
				},
			},
		},
	},
});
