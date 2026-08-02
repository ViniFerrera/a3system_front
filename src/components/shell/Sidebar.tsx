import React, { useState } from "react";
import { Printer, ChevronRight, ChevronLeft, ChevronDown, LogOut } from "lucide-react";
import { NAV_ITEMS, NAV_GROUPS } from "./navItems";

interface Props {
	activeTab: string;
	onSelect: (id: string) => void;
	collapsed: boolean;
	onToggleCollapse: () => void;
	isMobileOpen: boolean;
	counts: { orders: number; stock: number; expenses: number };
	user: { name: string; email: string; picture: string };
	onLogout: () => void;
}

const BADGE_COLOR: Record<string, string> = {
	orders: "bg-info-500",
	stock: "bg-warning-500",
	expenses: "bg-danger-500",
};

// Configuração nasce recolhida: é o grupo menos usado no dia a dia.
const GRUPOS_PADRAO: Record<string, boolean> = {
	Principal: true,
	Operacional: true,
	"Configuração": false,
};

export const Sidebar = ({
	activeTab, onSelect, collapsed, onToggleCollapse, isMobileOpen, counts, user, onLogout,
}: Props) => {
	const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>(() => {
		try {
			const cru = localStorage.getItem("a3_nav_groups");
			return cru ? { ...GRUPOS_PADRAO, ...JSON.parse(cru) } : GRUPOS_PADRAO;
		} catch {
			return GRUPOS_PADRAO;
		}
	});

	const alternarGrupo = (grupo: string) => {
		setGruposAbertos((prev) => {
			const proximo = { ...prev, [grupo]: !prev[grupo] };
			localStorage.setItem("a3_nav_groups", JSON.stringify(proximo));
			return proximo;
		});
	};

	// Soma dos badges dos filhos — mostrada no cabeçalho quando o grupo está
	// fechado, para um alerta não ficar escondido dentro da sanfona.
	const somaDoGrupo = (grupo: string) =>
		NAV_ITEMS.filter((n) => n.group === grupo).reduce((acc, item) => {
			if (item.id === "orders") return acc + counts.orders;
			if (item.id === "stock") return acc + counts.stock;
			if (item.id === "expenses") return acc + counts.expenses;
			return acc;
		}, 0);

	const badgeFor = (id: string) => {
		const count =
			id === "orders" ? counts.orders : id === "stock" ? counts.stock : id === "expenses" ? counts.expenses : 0;
		if (count <= 0) return null;
		return (
			<span
				className={`num ml-auto text-2xs font-bold min-w-[20px] text-center px-1.5 py-0.5 rounded-full text-white shadow-sm ${BADGE_COLOR[id]}`}
			>
				{count}
			</span>
		);
	};

	// O recolhimento só existe no desktop (o botão que o aciona é `hidden md:flex`).
	// No mobile a sidebar é uma gaveta: se respeitasse `collapsed`, quem tivesse
	// recolhido o menu no desktop abriria no celular uma faixa de 64px sem rótulos.
	const isCollapsed = collapsed && !isMobileOpen;

	const width = isCollapsed ? "w-[64px]" : "w-[220px]";

	return (
		<aside
			className={`fixed inset-y-0 left-0 ${width} bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col z-40 transform transition-[transform,width] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:translate-x-0 shadow-2xl ${
				isMobileOpen ? "translate-x-0" : "-translate-x-full"
			} md:sticky md:top-0 md:h-screen pt-16 md:pt-0`}
		>
			<div className="hidden md:flex items-center gap-3 px-4 py-4 border-b border-slate-800/60">
				<div className="bg-gradient-to-br from-primary-500 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-primary-900/40 flex-shrink-0">
					<Printer className="w-5 h-5 text-white" />
				</div>
				{!isCollapsed && (
					<div className="min-w-0">
						<span className="font-bold text-lg text-white tracking-tight block truncate">A3 System</span>
						<span className="text-2xs text-slate-500 font-medium">Gestão Gráfica</span>
					</div>
				)}
				<button
					type="button"
					onClick={onToggleCollapse}
					className="hidden md:flex ml-auto text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
					aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
					title={collapsed ? "Expandir menu" : "Recolher menu"}
				>
					{collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
				</button>
			</div>

			<nav className="flex-1 px-2.5 py-2 overflow-y-auto custom-scrollbar space-y-1" aria-label="Navegação principal">
				{NAV_GROUPS.map((group) => {
					// Na trilha recolhida todo grupo conta como aberto: do contrário
					// os ícones sumiriam e o menu ficaria inutilizável.
					const aberto = isCollapsed || !!gruposAbertos[group];
					const soma = somaDoGrupo(group);
					return (
						<div key={group}>
							{!isCollapsed && (
								<button
									type="button"
									onClick={() => alternarGrupo(group)}
									aria-expanded={aberto}
									className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-2xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
								>
									<ChevronDown className={`w-3 h-3 transition-transform ${aberto ? "" : "-rotate-90"}`} />
									<span className="flex-1 text-left">{group}</span>
									{!aberto && soma > 0 && (
										<span className="num text-2xs font-bold px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-200">{soma}</span>
									)}
								</button>
							)}
							{aberto && (
								<div className="space-y-0.5">
									{NAV_ITEMS.filter((n) => n.group === group).map((item) => {
										const isActive = activeTab === item.id;
										return (
											<button
												key={item.id}
												type="button"
												onClick={() => onSelect(item.id)}
												title={isCollapsed ? item.label : undefined}
												aria-label={isCollapsed ? item.label : undefined}
												aria-current={isActive ? "page" : undefined}
												className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-full text-sm font-medium transition-all duration-150 group ${
													isCollapsed ? "justify-center" : ""
												} ${
													isActive
														? "bg-slate-950 text-white shadow-lg shadow-black/30"
														: "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
												}`}
											>
												<item.icon
													className={`w-[17px] h-[17px] flex-shrink-0 ${
														isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
													}`}
												/>
												{!isCollapsed && (
													<>
														<span className="flex-1 text-left truncate">{item.label}</span>
														{badgeFor(item.id)}
													</>
												)}
											</button>
										);
									})}
								</div>
							)}
						</div>
					);
				})}
			</nav>

			<div className="px-3 py-3 border-t border-slate-800/60">
				<div className={`flex items-center gap-3 mb-2 ${isCollapsed ? "justify-center" : ""}`}>
					{user.picture ? (
						<img
							src={user.picture}
							alt={user.name}
							className="w-9 h-9 rounded-full border-2 border-slate-700/80 object-cover ring-2 ring-slate-800 flex-shrink-0"
						/>
					) : (
						<div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
							{user.name?.charAt(0)}
						</div>
					)}
					{!isCollapsed && (
						<div className="flex-1 min-w-0">
							<p className="text-xs font-semibold text-slate-300 truncate">{user.name}</p>
							<p className="text-2xs text-slate-500 truncate">{user.email}</p>
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={onLogout}
					className={`w-full flex items-center gap-2 text-xs text-slate-500 hover:text-danger-500 transition-colors px-3 py-2 rounded-lg hover:bg-danger-500/10 ${
						isCollapsed ? "justify-center" : ""
					}`}
					aria-label="Sair"
					title="Sair"
				>
					<LogOut className="w-3.5 h-3.5" aria-hidden="true" />
					{!isCollapsed && "Sair"}
				</button>
			</div>
		</aside>
	);
};
