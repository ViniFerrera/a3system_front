import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface MultiSelectProps {
	options: string[];
	selected: string[];
	onChange: (selected: string[]) => void;
	placeholder?: string;
}

export const MultiSelect = ({ options, selected, onChange, placeholder = "Selecione..." }: MultiSelectProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const toggleOption = (option: string) => {
		if (selected.includes(option)) {
			onChange(selected.filter(item => item !== option));
		} else {
			onChange([...selected, option]);
		}
	};

	return (
		<div className="relative w-full" ref={ref}>
			<div
				className={`w-full border rounded-xl p-2.5 text-sm bg-white cursor-pointer flex justify-between items-center min-h-[42px] transition-all duration-150 ${
					isOpen
						? 'border-indigo-400 ring-2 ring-indigo-100 shadow-sm'
						: 'border-slate-200 hover:border-slate-300'
				}`}
				onClick={() => setIsOpen(!isOpen)}
			>
				<div className="flex flex-wrap gap-1">
					{selected.length > 0 ? (
						selected.map(s => (
							<span key={s} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-medium border border-indigo-100">
								{s}
							</span>
						))
					) : (
						<span className="text-slate-400">{placeholder}</span>
					)}
				</div>
				<ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
			</div>
			{isOpen && (
				<div className="absolute top-full left-0 w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-elevated max-h-60 overflow-y-auto z-50 p-1 animate-fade-in-up">
					{options.map(option => (
						<div
							key={option}
							className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer rounded-lg text-sm transition-colors ${
								selected.includes(option) ? 'bg-indigo-50' : 'hover:bg-slate-50'
							}`}
							onClick={() => toggleOption(option)}
						>
							<div className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
								selected.includes(option) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
							}`}>
								{selected.includes(option) && <Check className="w-3 h-3 text-white" />}
							</div>
							<span className="text-slate-700">{option}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
};
