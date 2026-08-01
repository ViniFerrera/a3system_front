import React from 'react';
import { X } from 'lucide-react';

// "sm" e "md" mapeiam para a mesma largura de propósito: o comportamento
// anterior era um ternário que mandava tudo que não fosse "lg" para max-w-md.
// Mudar "md" alargaria silenciosamente Despesas (que omite size) e Estoque.
const SIZES: Record<string, string> = {
	sm: "sm:max-w-md",
	md: "sm:max-w-md",
	lg: "sm:max-w-4xl",
	xl: "sm:max-w-7xl",
};

// `footer` é opcional: fica fora da área rolável, então total e botões seguem
// visíveis com a lista longa. Modais que não passam a prop não mudam em nada.
export const Modal = ({ isOpen, onClose, title, children, size = "md", footer }: any) => {
	if (!isOpen) return null;
	const sizeClass = SIZES[size] ?? SIZES.md;
	// O modal xl (formulário de ordem) precisa de mais altura para a grade de itens.
	const heightClass = size === "xl" ? "sm:max-h-[90vh]" : "sm:max-h-[85vh]";
	return (
		<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[3px] z-[9999] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in overflow-y-auto">
			<div className={`bg-white w-full ${sizeClass} flex flex-col animate-slide-in-bottom sm:animate-scale-in sm:my-8 mx-auto relative rounded-t-2xl sm:rounded-2xl shadow-elevated max-h-[92vh] ${heightClass}`}>
				<div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 flex-shrink-0">
					<h3 className="text-base sm:text-lg font-bold text-ink">{title}</h3>
					<button
						onClick={onClose}
						className="flex items-center justify-center w-8 h-8 rounded-lg text-ink-faint hover:text-ink-muted hover:bg-slate-100 transition-all -mr-1"
						aria-label="Fechar"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
					{children}
				</div>
				{footer && (
					<div className="p-4 sm:px-6 sm:py-4 border-t border-slate-100 flex-shrink-0 bg-white rounded-b-2xl">
						{footer}
					</div>
				)}
			</div>
		</div>
	);
};
