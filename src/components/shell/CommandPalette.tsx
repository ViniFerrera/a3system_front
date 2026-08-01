import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";
import { NAV_ITEMS } from "./navItems";

export interface Command {
	id: string;
	label: string;
	hint?: string;
	icon: React.ElementType;
	run: () => void;
}

export const CommandPalette = ({
	isOpen,
	onClose,
	onGoTo,
	onNewOrder,
}: {
	isOpen: boolean;
	onClose: () => void;
	onGoTo: (tab: string) => void;
	onNewOrder: () => void;
}) => {
	const [query, setQuery] = useState("");
	const [cursor, setCursor] = useState(0);
	const listRef = useRef<HTMLDivElement>(null);

	const commands = useMemo<Command[]>(() => {
		const navCommands = NAV_ITEMS.map((n) => ({
			id: `nav:${n.id}`,
			label: n.label,
			hint: n.group,
			icon: n.icon,
			run: () => onGoTo(n.id),
		}));
		const actions: Command[] = [
			{
				id: "action:new-order",
				label: "Nova ordem",
				hint: "Ação",
				icon: NAV_ITEMS.find((n) => n.id === "orders")!.icon,
				run: onNewOrder,
			},
		];
		return [...actions, ...navCommands];
	}, [onGoTo, onNewOrder]);

	const results = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) return commands;
		return commands.filter((c) => `${c.label} ${c.hint || ""}`.toLowerCase().includes(q));
	}, [commands, query]);

	useEffect(() => {
		if (isOpen) {
			setQuery("");
			setCursor(0);
		}
	}, [isOpen]);

	useEffect(() => {
		setCursor(0);
	}, [query]);

	// Esc fecha mesmo que o foco tenha saído do campo de busca (clique numa área
	// não focável da paleta devolve o foco ao <body>, fora da árvore de eventos).
	useEffect(() => {
		if (!isOpen) return;
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				onClose();
			}
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [isOpen, onClose]);

	// Devolve o foco a quem abriu a paleta quando ela é apenas dispensada
	// (Esc/clique fora). Se um comando foi executado, o destino é quem manda no
	// foco — restaurar aqui roubaria o foco do modal recém-aberto.
	const executouRef = useRef(false);
	useEffect(() => {
		if (!isOpen) return;
		executouRef.current = false;
		const anterior = document.activeElement as HTMLElement | null;
		return () => {
			if (!executouRef.current) anterior?.focus?.();
		};
	}, [isOpen]);

	// A lista rola (max-h-80); sem isto, as setas movem a seleção para fora da
	// área visível e os últimos itens ficam inalcançáveis pelo teclado.
	useEffect(() => {
		if (!isOpen || results.length === 0) return;
		const item = listRef.current?.children[cursor] as HTMLElement | undefined;
		item?.scrollIntoView?.({ block: "nearest" });
	}, [cursor, isOpen, results.length]);

	if (!isOpen) return null;

	const runAt = (index: number) => {
		const cmd = results[index];
		if (!cmd) return;
		executouRef.current = true;
		cmd.run();
		onClose();
	};

	return (
		<div
			className="fixed inset-0 z-[10002] bg-slate-900/50 backdrop-blur-[3px] flex items-start justify-center pt-[12vh] px-4 animate-fade-in"
			onClick={onClose}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Paleta de comandos"
				className="bg-white w-full max-w-lg rounded-2xl shadow-elevated overflow-hidden animate-scale-in"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center gap-3 px-4 border-b border-slate-100">
					<Search className="w-4 h-4 text-ink-faint flex-shrink-0" aria-hidden="true" />
					<input
						autoFocus
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
							else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
							else if (e.key === "Enter") { e.preventDefault(); runAt(cursor); }
							else if (e.key === "Escape") { e.preventDefault(); onClose(); }
						}}
						placeholder="Buscar módulo ou ação..."
						aria-label="Buscar módulo ou ação"
						role="combobox"
						aria-expanded
						aria-controls="command-palette-list"
						aria-activedescendant={results[cursor] ? `cmd-${results[cursor].id}` : undefined}
						className="flex-1 h-12 text-sm outline-none border-0 focus:ring-0 bg-transparent"
					/>
				</div>
				<div
					id="command-palette-list"
					ref={listRef}
					role="listbox"
					aria-label="Resultados"
					className="max-h-80 overflow-y-auto custom-scrollbar py-1.5"
				>
					{results.length === 0 ? (
						<p className="text-xs text-ink-faint text-center py-6">Nada encontrado</p>
					) : (
						results.map((c, i) => (
							<button
								key={c.id}
								id={`cmd-${c.id}`}
								type="button"
								role="option"
								aria-selected={i === cursor}
								onMouseEnter={() => setCursor(i)}
								onClick={() => runAt(i)}
								className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
									i === cursor ? "bg-primary-50" : "hover:bg-slate-50"
								}`}
							>
								<c.icon className={`w-4 h-4 flex-shrink-0 ${i === cursor ? "text-primary-600" : "text-ink-faint"}`} aria-hidden="true" />
								<span className="text-sm font-medium text-ink flex-1">{c.label}</span>
								{c.hint && <span className="text-2xs text-ink-faint">{c.hint}</span>}
								{i === cursor && <CornerDownLeft className="w-3.5 h-3.5 text-primary-400" aria-hidden="true" />}
							</button>
						))
					)}
				</div>
			</div>
		</div>
	);
};
