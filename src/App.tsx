import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { Printer, Menu, X } from "lucide-react";
import { LoginPage } from "@/pages/Login";
import { Client, StockItem, Order, PriceRule, Expense, Machine, Orcamento } from "@/types";
import { api } from "@/services/api";
import { LoadingProvider } from "@/components/ui/LoadingOverlay";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { PageLoader } from "@/components/ui/PageLoader";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { NAV_ITEMS } from "@/components/shell/navItems";
import { ShortcutsDrawer } from "@/components/shortcuts/ShortcutsDrawer";
import { useShortcuts } from "@/hooks/useShortcuts";
import { ACTIONS, OrderFilterPayload, Shortcut } from "@/components/shortcuts/shortcutTypes";

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
const ReportSettingsModule = lazy(() => import("@/modules/ReportSettings").then((m) => ({ default: m.ReportSettingsModule })));

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

	// Ponto único de navegação. Marcar a aba como visitada no MESMO update que a
	// ativa evita um frame com a área de conteúdo vazia (a aba nova ainda não
	// estaria em visitedTabs se isso dependesse de um efeito pós-render).
	// Identidade estável: a Topbar e a paleta recebem esta função como prop.
	const goToTab = useCallback((id: string) => {
		setActiveTab(id);
		setVisitedTabs((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
		setIsMobileMenuOpen(false);
	}, []);

	// Rede de segurança: garante o invariante mesmo se activeTab mudar por outro
	// caminho. Quando a aba já foi visitada o updater devolve o mesmo Set e o
	// React descarta o update sem re-renderizar.
	useEffect(() => {
		setVisitedTabs((prev) => (prev.has(activeTab) ? prev : new Set(prev).add(activeTab)));
	}, [activeTab]);

	// Menu recolhido sobrevive ao recarregamento da página.
	const [sidebarCollapsed, setSidebarCollapsed] = useState(
		() => localStorage.getItem("a3_sidebar_collapsed") === "1"
	);
	const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), []);
	// A persistência vive num efeito: updater de estado tem de ser puro (o React
	// o executa duas vezes em StrictMode e pode reexecutá-lo em modo concorrente).
	useEffect(() => {
		localStorage.setItem("a3_sidebar_collapsed", sidebarCollapsed ? "1" : "0");
	}, [sidebarCollapsed]);

	// Incrementado a cada pedido externo de "nova ordem"; o módulo Ordens observa
	// a mudança de valor e abre o modal. Evita expor a função de abrir o modal.
	const [newOrderSignal, setNewOrderSignal] = useState(0);
	const [paletteOpen, setPaletteOpen] = useState(false);

	const abrirNovaOrdem = useCallback(() => {
		goToTab("orders");
		setNewOrderSignal((n) => n + 1);
	}, [goToTab]);
	const abrirPaleta = useCallback(() => setPaletteOpen(true), []);
	const fecharPaleta = useCallback(() => setPaletteOpen(false), []);

	// ─── Atalhos programáveis (gaveta da borda direita) ──────────────────────
	const { shortcuts, adicionar, remover, mover, cheio } = useShortcuts(user?.email);

	// Sinal genérico de ação por módulo: o módulo alvo observa o nonce e reage.
	const [quickAction, setQuickAction] = useState<{ tab: string; action: string; nonce: number } | null>(null);

	// Filtro vindo de um atalho. O módulo Ordens aplica e o App limpa.
	const [pendingOrderFilter, setPendingOrderFilter] =
		useState<(OrderFilterPayload & { nonce: number }) | null>(null);

	const runShortcut = useCallback(
		(s: Shortcut) => {
			if (s.kind === "module") {
				goToTab(s.target);
				return;
			}
			if (s.kind === "action") {
				const acao = ACTIONS.find((a) => a.id === s.target);
				if (!acao) return;
				goToTab(acao.tab);
				setQuickAction({ tab: acao.tab, action: acao.action, nonce: Date.now() });
				return;
			}
			// Filtro salvo: só navega e entrega o payload. Nada aqui mexe em
			// `newOrderSignal`, então o formulário de ordem não é perturbado.
			if (s.kind === "orderFilter" && s.payload) {
				goToTab("orders");
				setPendingOrderFilter({ ...s.payload, nonce: Date.now() });
			}
		},
		[goToTab]
	);

	// Limpar assim que o módulo aplica é o que permite clicar duas vezes no
	// mesmo atalho: sem isso o nonce repetido não reativaria o efeito de lá.
	const limparFiltroPendente = useCallback(() => setPendingOrderFilter(null), []);

	// A ação "nova ordem" reaproveita o canal que já existe: o módulo Ordens
	// observa `newOrderSignal` e abre o formulário (perguntando antes se há
	// rascunho em jogo).
	useEffect(() => {
		if (quickAction?.tab === "orders" && quickAction.action === "new") {
			setNewOrderSignal((n) => n + 1);
		}
	}, [quickAction?.nonce]);

	// Estados de dados
	const [clients, setClients] = useState<Client[]>([]);
	const [stock, setStock] = useState<StockItem[]>([]);
	const [orders, setOrders] = useState<Order[]>([]);
	const [priceTable, setPriceTable] = useState<PriceRule[]>([]);
	const [expenses, setExpenses] = useState<Expense[]>([]);
	const [machinery, setMachinery] = useState<(Machine & { id: number })[]>([]);
	const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);

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

	// ─── Atalho global da paleta de comandos ─────────────────────────────────
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			// e.key pode vir indefinido em eventos sintéticos de autofill.
			if ((e.ctrlKey || e.metaKey) && typeof e.key === "string" && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setPaletteOpen((v) => !v);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
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
			fetchSafe("/orcamentos", setOrcamentos),
		]).finally(() => setDadosCarregando(false));
	}, [user]);

	// Identidade estável: desce até `updateStatus` em Ordens, que é passado às
	// linhas memoizadas da tabela. Recriado a cada render, derrubava o memo de
	// todas elas a cada mudança de estado do App.
	const handleStockUpdate = useCallback(() => {
		api.get("/stock").then((res) => setStock(res.data)).catch(console.error);
	}, []);

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
			<div className="md:hidden fixed top-0 w-full z-50 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-200/80">
				<div className="flex items-center gap-2.5">
					<div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 rounded-lg">
						<Printer className="w-4 h-4 text-white" />
					</div>
					<span className="font-bold text-ink text-base tracking-tight">A3 System</span>
				</div>
				<button
					onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
					className="text-ink-muted hover:text-ink transition-colors p-2 -mr-2 rounded-lg hover:bg-slate-100"
					aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
				>
					{isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
				</button>
			</div>

			{/* ── Sidebar ── */}
			<Sidebar
				activeTab={activeTab}
				onSelect={goToTab}
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
					onNewOrder={abrirNovaOrdem}
					onGoTo={goToTab}
					onOpenPalette={abrirPaleta}
				/>

				<main className="flex-1 overflow-y-auto p-4 md:p-8 mt-14 md:mt-0">
					<div className="max-w-7xl mx-auto">
						{dadosCarregando ? (
							<PageLoader
								message="Carregando seus dados..."
								hint="Ordens, clientes, estoque, preços, despesas e maquinário."
							/>
						) : (
							// Fallback do chunk da aba: o carregamento dos dados já
							// terminou aqui, só falta o código do módulo chegar.
							<Suspense fallback={<PageLoader message="Abrindo módulo..." />}>
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
										pendingOrderFilter={pendingOrderFilter}
										onPendingFilterApplied={limparFiltroPendente}
										orcamentos={orcamentos}
										setOrcamentos={setOrcamentos}
									/>
								))}
								{painel("stock", <StockModule stock={stock} setStock={setStock} priceTable={priceTable} quickAction={quickAction} />)}
								{painel("machinery", <MachineryModule machinery={machinery} setMachinery={setMachinery} stock={stock} />)}
								{painel("pricing", <PricingModule data={priceTable} setData={setPriceTable} />)}
								{painel("clients", <ClientsModule clients={clients} setClients={setClients} orders={orders} quickAction={quickAction} />)}
								{painel("expenses", <ExpensesModule expenses={expenses} setExpenses={setExpenses} quickAction={quickAction} />)}
								{painel("dre", <DreModule orders={orders} expenses={expenses} />)}
								{painel("estudo", <EstudoModule quickAction={quickAction} />)}
								{painel("nota-fiscal", <NotaFiscalModule orders={orders} quickAction={quickAction} />)}
								{painel("users", <UsersModule />)}
								{painel("db-security", <DatabaseSecurityModule />)}
								{painel("reports", <ReportSettingsModule />)}
							</Suspense>
						)}
					</div>
				</main>
			</div>

			<CommandPalette
				isOpen={paletteOpen}
				onClose={fecharPaleta}
				onGoTo={goToTab}
				onNewOrder={abrirNovaOrdem}
			/>

			<ShortcutsDrawer
				shortcuts={shortcuts}
				onRun={runShortcut}
				onAdd={adicionar}
				onRemove={remover}
				onMove={mover}
				cheio={cheio}
			/>
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
