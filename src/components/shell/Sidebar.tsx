import React from "react";
import { Printer, ChevronRight, ChevronLeft, LogOut } from "lucide-react";
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

export const Sidebar = ({
	activeTab, onSelect, collapsed, onToggleCollapse, isMobileOpen, counts, user, onLogout,
}: Props) => {
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
	// recolhido o menu no desktop abriria no celular uma faixa de 76px sem rótulos.
	const isCollapsed = collapsed && !isMobileOpen;

	const width = isCollapsed ? "w-[76px]" : "w-[260px]";

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

			<nav aria-label="Módulos" className="flex-1 px-3 py-2 overflow-y-auto custom-scrollbar space-y-2">
				{NAV_GROUPS.map((group) => (
					<div key={group}>
						{!isCollapsed && (
							<p className="text-2xs font-bold uppercase tracking-widest text-slate-600 px-3 mb-1">{group}</p>
						)}
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
										className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 group ${
											isCollapsed ? "justify-center" : ""
										} ${
											isActive
												? "bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-900/30"
												: "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
										}`}
									>
										<item.icon
											className={`w-[18px] h-[18px] flex-shrink-0 ${
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
					</div>
				))}
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
