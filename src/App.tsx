import React, { useState, useEffect, useMemo } from "react";
import { Printer, Menu, X } from "lucide-react";
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
import { NotaFiscalModule } from "@/modules/NotaFiscal";
import { DreModule } from "@/modules/Dre";
import { EstudoModule } from "@/modules/Estudo";
import { Client, StockItem, Order, PriceRule, Expense, Machine } from "@/types";
import { api } from "@/services/api";
import { LoadingProvider, useLoading } from "@/components/ui/LoadingOverlay";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { Sidebar } from "@/components/shell/Sidebar";
import { NAV_ITEMS } from "@/components/shell/navItems";

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

// ─── App ─────────────────────────────────────────────────────────────────────
const AppInner = () => {
	const loading = useLoading();
	const [user, setUser] = useState<JwtUser | null>(null);
	const [authReady, setAuthReady] = useState(false);

	const [activeTab, setActiveTab] = useState("dashboard");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	// Menu recolhido sobrevive ao recarregamento da página.
	const [sidebarCollapsed, setSidebarCollapsed] = useState(
		() => localStorage.getItem("a3_sidebar_collapsed") === "1"
	);
	const toggleSidebar = () => {
		setSidebarCollapsed((prev) => {
			localStorage.setItem("a3_sidebar_collapsed", prev ? "0" : "1");
			return !prev;
		});
	};

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
	const activeLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label ?? "";

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
			<Sidebar
				activeTab={activeTab}
				onSelect={(id) => { setActiveTab(id); setIsMobileMenuOpen(false); }}
				collapsed={sidebarCollapsed}
				onToggleCollapse={toggleSidebar}
				isMobileOpen={isMobileMenuOpen}
				counts={counts}
				user={{ name: user.name, email: user.email, picture: user.picture }}
				onLogout={handleLogout}
			/>

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
					<div className="max-w-7xl mx-auto">
						<div style={{ display: activeTab === "dashboard" ? "block" : "none" }}>
							<DashboardModule orders={orders} expenses={expenses} stock={stock} />
						</div>
						<div style={{ display: activeTab === "ai" ? "block" : "none" }}>
							<AiInsightsModule />
						</div>
						<div style={{ display: activeTab === "orders" ? "block" : "none" }}>
							<OrderModule
								clients={clients}
								priceTable={priceTable}
								orders={orders}
								setOrders={setOrders}
								onStockUpdate={handleStockUpdate}
								machinery={machinery}
								setClients={setClients}
							/>
						</div>
						<div style={{ display: activeTab === "stock" ? "block" : "none" }}>
							<StockModule stock={stock} setStock={setStock} priceTable={priceTable} />
						</div>
						<div style={{ display: activeTab === "machinery" ? "block" : "none" }}>
							<MachineryModule machinery={machinery} setMachinery={setMachinery} stock={stock} />
						</div>
						<div style={{ display: activeTab === "pricing" ? "block" : "none" }}>
							<PricingModule data={priceTable} setData={setPriceTable} />
						</div>
						<div style={{ display: activeTab === "clients" ? "block" : "none" }}>
							<ClientsModule clients={clients} setClients={setClients} />
						</div>
						<div style={{ display: activeTab === "expenses" ? "block" : "none" }}>
							<ExpensesModule expenses={expenses} setExpenses={setExpenses} />
						</div>
						<div style={{ display: activeTab === "dre" ? "block" : "none" }}>
							<DreModule orders={orders} expenses={expenses} />
						</div>
						<div style={{ display: activeTab === "estudo" ? "block" : "none" }}>
							<EstudoModule />
						</div>
						<div style={{ display: activeTab === "nota-fiscal" ? "block" : "none" }}>
							<NotaFiscalModule orders={orders} />
						</div>
						<div style={{ display: activeTab === "users" ? "block" : "none" }}>
							<UsersModule />
						</div>
						<div style={{ display: activeTab === "db-security" ? "block" : "none" }}>
							<DatabaseSecurityModule />
						</div>
					</div>
				</main>
			</div>
		</div>
	);
};

const App = () => (
	<LoadingProvider>
		<ToastProvider>
			<ConfirmProvider>
				<AppInner />
			</ConfirmProvider>
		</ToastProvider>
	</LoadingProvider>
);

export default App;
