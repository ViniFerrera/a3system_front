import axios from "axios";

// Certifique-se que esta porta (8085) é a MESMA que está no server.ts
export const api = axios.create({
	baseURL: "http://192.168.100.153:8081/api",
	// baseURL: "http://Vini:7071/api",
	timeout: 30000, // 30 segundos de timeout para uploads
});

// Interceptor para garantir que FormData não tenha Content-Type forçado errado
api.interceptors.request.use((config) => {
	if (config.data instanceof FormData) {
		// Deixar undefined permite que o navegador defina o boundary corretamente
		// Se houver algum cabeçalho padrão de Content-Type, removemos ele aqui
		if (config.headers) {
			delete config.headers["Content-Type"];
		}
	}
	return config;
});
