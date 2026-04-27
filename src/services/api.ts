import axios from "axios";

const API_BASE =
	(import.meta.env.VITE_API_URL as string) || "http://localhost:3333/api";

export const api = axios.create({
	baseURL: API_BASE,
	timeout: 60000,
});

// ─── Interceptor: injeta o JWT em todas as requisições ───────────────────────
api.interceptors.request.use((config) => {
	const token = localStorage.getItem("a3_token");
	if (token && config.headers) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	// Deixa o browser definir o Content-Type correto para FormData (boundary)
	if (config.data instanceof FormData && config.headers) {
		delete config.headers["Content-Type"];
	}
	return config;
});

// ─── Interceptor: redireciona para login se token expirar ────────────────────
api.interceptors.response.use(
	(res) => res,
	(err) => {
		if (err.response?.status === 401) {
			localStorage.removeItem("a3_token");
			window.location.reload();
		}
		return Promise.reject(err);
	}
);
