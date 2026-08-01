import React, { createContext, useCallback, useContext, useRef, useState } from "react";
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

	const confirm = useCallback<ConfirmFn>((opts) => {
		setOptions(opts);
		return new Promise<boolean>((resolve) => {
			resolver.current = resolve;
		});
	}, []);

	const close = (result: boolean) => {
		resolver.current?.(result);
		resolver.current = null;
		setOptions(null);
	};

	return (
		<ConfirmContext.Provider value={confirm}>
			{children}
			{options && (
				<div
					className="fixed inset-0 z-[10001] bg-slate-900/50 backdrop-blur-[3px] flex items-center justify-center p-4 animate-fade-in"
					onClick={() => close(false)}
				>
					<div
						className="bg-white rounded-2xl shadow-elevated w-full max-w-md p-6 animate-scale-in"
						onClick={(e) => e.stopPropagation()}
					>
						<div className="flex items-start gap-3">
							<div
								className={`p-2 rounded-xl flex-shrink-0 ${
									options.danger ? "bg-danger-50 text-danger-600" : "bg-primary-50 text-primary-600"
								}`}
							>
								<AlertTriangle className="w-5 h-5" />
							</div>
							<div className="flex-1">
								<h3 className="text-base font-bold text-ink">{options.title}</h3>
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
