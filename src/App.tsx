import React, { useState, useEffect, useMemo } from "react";
import {
	LayoutDashboard,
	FileText,
	Users,
	Box,
	Settings,
	Printer,
	DollarSign,
	Menu,
	X,
	Bot,
	ChevronRight,
	LogOut,
	Shield,
	HardDrive,
} from "lucide-react";
import { LoginPage } from "@/pages/Login";
import { DashboardModule } from "@/modules/Dashboard";
import { OrderModule } from "@/modules/Orders";
import { StockModule } from "@/modules/Stock";
import { PricingModule } from "@/modules/Pricing";
import { ClientsModule } from "@/modules/Clients";
import { ExpensesModule } from "@/modules/Expenses";
import { MachineryModule } from "@/modules/Machinery";
import { AiInsightsModule } from "@/modules/AiInsights";
import { UsersModule } from "@/modules/Users";
import { DatabaseSecurityModule } from "@/modules/DatabaseSecurity";
import { Client, StockItem, Order, PriceRule, Expense, Machine } from "@/types";
import { api } from "@/services/api";
import { LoadingProvider, useLoading } from "@/components/ui/LoadingOverlay";

// ─── Helpers de Auth ─────────────────────────────────────────────────────────
interface JwtUser {
	id: number;
	email: string;
	name: string;
	picture: string;
	exp: number;
}

/** Decodifica o payload do JWT sem verificar assinatura (apenas base64url) */
const decodeToken = (token: string): JwtUser | null => {
	try {
		const payload = token.split(".")[1];
		const decoded = JSON.parse(
			atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
		);
		// Rejeita se já expirou
		if (decoded.exp && decoded.exp * 1000 < Date.now()) return null;
		return decoded as JwtUser;
	} catch {
		return null;
	}
};

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface NavItem {
	id: string;
	icon: React.ElementType;
	label: string;
	group?: string;
}

// ─── App ─────────────────────────────────────────────────────────────────────
const AppInner = () => {
	const loading = useLoading();
	const [user, setUser] = useState<JwtUser | null>(null);
	const [authReady, setAuthReady] = useState(false);

	const [activeTab, setActiveTab] = useState("dashboard");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// Estados de dados
	const [clients, setClients] = useState<Client[]>([]);
	const [stock, setStock] = useState<StockItem[]>([]);
	const [orders, setOrders] = useState<Order[]>([]);
	const [priceTable, setPriceTable] = useState<PriceRule[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [machinery, setMachinery] = useState<(Machine & { id: number })[]>([]);

	// ─── Verifica token na URL (retorno do OAuth) e no localStorage ──────────
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const tokenFromUrl = params.get("token");
		if (tokenFromUrl) {
			localStorage.setItem("a3_token", tokenFromUrl);
			window.history.replaceState({}, "", "/");
		}

		const token = localStorage.getItem("a3_token");
		if (token) {
			const decoded = decodeToken(token);
			if (decoded) {
				setUser(decoded);
			} else {
				localStorage.removeItem("a3_token");
			}
		}
		setAuthReady(true);
	}, []);

	// ─── Carrega dados após autenticado ──────────────────────────────────────
	useEffect(() => {
		if (!user) return;

		const fetchSafe = async (endpoint: string, setter: Function) => {
			try {
				const res = await api.get(endpoint);
				if (res.data) setter(res.data);
			} catch (err) {
				console.error(`Erro ao carregar ${endpoint}:`, err);
			}
		};

		loading.show("Carregando dados do sistema...");
		Promise.all([
			fetchSafe("/clients", setClients),
			fetchSafe("/stock", setStock),
			fetchSafe("/orders", setOrders),
			fetchSafe("/expenses", setExpenses),
			fetchSafe("/pricing", setPriceTable),
			fetchSafe("/machinery", setMachinery),
		]).finally(() => loading.hide());
	}, [user]);

	const handleStockUpdate = () => {
		api.get("/stock").then((res) => setStock(res.data)).catch(console.error);
	};

	const handleLogout = () => {
		localStorage.removeItem("a3_token");
		setUser(null);
	};

	// ─── Contadores do menu (deve ficar ANTES dos returns condicionais) ────────
	const counts = useMemo(() => {
		const openOrders = orders.filter((o) => o.status === "ABERTA").length;
		const lowStock = stock.filter((s) => (s.saldo || 0) <= (s.minimo || 0)).length;
		const limitStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];
		const pendingExpenses = expenses.filter(
			(e) => e.status === "PENDENTE" && e.vencimento <= limitStr
		).length;
		return { orders: openOrders, stock: lowStock, expenses: pendingExpenses };
	}, [orders, stock, expenses]);

	// ─── Telas de carregamento / login ────────────────────────────────────────
	if (!authReady) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-slate-900">
				<div className="w-10 h-10 rounded-full border-[3px] border-indigo-500/30 border-t-indigo-500 animate-spin" />
			</div>
		);
	}

	if (!user) return <LoginPage />;

	// ─── Navegação ────────────────────────────────────────────────────────────
	const navItems: NavItem[] = [
		{ id: "dashboard", icon: LayoutDashboard, label: "Dashboard", group: "Principal" },
		{ id: "ai", icon: Bot, label: "Insights IA", group: "Principal" },
		{ id: "orders", icon: FileText, label: "Ordens", group: "Operacional" },
		{ id: "clients", icon: Users, label: "Clientes", group: "Operacional" },
		{ id: "stock", icon: Box, label: "Estoque", group: "Operacional" },
		{ id: "machinery", icon: Printer, label: "Maquinário", group: "Operacional" },
		{ id: "pricing", icon: Settings, label: "Preços", group: "Configuração" },
		{ id: "expenses", icon: DollarSign, label: "Financeiro", group: "Configuração" },
		{ id: "users", icon: Shield, label: "Usuários", group: "Configuração" },
		{ id: "db-security", icon: HardDrive, label: "Banco de Dados", group: "Configuração" },
	];

	const groups = ["Principal", "Operacional", "Configuração"];

	const getBadge = (id: string) => {
		let count = 0;
		let color = "";
		if (id === "orders") { count = counts.orders; color = "bg-blue-500"; }
		else if (id === "stock") { count = counts.stock; color = "bg-amber-500"; }
		else if (id === "expenses") { count = counts.expenses; color = "bg-red-500"; }
		if (count > 0)
			return (
				<span className={`ml-auto text-[10px] font-bold min-w-[20px] text-center px-1.5 py-0.5 rounded-full ${color} text-white shadow-sm`}>
					{count}
				</span>
			);
		return null;
	};

	const activeLabel = navItems.find((n) => n.id === activeTab)?.label ?? "";

	return (
		<div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">

			{/* ── Mobile Header ── */}
			<div className="md:hidden fixed top-0 w-full z-50 flex items-center justify-between px-4 py-3 bg-slate-900/95 backdrop-blur-md shadow-lg border-b border-slate-800/50">
				<div className="flex items-center gap-2.5">
					<div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 rounded-lg shadow-glow-indigo">
						<Printer className="w-4 h-4 text-white" />
					</div>
					<span className="font-bold text-white text-lg tracking-tight">A3 System</span>
				</div>
				<button
					onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					className="text-slate-300 hover:text-white transition-colors p-2 -mr-2 rounded-lg hover:bg-slate-800/50"
					aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
				>
					{isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
				</button>
			</div>

			{/* ── Sidebar ── */}
			<aside
				className={`fixed inset-y-0 left-0 w-[260px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex flex-col z-40 transform transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] md:translate-x-0 shadow-2xl ${
					isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
				} md:sticky md:top-0 md:h-screen pt-16 md:pt-0`}
			>
				{/* Logo */}
				<div className="hidden md:flex items-center gap-3 px-5 py-6 border-b border-slate-800/60">
					<div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-900/40">
						<Printer className="w-5 h-5 text-white" />
					</div>
					<div>
						<span className="font-bold text-lg text-white tracking-tight block">A3 System</span>
						<span className="text-[11px] text-slate-500 font-medium">Gestão Gráfica</span>
					</div>
				</div>

				{/* Nav */}
				<nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar space-y-5">
					{groups.map((group) => {
						const items = navItems.filter((n) => n.group === group);
						return (
							<div key={group}>
								<p className="text-[10px] font-bold uppercase tracking-widest text-slate-600 px-3 mb-2">
									{group}
								</p>
								<div className="space-y-0.5">
									{items.map((item) => {
										const isActive = activeTab === item.id;
										return (
											<button
												key={item.id}
												onClick={() => {
													setActiveTab(item.id);
													setIsMobileMenuOpen(false);
												}}
												className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
													isActive
														? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-900/30"
														: "text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"
												}`}
											>
												<item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
												<span className="flex-1 text-left">{item.label}</span>
												{getBadge(item.id)}
												{isActive && <ChevronRight className="w-3 h-3 opacity-40" />}
											</button>
										);
									})}
								</div>
							</div>
						);
					})}
				</nav>

				{/* Rodapé — usuário + logout */}
				<div className="px-4 py-4 border-t border-slate-800/60">
					<div className="flex items-center gap-3 mb-3">
						{user.picture ? (
							<img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full border-2 border-slate-700/80 object-cover ring-2 ring-slate-800" />
						) : (
							<div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
								{user.name?.charAt(0)}
							</div>
						)}
						<div className="flex-1 min-w-0">
							<p className="text-[13px] font-semibold text-slate-300 truncate">{user.name}</p>
							<p className="text-[10px] text-slate-500 truncate">{user.email}</p>
						</div>
					</div>
					<button
						onClick={handleLogout}
						className="w-full flex items-center gap-2 text-xs text-slate-500 hover:text-red-400 transition-colors px-3 py-2 rounded-lg hover:bg-red-500/10"
					>
						<LogOut className="w-3.5 h-3.5" /> Sair
					</button>
				</div>
			</aside>

			{/* ── Overlay mobile ── */}
			{isMobileMenuOpen && (
				<div
					className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm animate-fade-in"
					onClick={() => setIsMobileMenuOpen(false)}
				/>
			)}

			{/* ── Conteúdo principal ── */}
			<div className="flex-1 flex flex-col min-h-screen overflow-hidden">
				{/* Topbar desktop */}
				<header className="hidden md:flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/80 flex-shrink-0 sticky top-0 z-10">
					<div>
						<h1 className="text-lg font-bold text-slate-800">{activeLabel}</h1>
						<p className="text-xs text-slate-400 mt-0.5">
							{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
						</p>
					</div>
					<div className="flex items-center gap-3">
						{counts.orders > 0 && (
							<span className="text-xs bg-blue-50 text-blue-600 font-semibold px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
								{counts.orders} OS abertas
							</span>
						)}
						{counts.expenses > 0 && (
							<span className="text-xs bg-red-50 text-red-600 font-semibold px-3 py-1.5 rounded-full border border-red-100 shadow-sm">
								{counts.expenses} contas vencem em breve
							</span>
						)}
						<div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
							{user.picture && (
								<img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full border-2 border-slate-100 object-cover shadow-sm" />
							)}
							<span className="text-sm font-medium text-slate-700 hidden lg:block">{user.name}</span>
						</div>
					</div>
				</header>

				<main className="flex-1 overflow-y-auto p-4 md:p-8 mt-14 md:mt-0">
					<div className="max-w-7xl mx-auto animate-fade-in-up">
						{activeTab === "dashboard" && (
							<DashboardModule orders={orders} expenses={expenses} stock={stock} />
						)}
						{activeTab === "ai" && <AiInsightsModule />}
						{activeTab === "orders" && (
							<OrderModule
								clients={clients}
								priceTable={priceTable}
								orders={orders}
								setOrders={setOrders}
								onStockUpdate={handleStockUpdate}
								machinery={machinery}
								setClients={setClients}
							/>
						)}
						{activeTab === "stock" && (
							<StockModule stock={stock} setStock={setStock} priceTable={priceTable} />
						)}
						{activeTab === "machinery" && (
							<MachineryModule machinery={machinery} setMachinery={setMachinery} stock={stock} />
						)}
						{activeTab === "pricing" && (
							<PricingModule data={priceTable} setData={setPriceTable} />
						)}
						{activeTab === "clients" && (
							<ClientsModule clients={clients} setClients={setClients} />
						)}
						{activeTab === "expenses" && (
							<ExpensesModule expenses={expenses} setExpenses={setExpenses} />
						)}
						{activeTab === "users" && <UsersModule />}
						{activeTab === "db-security" && <DatabaseSecurityModule />}
					</div>
				</main>
			</div>
		</div>
	);
};

const App = () => (
	<LoadingProvider>
		<AppInner />
	</LoadingProvider>
);

export default App;
