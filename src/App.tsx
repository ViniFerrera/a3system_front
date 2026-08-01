import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { Printer, Menu, X } from "lucide-react";
import { LoginPage } from "@/pages/Login";
import { Client, StockItem, Order, PriceRule, Expense, Machine } from "@/types";
import { api } from "@/services/api";
import { LoadingProvider } from "@/components/ui/LoadingOverlay";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { Skeleton, SkeletonTile } from "@/components/ui/Skeleton";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { NAV_ITEMS } from "@/components/shell/navItems";

// ─── Módulos carregados sob demanda ──────────────────────────────────────────
// Cada módulo vira um chunk próprio; só é baixado quando a aba é aberta.
const DashboardModule = lazy(() => import("@/modules/Dashboard").then((m) => ({ default: m.DashboardModule })));
const OrderModule = lazy(() => import("@/modules/Orders").then((m) => ({ default: m.OrderModule })));
const StockModule = lazy(() => import("@/modules/Stock").then((m) => ({ default: m.StockModule })));
const PricingModule = lazy(() => import("@/modules/Pricing").then((m) => ({ default: m.PricingModule })));
const ClientsModule = lazy(() => import("@/modules/Clients").then((m) => ({ default: m.ClientsModule })));
const ExpensesModule = lazy(() => import("@/modules/Expenses").then((m) => ({ default: m.ExpensesModule })));
const MachineryModule = lazy(() => import("@/modules/Machinery").then((m) => ({ default: m.MachineryModule })));
const AiInsightsModule = lazy(() => import("@/modules/AiInsights").then((m) => ({ default: m.AiInsightsModule })));
const UsersModule = lazy(() => import("@/modules/Users").then((m) => ({ default: m.UsersModule })));
const DatabaseSecurityModule = lazy(() => import("@/modules/DatabaseSecurity").then((m) => ({ default: m.DatabaseSecurityModule })));
const NotaFiscalModule = lazy(() => import("@/modules/NotaFiscal").then((m) => ({ default: m.NotaFiscalModule })));
const DreModule = lazy(() => import("@/modules/Dre").then((m) => ({ default: m.DreModule })));
const EstudoModule = lazy(() => import("@/modules/Estudo").then((m) => ({ default: m.EstudoModule })));

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
	const [user, setUser] = useState<JwtUser | null>(null);
	const [authReady, setAuthReady] = useState(false);

	const [activeTab, setActiveTab] = useState("dashboard");
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [dadosCarregando, setDadosCarregando] = useState(true);

	// Abas já abertas ao menos uma vez. Uma vez montado, o módulo não é
	// desmontado — é o que preserva filtros e formulários entre trocas de aba.
	const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set(["dashboard"]));

	useEffect(() => {
		setVisitedTabs((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
	}, [activeTab]);

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

	// Incrementado a cada pedido externo de "nova ordem"; o módulo Ordens observa
	// a mudança de valor e abre o modal. Evita expor a função de abrir o modal.
	const [newOrderSignal, setNewOrderSignal] = useState(0);
	const [paletteOpen, setPaletteOpen] = useState(false);

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

		setDadosCarregando(true);
		Promise.all([
			fetchSafe("/clients", setClients),
			fetchSafe("/stock", setStock),
			fetchSafe("/orders", setOrders),
			fetchSafe("/expenses", setExpenses),
			fetchSafe("/pricing", setPriceTable),
			fetchSafe("/machinery", setMachinery),
		]).finally(() => setDadosCarregando(false));
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

	// Auxiliar — é uma FUNÇÃO chamada, nunca um componente <Panel>. Um componente
	// declarado aqui dentro seria recriado a cada render e o React remontaria o
	// módulo inteiro a cada tecla digitada, destruindo o estado das abas.
	const painel = (id: string, conteudo: React.ReactNode) =>
		visitedTabs.has(id) ? (
			<div key={id} style={{ display: activeTab === id ? "block" : "none" }}>
				{conteudo}
			</div>
		) : null;

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
				<Topbar
					title={activeLabel}
					counts={counts}
					user={{ name: user.name, picture: user.picture, email: user.email }}
					onLogout={handleLogout}
					onNewOrder={() => { setActiveTab("orders"); setNewOrderSignal((n) => n + 1); }}
					onGoTo={setActiveTab}
					onOpenPalette={() => setPaletteOpen(true)}
				/>

				<main className="flex-1 overflow-y-auto p-4 md:p-8 mt-14 md:mt-0">
					<div className="max-w-7xl mx-auto">
						{dadosCarregando ? (
							<div className="space-y-4">
								<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
									{Array.from({ length: 6 }).map((_, i) => <SkeletonTile key={i} />)}
								</div>
								<Skeleton className="h-64 w-full" />
							</div>
						) : (
							<Suspense
								fallback={
									<div className="space-y-4">
										<Skeleton className="h-24 w-full" />
										<Skeleton className="h-64 w-full" />
									</div>
								}
							>
								{painel("dashboard", <DashboardModule orders={orders} expenses={expenses} stock={stock} />)}
								{painel("ai", <AiInsightsModule />)}
								{painel("orders", (
									<OrderModule
										clients={clients}
										priceTable={priceTable}
										orders={orders}
										setOrders={setOrders}
										onStockUpdate={handleStockUpdate}
										machinery={machinery}
										setClients={setClients}
										newOrderSignal={newOrderSignal}
									/>
								))}
								{painel("stock", <StockModule stock={stock} setStock={setStock} priceTable={priceTable} />)}
								{painel("machinery", <MachineryModule machinery={machinery} setMachinery={setMachinery} stock={stock} />)}
								{painel("pricing", <PricingModule data={priceTable} setData={setPriceTable} />)}
								{painel("clients", <ClientsModule clients={clients} setClients={setClients} />)}
								{painel("expenses", <ExpensesModule expenses={expenses} setExpenses={setExpenses} />)}
								{painel("dre", <DreModule orders={orders} expenses={expenses} />)}
								{painel("estudo", <EstudoModule />)}
								{painel("nota-fiscal", <NotaFiscalModule orders={orders} />)}
								{painel("users", <UsersModule />)}
								{painel("db-security", <DatabaseSecurityModule />)}
							</Suspense>
						)}
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
