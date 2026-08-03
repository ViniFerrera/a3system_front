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
				<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/10 backdrop-blur-[2px] animate-fade-in">
					{/* Sem cartão branco por trás: o pedido era o GIF com fundo
					    transparente, não uma caixa opaca ao redor dele. */}
					<div className="flex flex-col items-center gap-3 animate-scale-in">
						{/* Servido de public/: URL absoluta a partir da raiz, não do
						    CDN externo — o hotlink não carregava em produção. */}
						<img
							src="/gif_loading.gif"
							alt="Carregando"
							className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
						/>
						<p className="text-sm font-semibold text-ink bg-white/80 backdrop-blur-sm px-3 py-1 rounded-full shadow-sm">
							{message}
						</p>
					</div>
				</div>
			)}
		</LoadingContext.Provider>
	);
};
