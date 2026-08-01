import React, { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export interface ConfirmOptions {
	title: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(async () => false);

/** Uso: `if (!(await confirm({ title: "Apagar?" }))) return;` */
export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
	const [options, setOptions] = useState<ConfirmOptions | null>(null);
	const resolver = useRef<((value: boolean) => void) | null>(null);
	const titleId = useId();

	/** Encerra a promessa pendente, se houver, e solta o resolvedor. */
	const settle = useCallback((result: boolean) => {
		resolver.current?.(result);
		resolver.current = null;
	}, []);

	const confirm = useCallback<ConfirmFn>(
		(opts) => {
			// Um segundo confirm() antes de o primeiro fechar sobrescreveria o
			// resolvedor e deixaria a promessa anterior pendente para sempre —
			// quem estivesse no `await` travava sem retorno.
			settle(false);
			setOptions(opts);
			return new Promise<boolean>((resolve) => {
				resolver.current = resolve;
			});
		},
		[settle]
	);

	const close = useCallback(
		(result: boolean) => {
			settle(result);
			setOptions(null);
		},
		[settle]
	);

	// Esc cancela — comportamento esperado de qualquer diálogo. O listener só
	// existe enquanto o diálogo está aberto e sai junto com ele.
	useEffect(() => {
		if (!options) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") close(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [options, close]);

	// Desmontar o provider não pode deixar ninguém preso no `await`.
	useEffect(() => () => settle(false), [settle]);

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{options && (
				<div
					className="fixed inset-0 z-[10001] bg-slate-900/50 backdrop-blur-[3px] flex items-center justify-center p-4 animate-fade-in"
					onClick={() => close(false)}
				>
					<div
						role="dialog"
						aria-modal="true"
						aria-labelledby={titleId}
						className="bg-white rounded-2xl shadow-elevated w-full max-w-md p-6 animate-scale-in"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-start gap-3">
							<div
								aria-hidden="true"
								className={`p-2 rounded-xl flex-shrink-0 ${
									options.danger ? "bg-danger-50 text-danger-600" : "bg-primary-50 text-primary-600"
								}`}
							>
								<AlertTriangle className="w-5 h-5" />
							</div>
							<div className="flex-1">
								<h3 id={titleId} className="text-base font-bold text-ink">
									{options.title}
								</h3>
								{options.message && (
									<p className="text-sm text-ink-muted mt-1.5">{options.message}</p>
								)}
							</div>
						</div>
						<div className="flex justify-end gap-2 mt-6">
							<Button variant="ghost" onClick={() => close(false)}>
								{options.cancelLabel || "Cancelar"}
							</Button>
							<Button
								variant={options.danger ? "danger" : "primary"}
								onClick={() => close(true)}
								autoFocus
							>
								{options.confirmLabel || "Confirmar"}
							</Button>
						</div>
					</div>
				</div>
			)}
		</ConfirmContext.Provider>
	);
};
