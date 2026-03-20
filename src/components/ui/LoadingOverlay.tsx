import React, { createContext, useContext, useState, useCallback } from "react";

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

	return (
		<LoadingContext.Provider value={{ show, hide }}>
			{children}
			{visible && (
				<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
					<div className="bg-white rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-4 min-w-[220px] animate-in zoom-in-95 duration-200">
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
