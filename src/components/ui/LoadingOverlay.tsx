import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

interface LoadingContextType {
	show: (message?: string) => void;
	hide: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
	show: () => {},
	hide: () => {},
});

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }: { children: React.ReactNode }) => {
	const [visible, setVisible] = useState(false);
	const [message, setMessage] = useState("Carregando...");

	const show = useCallback((msg?: string) => {
		setMessage(msg || "Carregando...");
		setVisible(true);
	}, []);

	const hide = useCallback(() => {
		setVisible(false);
	}, []);

	// Sem o memo o objeto muda de identidade a cada show/hide, e todo componente
	// que chamou useLoading() re-renderiza junto. Pior: os handlers que dependem
	// dele (`updateStatus` em Ordens) trocavam de identidade e derrubavam o
	// React.memo das linhas da tabela. `visible` e `message` não saem daqui.
	const value = useMemo(() => ({ show, hide }), [show, hide]);

	return (
		<LoadingContext.Provider value={value}>
			{children}
			{visible && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
					<div className="bg-white rounded-2xl shadow-elevated px-8 py-6 flex flex-col items-center gap-4 min-w-[220px] animate-scale-in">
						<div className="relative">
							<div className="w-10 h-10 rounded-full border-[3px] border-indigo-100 border-t-indigo-600 animate-spin" />
							<div className="absolute inset-0 w-10 h-10 rounded-full border-[3px] border-transparent border-b-violet-400 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
						</div>
						<p className="text-sm font-semibold text-slate-700 text-center">{message}</p>
					</div>
				</div>
			)}
		</LoadingContext.Provider>
	);
};
