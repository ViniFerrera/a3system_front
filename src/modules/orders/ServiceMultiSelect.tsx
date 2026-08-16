import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

// Variante do MultiSelect genérico (components/ui/MultiSelect.tsx) com o
// mesmo gatilho/comportamento do SearchableSelect (cliente) da faixa de
// filtros de Ordens: altura, borda e cores padronizadas, e lista renderizada
// via portal para não ser cortada pelo overflow-x-auto do container.
export const ServiceMultiSelect = ({
	options,
	selected,
	onChange,
	placeholder = "Selecione...",
	formatLabel,
}: {
	options: string[];
	selected: string[];
	onChange: (selected: string[]) => void;
	placeholder?: string;
	/** Formata o rótulo exibido sem alterar o valor selecionado. */
	formatLabel?: (value: string) => string;
}) => {
	const label = (value: string) => (formatLabel ? formatLabel(value) || value : value);
	const [isOpen, setIsOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLDivElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

	const updateCoords = useCallback(() => {
		const rect = triggerRef.current?.getBoundingClientRect();
		if (rect) {
			setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
		}
	}, []);

	useLayoutEffect(() => {
		if (isOpen) updateCoords();
	}, [isOpen, updateCoords]);

	useEffect(() => {
		if (!isOpen) return;
		const handleScrollOrResize = () => updateCoords();
		window.addEventListener("scroll", handleScrollOrResize, true);
		window.addEventListener("resize", handleScrollOrResize);
		return () => {
			window.removeEventListener("scroll", handleScrollOrResize, true);
			window.removeEventListener("resize", handleScrollOrResize);
		};
	}, [isOpen, updateCoords]);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(target) &&
				dropdownRef.current &&
				!dropdownRef.current.contains(target)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const toggleOption = (option: string) => {
		if (selected.includes(option)) {
			onChange(selected.filter((item) => item !== option));
		} else {
			onChange([...selected, option]);
		}
	};

	return (
		<div className='relative w-full' ref={wrapperRef}>
			<div
				ref={triggerRef}
				className='w-full h-8 px-2.5 border border-slate-200 rounded-[10px] bg-white text-sm flex justify-between items-center gap-2 cursor-pointer hover:border-slate-300 transition-colors'
				onClick={() => setIsOpen(!isOpen)}
			>
				<div className='flex-1 min-w-0 flex items-center gap-1 overflow-hidden'>
					{selected.length > 0 ? (
						selected.length === 1 ? (
							<span className='truncate text-ink font-medium'>{label(selected[0])}</span>
						) : (
							<span className='truncate text-ink font-medium'>{selected.length} selecionados</span>
						)
					) : (
						<span className='text-ink-faint truncate'>{placeholder}</span>
					)}
				</div>
				<ChevronDown className={`w-4 h-4 text-ink-faint flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
			</div>
			{isOpen &&
				createPortal(
					<div
						ref={dropdownRef}
						className='fixed z-50 bg-white border border-slate-200 rounded-[10px] shadow-xl max-h-80 overflow-y-auto custom-scrollbar p-1 animate-in fade-in zoom-in-95 duration-100'
						style={{ top: coords.top, left: coords.left, width: coords.width }}
					>
						{options.map((option) => (
							<div
								key={option}
								className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-lg text-sm transition-colors ${
									selected.includes(option) ? "bg-indigo-50" : "hover:bg-slate-50"
								}`}
								onClick={() => toggleOption(option)}
							>
								<div
									className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
										selected.includes(option) ? "bg-indigo-600 border-indigo-600" : "border-slate-300"
									}`}
								>
									{selected.includes(option) && <Check className='w-3 h-3 text-white' />}
								</div>
								<span className='text-slate-700 truncate'>{label(option)}</span>
							</div>
						))}
					</div>,
					document.body
				)}
		</div>
	);
};
