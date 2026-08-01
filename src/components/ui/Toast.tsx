import React, { createContext, useCallback, useContext, useState } from "react";
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
		icon: <CheckCircle2 className="w-5 h-5 text-success-600 flex-shrink-0" />,
	},
	error: {
		box: "bg-white border-danger-200 text-ink",
		icon: <AlertTriangle className="w-5 h-5 text-danger-600 flex-shrink-0" />,
	},
	info: {
		box: "bg-white border-info-200 text-ink",
		icon: <Info className="w-5 h-5 text-info-600 flex-shrink-0" />,
	},
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
	const [items, setItems] = useState<ToastItem[]>([]);

	const remove = useCallback((id: number) => {
		setItems((prev) => prev.filter((t) => t.id !== id));
	}, []);

	const push = useCallback(
		(kind: ToastKind, message: string) => {
			const id = Date.now() + Math.random();
			setItems((prev) => [...prev, { id, kind, message }]);
			// Erro fica mais tempo na tela — costuma exigir leitura.
			window.setTimeout(() => remove(id), kind === "error" ? 7000 : 4000);
		},
		[remove]
	);

	const api: ToastApi = {
		success: useCallback((m: string) => push("success", m), [push]),
		error: useCallback((m: string) => push("error", m), [push]),
		info: useCallback((m: string) => push("info", m), [push]),
	};

	return (
		<ToastContext.Provider value={api}>
			{children}
			<div className="fixed bottom-5 right-5 z-[10000] flex flex-col gap-2 w-[min(380px,calc(100vw-2.5rem))]">
				{items.map((t) => (
					<div
						key={t.id}
						role="status"
						className={`flex items-start gap-3 border rounded-xl shadow-elevated px-4 py-3 animate-fade-in-up ${STYLES[t.kind].box}`}
					>
						{STYLES[t.kind].icon}
						<p className="text-sm font-medium flex-1">{t.message}</p>
						<button
							onClick={() => remove(t.id)}
							className="text-ink-faint hover:text-ink transition-colors"
							aria-label="Fechar aviso"
						>
							<X className="w-4 h-4" />
						</button>
					</div>
				))}
			</div>
		</ToastContext.Provider>
	);
};
