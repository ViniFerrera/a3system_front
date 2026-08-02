import React, { useState, useMemo, useEffect, useRef } from "react";
import { ChevronDown, Search, AlertCircle } from "lucide-react";
import { Client } from "@/types";

// COMPONENTE SEARCHABLE SELECT (MANTIDO IGUAL)
// Vive em arquivo próprio porque hoje é usado em duas vistas: a barra de
// filtros da lista e o formulário de ordem.
export const SearchableSelect = ({
	options,
	value,
	onChange,
	placeholder = "Selecione...",
	fullClients,
	autoFocus = false,
}: {
	options: { id: number; label: string }[];
	value: number;
	onChange: (val: number) => void;
	placeholder?: string;
	fullClients?: Client[];
	/** Abre a lista já na montagem — o cursor cai direto no campo de busca. */
	autoFocus?: boolean;
}) => {
	// O campo de busca só existe enquanto a lista está aberta; para o foco
	// automático chegar nele, a lista precisa nascer aberta.
	const [isOpen, setIsOpen] = useState(autoFocus);
	const [search, setSearch] = useState("");
	const wrapperRef = useRef<HTMLDivElement>(null);

	const selectedOption = options.find((o) => o.id === value);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const filteredOptions = useMemo(() => {
		const term = search.toLowerCase();
		if (fullClients) {
			return fullClients
				.filter(
					(c) =>
						c.nome.toLowerCase().includes(term) ||
						(c.telefone || "").includes(term)
				)
				.map((c) => ({ id: Number(c.id), label: c.nome }));
		}
		return options.filter((o) => o.label.toLowerCase().includes(term));
	}, [search, options, fullClients]);

	return (
		<div className='relative w-full' ref={wrapperRef}>
			{/* h-9/px-3 espelham o CONTROL do kit (Input/Select): o gatilho fica
			    alinhado com os campos vizinhos em vez de ficar um degrau mais alto. */}
			<div
				className='w-full h-9 px-3 border border-slate-200 rounded-[10px] bg-white text-sm flex justify-between items-center gap-2 cursor-pointer hover:border-slate-300 transition-colors'
				onClick={() => setIsOpen(!isOpen)}
			>
				<span
					className={`truncate ${
						selectedOption ? "text-ink font-medium" : "text-ink-faint"
					}`}
				>
					{selectedOption ? selectedOption.label : placeholder}
				</span>
				<ChevronDown className='w-4 h-4 text-ink-faint flex-shrink-0' />
			</div>
			{isOpen && (
				<div className='absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-[10px] shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100'>
					<div className='p-2 border-b border-slate-200/60 bg-slate-50 sticky top-0'>
						<div className='flex items-center gap-2 bg-white border border-slate-200 rounded-[6px] px-2 py-1.5'>
							<Search className='w-3.5 h-3.5 text-slate-400' />
							<input
								type='text'
								className='w-full text-xs outline-none py-0.5 text-slate-700'
								placeholder='Buscar nome ou telefone...'
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								autoFocus
							/>
						</div>
					</div>
					<div className='overflow-y-auto flex-1 custom-scrollbar'>
						{filteredOptions.length > 0 ? (
							filteredOptions.map((opt) => (
								<div
									key={opt.id}
									className={`px-3 py-2.5 text-sm cursor-pointer border-l-2 border-transparent hover:bg-indigo-50 hover:border-indigo-500 transition-all ${
										opt.id === value
											? "bg-indigo-50 text-indigo-700 font-bold border-indigo-500"
											: "text-slate-600"
									}`}
									onClick={() => {
										onChange(opt.id);
										setIsOpen(false);
										setSearch("");
									}}
								>
									{opt.label}
								</div>
							))
						) : (
							<div className='p-4 text-xs text-slate-400 text-center flex flex-col items-center gap-1'>
								<AlertCircle className='w-4 h-4' />
								Nenhum cliente encontrado.
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
