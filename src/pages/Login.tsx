import React, { useEffect } from "react";
import { Printer, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui";

// URL base do backend (sem /api)
const BACKEND =
	(import.meta.env.VITE_API_URL as string || "http://localhost:3333/api").replace(
		/\/api$/,
		""
	);

const errorMessages: Record<string, string> = {
	nao_autorizado: "Acesso negado. Seu e-mail não está autorizado a usar o sistema.",
	server_error: "Erro interno no servidor. Tente novamente.",
	auth_failed: "Falha na autenticação com o Google. Tente novamente.",
};

export const LoginPage = () => {
	const params = new URLSearchParams(window.location.search);
	const errorKey = params.get("error") || "";
	const errorMsg = errorMessages[errorKey] || null;

	// Marca deixada pelo interceptor de 401 em services/api.ts. Lida na
	// primeira renderização e apagada em seguida, para não reaparecer.
	const sessaoExpirada = sessionStorage.getItem("a3_session_expired") === "1";
	useEffect(() => {
		if (sessaoExpirada) sessionStorage.removeItem("a3_session_expired");
	}, []);

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-primary-950 to-slate-900 p-4 relative overflow-hidden">
			{/* Glows decorativos */}
			<div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-primary-600/15 rounded-full blur-[100px] pointer-events-none" />
			<div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />

			<div className="relative bg-white/95 backdrop-blur-md rounded-3xl shadow-elevated p-10 w-full max-w-sm text-center animate-scale-in border border-white/20">
				{/* Logo */}
				<div className="flex justify-center mb-6">
					<div className="bg-gradient-to-br from-primary-500 to-violet-600 p-4 rounded-2xl shadow-lg shadow-primary-500/30 ring-4 ring-primary-100/50">
						<Printer className="w-8 h-8 text-white" />
					</div>
				</div>

				<h1 className="text-2xl font-bold text-ink tracking-tight">
					A3 System
				</h1>
				<p className="text-ink-muted text-sm mt-1.5 mb-8 font-medium">
					Gestão Gráfica — Recife
				</p>

				{sessaoExpirada && (
					<div className="bg-warning-50 border border-warning-100 text-warning-700 rounded-xl px-4 py-3 text-sm font-medium mb-4">
						Sua sessão expirou. Entre novamente para continuar.
					</div>
				)}

				{/* Botão Google — mesma navegação de sempre para /auth/google. */}
				<Button
					variant="secondary"
					onClick={() => {
						window.location.href = `${BACKEND}/auth/google`;
					}}
					className="w-full !h-12 !gap-3 !rounded-xl shadow-soft hover:shadow-card-hover active:scale-[0.98]"
					icon={
						/* Ícone Google SVG */
						<svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
						<path
							fill="#4285F4"
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						/>
						<path
							fill="#34A853"
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						/>
						<path
							fill="#FBBC05"
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						/>
						<path
							fill="#EA4335"
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						/>
					</svg>
					}
				>
					Entrar com Google
				</Button>

				{errorMsg && (
					<div className="flex items-start gap-2.5 mt-5 bg-danger-50 border border-danger-200/60 rounded-xl px-4 py-3 text-left animate-fade-in-up">
						<AlertTriangle className="w-4 h-4 text-danger-500 flex-shrink-0 mt-0.5" />
						<p className="text-xs text-danger-700 font-medium leading-relaxed">{errorMsg}</p>
					</div>
				)}

				<p className="text-2xs text-ink-faint mt-8 font-medium">
					Acesso restrito a usuários autorizados
				</p>
			</div>
		</div>
	);
};
