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

	useEffect(() => {
		const onClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
		};
		document.addEventListener("mousedown", onClickOutside);
		return () => document.removeEventListener("mousedown", onClickOutside);
	}, []);

	return (
		<header className="hidden md:flex items-center justify-between px-6 lg:px-8 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex-shrink-0 sticky top-0 z-20">
			<div>
				<h1 className="text-lg font-bold text-ink">{title}</h1>
				<p className="text-2xs text-ink-faint mt-0.5">
					{new Date().toLocaleDateString("pt-BR", {
						weekday: "long", day: "2-digit", month: "long", year: "numeric",
					})}
				</p>
			</div>

			<div className="flex items-center gap-2.5">
				{counts.orders > 0 && (
					<button
						onClick={() => onGoTo("orders")}
						className="num text-xs bg-info-50 text-info-700 font-semibold px-3 py-1.5 rounded-full border border-info-100 hover:bg-info-100 transition-colors"
					>
						{counts.orders} OS abertas
					</button>
				)}
				{counts.expenses > 0 && (
					<button
						onClick={() => onGoTo("expenses")}
						className="num text-xs bg-danger-50 text-danger-700 font-semibold px-3 py-1.5 rounded-full border border-danger-100 hover:bg-danger-100 transition-colors"
					>
						{counts.expenses} contas vencem em breve
					</button>
				)}

				<button
					onClick={onOpenPalette}
					className="hidden lg:flex items-center gap-2 text-xs text-ink-faint border border-slate-200 rounded-lg px-3 h-9 hover:border-slate-300 hover:text-ink-muted transition-colors"
					title="Paleta de comandos"
				>
					<Command className="w-3.5 h-3.5" /> Ctrl+K
				</button>

				<Button onClick={onNewOrder} icon={<Plus className="w-4 h-4" />}>
					Nova ordem
				</Button>

				<div className="relative pl-2.5 border-l border-slate-200" ref={menuRef}>
					<button
						onClick={() => setMenuOpen((v) => !v)}
						className="flex items-center gap-2.5 rounded-lg p-1 hover:bg-slate-100 transition-colors"
					>
						{user.picture ? (
							<img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full object-cover border-2 border-slate-100" />
						) : (
							<div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
								{user.name?.charAt(0)}
							</div>
						)}
						<span className="text-sm font-medium text-ink hidden lg:block">{user.name}</span>
					</button>
					{menuOpen && (
						<div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-elevated py-1.5 animate-scale-in">
							<div className="px-3 py-2 border-b border-slate-100">
								<p className="text-xs font-semibold text-ink truncate">{user.name}</p>
								<p className="text-2xs text-ink-faint truncate">{user.email}</p>
							</div>
							<button
								onClick={onLogout}
								className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-ink-muted hover:text-danger-600 hover:bg-danger-50 transition-colors"
							>
								<LogOut className="w-3.5 h-3.5" /> Sair
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};
