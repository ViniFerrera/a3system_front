import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info";

interface ToastItem {
	id: number;
	kind: ToastKind;
	message: string;
}

interface ToastApi {
	success: (message: string) => void;
	error: (message: string) => void;
	info: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({
	success: () => {},
	error: () => {},
	info: () => {},
});

export const useToast = () => useContext(ToastContext);

const STYLES: Record<ToastKind, { box: string; icon: React.ReactNode }> = {
	success: {
		box: "bg-white border-success-200 text-ink",
		icon: <CheckCircle2 className="w-5 h-5 text-success-600 flex-shrink-0" aria-hidden="true" />,
	},
	error: {
		box: "bg-white border-danger-200 text-ink",
		icon: <AlertTriangle className="w-5 h-5 text-danger-600 flex-shrink-0" aria-hidden="true" />,
	},
	info: {
		box: "bg-white border-info-200 text-ink",
		icon: <Info className="w-5 h-5 text-info-600 flex-shrink-0" aria-hidden="true" />,
	},
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
	const [items, setItems] = useState<ToastItem[]>([]);
	// Um timer por aviso: fechar no "X" precisa cancelar o timer correspondente,
	// senão ele sobrevive ao aviso e ainda dispara um setState depois.
	const timers = useRef(new Map<number, number>());

	const remove = useCallback((id: number) => {
		const timer = timers.current.get(id);
		if (timer !== undefined) {
			window.clearTimeout(timer);
			timers.current.delete(id);
		}
		setItems((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const push = useCallback(
		(kind: ToastKind, message: string) => {
			const id = Date.now() + Math.random();
			setItems((prev) => [...prev, { id, kind, message }]);
			// Erro fica mais tempo na tela — costuma exigir leitura.
			timers.current.set(
				id,
				window.setTimeout(() => remove(id), kind === "error" ? 7000 : 4000)
			);
		},
		[remove]
	);

	// Nenhum timer pode sobreviver ao provider.
	useEffect(() => {
		const pending = timers.current;
		return () => {
			pending.forEach((timer) => window.clearTimeout(timer));
			pending.clear();
		};
	}, []);

	const success = useCallback((m: string) => push("success", m), [push]);
	const error = useCallback((m: string) => push("error", m), [push]);
	const info = useCallback((m: string) => push("info", m), [push]);
	// Sem o memo, o objeto muda de identidade a cada aviso e re-renderiza
	// todo componente que chamou useToast().
	const api = useMemo<ToastApi>(() => ({ success, error, info }), [success, error, info]);

	return (
		<ToastContext.Provider value={api}>
			{children}
			{/* Região viva permanente: leitores de tela anunciam o aviso inserido
			    de forma confiável, o que não acontece quando a própria região
			    só aparece junto com o conteúdo. */}
			<div
				aria-live="polite"
				aria-atomic="false"
				className="fixed bottom-5 right-5 z-[10000] flex flex-col gap-2 w-[min(380px,calc(100vw-2.5rem))]"
			>
				{items.map((t) => (
					<div
						key={t.id}
						role="status"
						className={`flex items-start gap-3 border rounded-xl shadow-elevated px-4 py-3 animate-fade-in-up ${STYLES[t.kind].box}`}
					>
						{STYLES[t.kind].icon}
						<p className="text-sm font-medium flex-1">{t.message}</p>
						<button
							type="button"
							onClick={() => remove(t.id)}
							className="text-ink-faint hover:text-ink transition-colors"
							aria-label="Fechar aviso"
						>
							<X className="w-4 h-4" aria-hidden="true" />
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
};
