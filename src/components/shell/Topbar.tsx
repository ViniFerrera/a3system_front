import React, { useEffect, useRef, useState } from "react";
import { Plus, LogOut, Command } from "lucide-react";
import { Button } from "@/components/ui/Button";

export const Topbar = ({
	title,
	counts,
	user,
	onLogout,
	onNewOrder,
	onGoTo,
	onOpenPalette,
}: {
	title: string;
	counts: { orders: number; stock: number; expenses: number };
	user: { name: string; picture: string; email: string };
	onLogout: () => void;
	onNewOrder: () => void;
	onGoTo: (tab: string) => void;
	onOpenPalette: () => void;
}) => {
	const [menuOpen, setMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Só escuta o documento enquanto o menu está aberto — fechado, não há nada a
	// fechar e o listener seria peso morto em cada clique da aplicação.
	useEffect(() => {
		if (!menuOpen) return;
		const onClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
		};
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setMenuOpen(false);
		};
		document.addEventListener("mousedown", onClickOutside);
		document.addEventListener("keydown", onKeyDown);
		return () => {
			document.removeEventListener("mousedown", onClickOutside);
			document.removeEventListener("keydown", onKeyDown);
		};
	}, [menuOpen]);

	return (
		<header className="hidden md:flex items-center justify-between px-5 lg:px-7 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200/70 flex-shrink-0 sticky top-0 z-20">
			<div className="flex items-baseline gap-2 min-w-0">
				<h1 className="text-sm font-bold text-ink truncate">{title}</h1>
				<span className="text-2xs text-ink-faint hidden lg:inline capitalize">
					{new Date().toLocaleDateString("pt-BR", {
						weekday: "long", day: "2-digit", month: "long",
					})}
				</span>
			</div>

			<div className="flex items-center gap-2">
				{counts.orders > 0 && (
					<button
						type="button"
						onClick={() => onGoTo("orders")}
						className="num text-2xs bg-info-50 text-info-700 font-semibold px-2.5 py-1 rounded-full hover:bg-info-100 transition-colors"
					>
						{counts.orders} OS abertas
					</button>
				)}
				{counts.expenses > 0 && (
					<button
						type="button"
						onClick={() => onGoTo("expenses")}
						className="num text-2xs bg-danger-50 text-danger-700 font-semibold px-2.5 py-1 rounded-full hover:bg-danger-100 transition-colors"
					>
						{counts.expenses} contas vencem em breve
					</button>
				)}

				<button
					type="button"
					onClick={onOpenPalette}
					className="hidden lg:flex items-center gap-1.5 text-2xs text-ink-faint border border-slate-200 rounded-lg px-2.5 h-8 hover:border-slate-300 hover:text-ink-muted transition-colors ml-1"
					aria-label="Abrir paleta de comandos (Ctrl+K)"
					title="Paleta de comandos"
				>
					<Command className="w-3.5 h-3.5" aria-hidden="true" /> Ctrl+K
				</button>

				<Button size="sm" onClick={onNewOrder} icon={<Plus className="w-3.5 h-3.5" />}>
					Nova ordem
				</Button>

				<div className="relative pl-2 ml-1 border-l border-slate-200" ref={menuRef}>
					<button
						type="button"
						onClick={() => setMenuOpen((v) => !v)}
						aria-label="Menu do usuário"
						aria-haspopup="menu"
						aria-expanded={menuOpen}
						className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100 transition-colors"
					>
						{user.picture ? (
							<img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full object-cover border border-slate-200" />
						) : (
							<div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xs font-bold">
								{user.name?.charAt(0)}
							</div>
						)}
						<span className="text-xs font-medium text-ink hidden lg:block">{user.name}</span>
					</button>
					{menuOpen && (
						<div
							role="menu"
							aria-label="Conta"
							className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-elevated py-1.5 animate-scale-in"
						>
							<div className="px-3 py-2 border-b border-slate-100">
								<p className="text-xs font-semibold text-ink truncate">{user.name}</p>
								<p className="text-2xs text-ink-faint truncate">{user.email}</p>
							</div>
							<button
								type="button"
								role="menuitem"
								onClick={onLogout}
								className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink-muted hover:text-danger-600 hover:bg-danger-50 transition-colors"
							>
								<LogOut className="w-3.5 h-3.5" aria-hidden="true" /> Sair
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};
