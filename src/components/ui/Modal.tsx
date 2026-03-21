import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, size = "md" }: any) => {
	if (!isOpen) return null;
	const sizeClass = size === "lg" ? "sm:max-w-4xl" : "sm:max-w-md";
	return (
		<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[3px] z-[9999] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in overflow-y-auto">
			<div className={`bg-white w-full ${sizeClass} flex flex-col animate-slide-in-bottom sm:animate-scale-in sm:my-8 mx-auto relative rounded-t-2xl sm:rounded-2xl shadow-elevated max-h-[92vh] sm:max-h-[85vh]`}>
				<div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-100 flex-shrink-0">
					<h3 className="text-base sm:text-lg font-bold text-slate-800">{title}</h3>
					<button
						onClick={onClose}
						className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all -mr-1"
						aria-label="Fechar"
					>
						<X className="w-5 h-5" />
					</button>
				</div>
				<div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
					{children}
				</div>
			</div>
		</div>
	);
};
