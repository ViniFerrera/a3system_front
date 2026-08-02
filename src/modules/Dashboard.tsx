import React, { useMemo, useState, useEffect } from "react";
import {
	ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
	ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart,
} from "recharts";
import {
	TrendingUp, Wallet, ArrowDownRight, Filter,
	CheckCircle2, Clock, XCircle, BarChart2, AlertTriangle, Receipt,
	Target, Package, RefreshCw,
} from "lucide-react";
import { Order, Expense, StockItem } from "@/types";
import { Utils } from "@/utils";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { StatTile } from "@/components/ui/StatTile";
import { fetchDashboardMetrics, DashboardMetrics } from "@/services/dashboardMetrics";
import { ServiceMixChart } from "./dashboard/ServiceMixChart";
import { VolumeRevenueChart } from "./dashboard/VolumeRevenueChart";
import { TicketBandsCard } from "./dashboard/TicketBandsCard";
import { ConcentrationCard } from "./dashboard/ConcentrationCard";
import { RetentionCard } from "./dashboard/RetentionCard";

type OrderStatusFilter = "CONCLUIDA" | "ABERTA" | "CANCELADA" | "ALL";
type PeriodPreset = "30d" | "3m" | "6m" | "12m" | "custom";
type BottomPeriod = "7d" | "30d" | "3m" | "6m";

const PIE_COLORS: Record<string, string> = {
	PAGO: "#10b981", PARCIAL: "#f59e0b", NAO_PAGO: "#f43f5e",
};

const paymentLabel: Record<string, string> = {
	PAGO: "Pago", PARCIAL: "Parcial", NAO_PAGO: "Não Pago",
};

const paymentBadge: Record<string, string> = {
	PAGO: "bg-emerald-100 text-emerald-700",
	PARCIAL: "bg-amber-100 text-amber-700",
	NAO_PAGO: "bg-red-100 text-red-600",
};

const CustomTooltip = ({ active, payload, label }: any) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-elevated p-3.5 min-w-[150px]">
			<p className="font-bold text-slate-700 text-xs mb-2">{label}</p>
			{payload.map((p: any, i: number) => (
				<div key={i} className="flex items-center gap-2 mt-1.5">
					<span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
					<span className="text-slate-500 text-xs">{p.name}:</span>
					{/* Séries de contagem não são dinheiro — formatá-las como moeda
					    transformaria "12 pedidos" em "R$ 12,00" na tela. */}
					<span className="font-bold text-slate-800 text-xs ml-auto tabular-nums">
						{p.dataKey === "volume" ? `${Number(p.value)} OS` : Utils.formatCurrency(Number(p.value))}
					</span>
				</div>
			))}
		</div>
	);
};

// ─── Local date string (YYYY-MM-DD) sem conversão UTC ────────────────────────
const toLocalDate = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ─── Compute dates from period preset ────────────────────────────────────────
const periodToDates = (preset: PeriodPreset | BottomPeriod) => {
	const end = new Date();
	const start = new Date();
	if (preset === "7d") start.setDate(end.getDate() - 7);
	else if (preset === "30d") start.setDate(end.getDate() - 30);
	else if (preset === "3m") start.setMonth(end.getMonth() - 3);
	else if (preset === "6m") start.setMonth(end.getMonth() - 6);
	else if (preset === "12m") start.setFullYear(end.getFullYear() - 1);
	return { start: toLocalDate(start), end: toLocalDate(end) };
};

// ─── Componente Principal ─────────────────────────────────────────────────────
export const DashboardModule = ({
	orders, expenses, stock = [],
}: {
	orders: Order[]; expenses: Expense[]; stock?: StockItem[];
}) => {
	const now = new Date();

	// ── Filtros principais ───────────────────────────────────────────────────
	const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("12m");
	const [startDate, setStartDate] = useState(() => periodToDates("12m").start);
	const [endDate, setEndDate] = useState(() => periodToDates("12m").end);
	const [selectedServices, setSelectedServices] = useState<string[]>([]);
	const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string[]>([]);
	const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>("ALL");

	// ── Filtro inferior (gráficos + tabela OS abertas) ───────────────────────
	const [bottomPeriod, setBottomPeriod] = useState<BottomPeriod>("30d");
	const [expandedDashOrder, setExpandedDashOrder] = useState<number | null>(null);
	const bottomDates = useMemo(() => periodToDates(bottomPeriod), [bottomPeriod]);

	// Quando preset muda, atualiza as datas
	useEffect(() => {
		if (periodPreset !== "custom") {
			const { start, end } = periodToDates(periodPreset);
			setStartDate(start);
			setEndDate(end);
		}
	}, [periodPreset]);

	// ── Métricas agregadas (rota do backend) ─────────────────────────────────
	// Alimentam só os blocos novos. Enquanto `metrics` é null cada bloco mostra
	// esqueleto; em erro, aviso discreto — o resto do Dashboard segue normal.
	const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
	const [metricsError, setMetricsError] = useState(false);

	useEffect(() => {
		let cancelado = false;
		setMetricsError(false);
		// Zerar antes de buscar não é detalhe de UI: sem isso, ao trocar de
		// período estes blocos continuariam exibindo os números do período
		// anterior — sem rótulo de período próprio, ninguém perceberia.
		setMetrics(null);
		fetchDashboardMetrics(startDate, endDate)
			.then((data) => { if (!cancelado) setMetrics(data); })
			.catch(() => { if (!cancelado) { setMetrics(null); setMetricsError(true); } });
		return () => { cancelado = true; };
	}, [startDate, endDate]);

	const allServices = useMemo(() => {
		const s = new Set<string>();
		orders.forEach((o) => o.items.forEach((i) => s.add(i.servico)));
		return Array.from(s);
	}, [orders]);

	// ── Helpers ──────────────────────────────────────────────────────────────
	const filterByDate = (dateStr: string, start: string, end: string) => {
		if (!dateStr) return false;
		// Extrai YYYY-MM-DD direto da string, sem converter para Date (evita bug UTC)
		const dateLocal = dateStr.slice(0, 10);
		return (!start || dateLocal >= start) && (!end || dateLocal <= end);
	};

	const calcOrderTotal = (order: Order) => {
		if (selectedServices.length > 0)
			return order.items.reduce((acc, i) => selectedServices.includes(i.servico) ? acc + i.total : acc, 0);
		return order.total;
	};

	// Recorte que NÃO depende da data — o mesmo tem de valer para o período
	// atual e para o anterior, senão a variação compara uma janela filtrada por
	// serviço/pagamento contra outra sem filtro nenhum e o percentual mente.
	// Canceladas nunca contribuem valores — apenas contam no statusCounts.
	const matchesFilters = (o: Order) => {
		if (o.status === "CANCELADA") return false;
		if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return false;
		if (selectedServices.length > 0 && !o.items.some((i) => selectedServices.includes(i.servico))) return false;
		if (selectedPaymentStatus.length > 0 && !selectedPaymentStatus.includes(o.status_pagamento || "NAO_PAGO")) return false;
		return true;
	};

	// ── Dados filtrados (filtro principal) ───────────────────────────────────
	const currentOrders = useMemo(() => orders.filter((o) =>
		matchesFilters(o) && filterByDate(o.data_conclusao || o.data, startDate, endDate)
	), [orders, startDate, endDate, selectedServices, selectedPaymentStatus, orderStatusFilter]);

	const currentExpenses = useMemo(() =>
		expenses.filter((e) => e.status === "PAGO" && filterByDate(e.vencimento, startDate, endDate)),
		[expenses, startDate, endDate]);

	// ── Dados do período anterior (tendência) ────────────────────────────────
	// A janela anterior tem a mesma duração e termina na véspera do início.
	// `new Date("YYYY-MM-DD")` ancora em meia-noite UTC, então o recorte volta
	// com `toISOString()`: os getters locais deslocariam um dia em UTC-3.
	const prevRange = useMemo(() => {
		const dur = new Date(endDate).getTime() - new Date(startDate).getTime() + 86400000;
		const pe = new Date(new Date(startDate).getTime() - 1);
		const ps = new Date(pe.getTime() - dur + 1);
		return { start: ps.toISOString().split("T")[0], end: pe.toISOString().split("T")[0] };
	}, [startDate, endDate]);

	// Mesmo recorte de `currentOrders`, só que na janela anterior. Sem filtro
	// ativo o resultado é idêntico ao de antes (`matchesFilters` e
	// `calcOrderTotal` viram identidade); com filtro, a comparação passa a ser
	// entre iguais.
	const prevOrders = useMemo(() => orders.filter((o) =>
		matchesFilters(o) && filterByDate(o.data_conclusao || o.data, prevRange.start, prevRange.end)
	), [orders, prevRange, selectedServices, selectedPaymentStatus, orderStatusFilter]);

	const prevRevenue = useMemo(() =>
		prevOrders.reduce((acc, o) => acc + calcOrderTotal(o), 0),
		[prevOrders, selectedServices]);

	// ── Status counts ─────────────────────────────────────────────────────────
	const statusCounts = useMemo(() => ({
		concluded: orders.filter((o) => o.status === "CONCLUIDA").length,
		open: orders.filter((o) => o.status === "ABERTA").length,
		cancelled: orders.filter((o) => o.status === "CANCELADA").length,
	}), [orders]);

	// ── KPIs ─────────────────────────────────────────────────────────────────
	const kpis = useMemo(() => {
		const revenue = currentOrders.reduce((acc, o) => acc + calcOrderTotal(o), 0);
		const expense = currentExpenses.reduce((acc, e) => acc + e.valor, 0);
		const profit = revenue - expense;
		const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
		const ticket = currentOrders.length > 0 ? revenue / currentOrders.length : 0;
		const toReceive = orders
			.filter((o) => o.status !== "CANCELADA" && (orderStatusFilter === "ALL" || o.status === orderStatusFilter) && filterByDate(o.data_conclusao || o.data, startDate, endDate) && (o.status_pagamento || "NAO_PAGO") !== "PAGO")
			.reduce((acc, o) => acc + o.total, 0);
		const revTrend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : undefined;
		// Volume e ticket do período anterior, para as variações dos tiles novos.
		const volTrend = prevOrders.length > 0
			? ((currentOrders.length - prevOrders.length) / prevOrders.length) * 100
			: undefined;
		const prevTicket = prevOrders.length > 0
			? prevOrders.reduce((a, o) => a + calcOrderTotal(o), 0) / prevOrders.length
			: 0;
		const ticketTrend = prevTicket > 0 ? ((ticket - prevTicket) / prevTicket) * 100 : undefined;
		return { revenue, expense, profit, margin, ticket, toReceive, revTrend, volTrend, ticketTrend };
	}, [currentOrders, currentExpenses, prevRevenue, prevOrders, orders, startDate, endDate, orderStatusFilter, selectedServices]);

	// ── Gráfico Mensal (dinâmico baseado no período) ──────────────────────────
	const monthlyData = useMemo(() => {
		const months = new Map<string, { name: string; receita_concluida: number; receita_aberta: number; despesa: number; lucro: number; volume: number }>();
		let curr = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), 1);
		const end = new Date(endDate);
		while (curr <= end) {
			const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}`;
			const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
			const label = `${monthNames[curr.getMonth()]}/${String(curr.getFullYear()).slice(2)}`;
			months.set(key, { name: label, receita_concluida: 0, receita_aberta: 0, despesa: 0, lucro: 0, volume: 0 });
			curr.setMonth(curr.getMonth() + 1);
		}
		orders.forEach((o) => {
			if (o.status === "CANCELADA") return;
			if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return;
			const key = (o.data_conclusao || o.data || "").slice(0, 7);
			const entry = months.get(key);
			if (!entry) return;
			if (selectedPaymentStatus.length > 0 && !selectedPaymentStatus.includes(o.status_pagamento || "NAO_PAGO")) return;
			const val = (selectedServices.length === 0 || o.items.some((i) => selectedServices.includes(i.servico))) ? calcOrderTotal(o) : 0;
			if (val <= 0) return;
			// Conta o pedido no mesmo ponto em que a receita entra, para volume e
			// receita do mês nunca falarem de conjuntos diferentes de OS.
			entry.volume += 1;
			if (o.status === "CONCLUIDA") entry.receita_concluida += val;
			else entry.receita_aberta += val;
		});
		expenses.filter((e) => e.status === "PAGO").forEach((e) => {
			const key = (e.vencimento || "").slice(0, 7);
			const entry = months.get(key);
			if (entry) entry.despesa += e.valor;
		});
		return Array.from(months.values()).map((d) => ({
			...d,
			receita: d.receita_concluida + d.receita_aberta,
			lucro: d.receita_concluida + d.receita_aberta - d.despesa,
		}));
	}, [orders, expenses, selectedServices, selectedPaymentStatus, orderStatusFilter, startDate, endDate]);

	// ── Volume × Receita (mesmo recorte do gráfico mensal) ───────────────────
	const volumeReceitaData = useMemo(
		() => monthlyData.map((m) => ({
			name: m.name,
			receita: m.receita_concluida + m.receita_aberta,
			volume: m.volume,
		})),
		[monthlyData]
	);

	// ── Sparklines dos KPIs (derivados do mesmo array do gráfico mensal) ──────
	const sparks = useMemo(() => ({
		receita: monthlyData.map((m) => m.receita_concluida + m.receita_aberta),
		despesa: monthlyData.map((m) => m.despesa),
		lucro: monthlyData.map((m) => m.lucro),
	}), [monthlyData]);

	// ── Dados do filtro inferior ──────────────────────────────────────────────
	const bottomOrders = useMemo(() => orders.filter((o) => {
		if (o.status === "CANCELADA") return false;
		if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return false;
		return filterByDate(o.data_conclusao || o.data, bottomDates.start, bottomDates.end);
	}), [orders, bottomDates, orderStatusFilter]);

	// ── Gráfico Diário ────────────────────────────────────────────────────────
	const dailyData = useMemo(() => {
		const daysMap = new Map<string, { receita: number; volume: number }>();
		bottomOrders.forEach((o) => {
			const key = (o.data_conclusao || o.data || "").slice(0, 10);
			const cur = daysMap.get(key) || { receita: 0, volume: 0 };
			daysMap.set(key, { receita: cur.receita + o.total, volume: cur.volume + 1 });
		});
		const s = new Date(bottomDates.start);
		const e = new Date(bottomDates.end);
		const result = [];
		let c = new Date(s);
		while (c <= e) {
			const key = toLocalDate(c);
			const val = daysMap.get(key) || { receita: 0, volume: 0 };
			result.push({ date: c.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), ...val });
			c.setDate(c.getDate() + 1);
		}
		return result.length > 31 ? result.filter((_, i) => i % Math.ceil(result.length / 30) === 0) : result;
	}, [bottomOrders, bottomDates]);

	// ── Dia da Semana ─────────────────────────────────────────────────────────
	const dayOfWeekData = useMemo(() => {
		const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
		const map = new Map<number, { revenue: number; count: number }>();
		days.forEach((_, i) => map.set(i, { revenue: 0, count: 0 }));
		bottomOrders.forEach((o) => {
			const ds = (o.data_conclusao || o.data || "").slice(0, 10);
			const [yy, mm, dd] = ds.split("-").map(Number);
			const day = new Date(yy, mm - 1, dd).getDay();
			const cur = map.get(day)!;
			map.set(day, { revenue: cur.revenue + o.total, count: cur.count + 1 });
		});
		return days.map((name, i) => ({ name, ...map.get(i)! }));
	}, [bottomOrders]);
	const maxDayRevenue = Math.max(...dayOfWeekData.map((d) => d.revenue), 1);

	// ── Top Serviços / Clientes ───────────────────────────────────────────────
	const topServices = useMemo(() => {
		// `volume` conta OS distintas, não quantidade de itens: um pedido com duas
		// linhas do mesmo serviço é um pedido só, e "5000 pedidos" para 5000 folhas
		// seria rótulo mentiroso na tela. A receita continua idêntica à de antes.
		const map = new Map<string, { revenue: number; pedidos: Set<string> }>();
		currentOrders.forEach((o) => o.items.forEach((i) => {
			if (selectedServices.length === 0 || selectedServices.includes(i.servico)) {
				const cur = map.get(i.servico) || { revenue: 0, pedidos: new Set<string>() };
				cur.revenue += (i.total || 0);
				cur.pedidos.add(String(o.id ?? `${o.cliente_nome}|${o.data}`));
				map.set(i.servico, cur);
			}
		}));
		return Array.from(map.entries())
			.map(([name, v]) => ({ name, revenue: v.revenue, volume: v.pedidos.size }))
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, 6);
	}, [currentOrders, selectedServices]);

	// Ticket médio por serviço = receita do serviço ÷ OS que o contêm.
	const serviceMix = useMemo(
		() => topServices.map((s) => ({
			name: s.name,
			revenue: s.revenue,
			volume: s.volume,
			ticket: s.volume > 0 ? s.revenue / s.volume : 0,
		})),
		[topServices]
	);

	const topClients = useMemo(() => {
		const map = new Map<string, { volume: number; revenue: number }>();
		currentOrders.forEach((o) => {
			const cur = map.get(o.cliente_nome) || { volume: 0, revenue: 0 };
			map.set(o.cliente_nome, { volume: cur.volume + 1, revenue: cur.revenue + calcOrderTotal(o) });
		});
		return Array.from(map.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 7);
	}, [currentOrders]);
	const maxClientRevenue = topClients[0]?.revenue || 1;

	// ── Distribuição de Pagamento ─────────────────────────────────────────────
	const paymentDist = useMemo(() => {
		const map = new Map([["PAGO", 0], ["PARCIAL", 0], ["NAO_PAGO", 0]]);
		currentOrders.forEach((o) => {
			const s = o.status_pagamento || "NAO_PAGO";
			map.set(s, (map.get(s) || 0) + calcOrderTotal(o));
		});
		return Array.from(map.entries()).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);
	}, [currentOrders]);

	// ── Alertas ───────────────────────────────────────────────────────────────
	const stockAlerts = useMemo(() => stock.filter((s) => (s.saldo || 0) <= (s.minimo || 0)), [stock]);
	const upcomingExpenses = useMemo(() => {
		const today = new Date();
		const in7 = new Date(today.getTime() + 7 * 86400000);
		return expenses.filter((e) => e.status === "PENDENTE" && new Date(e.vencimento) <= in7)
			.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()).slice(0, 5);
	}, [expenses]);

	// ── Ordens Abertas (tabela) ───────────────────────────────────────────────
	const openOrders = useMemo(() =>
		orders.filter((o) => o.status === "ABERTA")
			.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
			.slice(0, 10),
		[orders]);

	// ── UI helpers ────────────────────────────────────────────────────────────
	const fmt = Utils.formatCurrency;
	const periodPresets: { key: PeriodPreset; label: string }[] = [
		{ key: "30d", label: "30 dias" },
		{ key: "3m", label: "3 meses" },
		{ key: "6m", label: "6 meses" },
		{ key: "12m", label: "12 meses" },
		{ key: "custom", label: "Personalizado" },
	];
	const bottomPresets: { key: BottomPeriod; label: string }[] = [
		{ key: "7d", label: "7 dias" },
		{ key: "30d", label: "30 dias" },
		{ key: "3m", label: "3 meses" },
		{ key: "6m", label: "6 meses" },
	];
	const statusButtons = [
		{ key: "CONCLUIDA" as const, label: "Concluídas", icon: <CheckCircle2 className="w-3.5 h-3.5" />, active: "bg-emerald-500 text-white border-emerald-500", inactive: "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50", count: statusCounts.concluded },
		{ key: "ABERTA" as const, label: "Em Aberto", icon: <Clock className="w-3.5 h-3.5" />, active: "bg-blue-500 text-white border-blue-500", inactive: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50", count: statusCounts.open },
		{ key: "CANCELADA" as const, label: "Canceladas", icon: <XCircle className="w-3.5 h-3.5" />, active: "bg-slate-600 text-white border-slate-600", inactive: "bg-white text-slate-500 border-slate-200 hover:bg-slate-50", count: statusCounts.cancelled },
		{ key: "ALL" as const, label: "Todas", icon: <BarChart2 className="w-3.5 h-3.5" />, active: "bg-indigo-500 text-white border-indigo-500", inactive: "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50", count: orders.length },
	];

	return (
		<div className="space-y-5 pb-20 md:pb-0 animate-fade-in-up">

			{/* ── Status Tabs ── */}
			<div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
				{statusButtons.map((btn) => (
					<button key={btn.key} onClick={() => setOrderStatusFilter(btn.key)}
						className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border font-semibold text-xs transition-all duration-150 shadow-sm ${orderStatusFilter === btn.key ? btn.active + " shadow-md" : btn.inactive}`}
					>
						{btn.icon}{btn.label}
						<span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-2xs font-bold ${orderStatusFilter === btn.key ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{btn.count}</span>
					</button>
				))}
			</div>

			{/* ── Barra de Filtros ── */}
			<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-3 sm:p-4">
				<div className="flex flex-wrap items-end gap-3">
					<div className="flex flex-wrap items-center gap-2">
						<span className="flex items-center gap-1.5 text-ink-faint font-bold text-xs uppercase tracking-wide mr-1">
							<Filter className="w-3.5 h-3.5 text-primary-400" /> Período
						</span>
						{periodPresets.map((p) => (
							<button key={p.key} onClick={() => setPeriodPreset(p.key)}
								className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${periodPreset === p.key ? "bg-primary-600 text-white border-primary-600 shadow-sm" : "bg-white text-ink-muted border-slate-200 hover:border-primary-300 hover:text-primary-600"}`}
							>{p.label}</button>
						))}
					</div>

					<div className="w-40">
						<label className="text-2xs font-bold text-ink-faint uppercase mb-1 block">Pagamento</label>
						<MultiSelect options={["PAGO", "PARCIAL", "NAO_PAGO"]} selected={selectedPaymentStatus} onChange={setSelectedPaymentStatus} placeholder="Todos" />
					</div>
					<div className="w-48">
						<label className="text-2xs font-bold text-ink-faint uppercase mb-1 block">Serviços</label>
						<MultiSelect options={allServices} selected={selectedServices} onChange={setSelectedServices} placeholder="Todos" />
					</div>
					<button
						onClick={() => { setPeriodPreset("12m"); setSelectedServices([]); setSelectedPaymentStatus([]); setOrderStatusFilter("ALL"); }}
						className="flex items-center gap-1.5 text-xs font-semibold text-ink-faint hover:text-danger-500 px-3 py-2 rounded-xl hover:bg-danger-50 transition-all"
					>
						<RefreshCw className="w-3 h-3" /> Limpar
					</button>
				</div>

				{periodPreset === "custom" && (
					<div className="flex flex-wrap gap-3 items-end mt-3 pt-3 border-t border-slate-100">
						<div className="w-full sm:w-36">
							<label className="text-2xs font-bold text-ink-faint uppercase mb-1 block">Início</label>
							<input type="date" className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-400 outline-none bg-surface-sunken" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
						</div>
						<div className="w-full sm:w-36">
							<label className="text-2xs font-bold text-ink-faint uppercase mb-1 block">Fim</label>
							<input type="date" className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-primary-400 outline-none bg-surface-sunken" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
						</div>
					</div>
				)}
			</div>

			{/* ── KPI Cards ── */}
			{/* Os gradientes de `accent` são literais de propósito: o Tailwind varre
			    o código estaticamente e classe montada por concatenação não vira CSS. */}
			<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
				<StatTile label="Volume de OS" value={String(currentOrders.length)} sub={`${statusCounts.open} em aberto`} icon={<Target className="w-4 h-4" />}
					accent="from-violet-500 to-purple-600" sparkColor="#8b5cf6" trend={kpis.volTrend} />
				<StatTile label="Receita" value={fmt(kpis.revenue)} sub="no período" icon={<TrendingUp className="w-4 h-4" />}
					accent="from-emerald-400 to-emerald-600" sparkColor="#10b981" trend={kpis.revTrend} spark={sparks.receita} />
				<StatTile label="Despesas" value={fmt(kpis.expense)} sub="pagas no período" icon={<ArrowDownRight className="w-4 h-4" />}
					accent="from-rose-400 to-rose-600" sparkColor="#f43f5e" spark={sparks.despesa} />
				<StatTile label="Lucro Líquido" value={fmt(kpis.profit)} sub={`Margem: ${kpis.margin.toFixed(1)}%`} icon={<Wallet className="w-4 h-4" />}
					accent={kpis.profit >= 0 ? "from-primary-500 to-violet-600" : "from-orange-500 to-red-600"} sparkColor="#6366f1" spark={sparks.lucro} />
				<StatTile label="Ticket Médio" value={fmt(kpis.ticket)} sub="por ordem" icon={<Receipt className="w-4 h-4" />}
					accent="from-sky-400 to-sky-600" sparkColor="#0ea5e9" trend={kpis.ticketTrend} />
			</div>

			{/* ── Aviso discreto: só os blocos de métricas agregadas dependem da rota ── */}
			{metricsError && (
				<div className="flex items-center gap-2 text-2xs text-warning-700 bg-warning-50 border border-warning-200 rounded-xl px-3 py-2">
					<AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
					Não foi possível carregar as análises agregadas (faixas, concentração e retenção). O restante do painel segue atualizado.
				</div>
			)}

			{/* ── Fluxo Mensal + Distribuição Pagamento ── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
				<div className="lg:col-span-2 bg-white border border-slate-200/60 rounded-2xl shadow-card p-4 sm:p-6">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-5 gap-2">
						<div>
							<h4 className="text-sm sm:text-base font-bold text-slate-800">Fluxo de Caixa Mensal</h4>
							<p className="text-2xs sm:text-xs text-slate-400 mt-0.5">
								{Utils.formatDate(startDate)} → {Utils.formatDate(endDate)}
							</p>
						</div>
						<div className="flex flex-wrap gap-2 sm:gap-3 text-2xs sm:text-2xs font-semibold text-slate-500">
							<span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded bg-emerald-400 inline-block" />Concluídas</span>
							<span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded bg-amber-300 inline-block" />Abertas</span>
							<span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded bg-rose-400 inline-block" />Despesa</span>
							<span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-500 inline-block" />Lucro</span>
							<span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-violet-400 inline-block" />Pedidos</span>
						</div>
					</div>
					<ResponsiveContainer width="100%" height={200}>
						<ComposedChart data={monthlyData} margin={{ left: -5, right: 10 }}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
							<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
							{/* Toda série precisa de `yAxisId`: sem isso o Recharts joga reais e
							    contagem de pedidos na mesma escala e o gráfico muda de forma. */}
							<YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
							<YAxis yAxisId="vol" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#c4b5fd", fontSize: 11 }} />
							<Tooltip content={<CustomTooltip />} />
							<Bar yAxisId="left" dataKey="receita_concluida" name="Concluídas" stackId="receita" fill="#34d399" barSize={16} />
							<Bar yAxisId="left" dataKey="receita_aberta" name="Abertas" stackId="receita" fill="#fbbf24" radius={[5, 5, 0, 0]} barSize={16} />
							<Bar yAxisId="left" dataKey="despesa" name="Despesa" fill="#fb7185" radius={[5, 5, 0, 0]} barSize={16} />
							<Line yAxisId="left" type="monotone" dataKey="lucro" name="Lucro" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} />
							<Line yAxisId="vol" type="monotone" dataKey="volume" name="Pedidos" stroke="#a78bfa" strokeWidth={2} strokeDasharray="4 3" dot={false} />
						</ComposedChart>
					</ResponsiveContainer>
				</div>

				<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-6 flex flex-col">
					<h4 className="text-base font-bold text-slate-800">Status de Pagamento</h4>
					<p className="text-xs text-slate-400 mt-0.5 mb-4">Distribuição do período</p>
					{paymentDist.length > 0 ? (
						<>
							<ResponsiveContainer width="100%" height={155}>
								<PieChart>
									<Pie data={paymentDist} cx="50%" cy="50%" innerRadius={48} outerRadius={70} dataKey="value" paddingAngle={4}>
										{paymentDist.map((e) => <Cell key={e.name} fill={PIE_COLORS[e.name] || "#94a3b8"} />)}
									</Pie>
									<Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: "12px" }} />
								</PieChart>
							</ResponsiveContainer>
							<div className="space-y-2.5 mt-2">
								{paymentDist.map((d) => {
									const count = currentOrders.filter((o) => (o.status_pagamento || "NAO_PAGO") === d.name).length;
									const pct = currentOrders.length > 0 ? ((count / currentOrders.length) * 100).toFixed(0) : "0";
									return (
										<div key={d.name} className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[d.name] }} />
												<span className="text-xs font-semibold text-slate-600">{paymentLabel[d.name]}</span>
												<span className="text-2xs text-slate-400">{count} OS</span>
											</div>
											<div className="flex items-center gap-2">
												<span className="text-2xs text-slate-400">{pct}%</span>
												<span className="text-xs font-bold text-slate-700">{fmt(d.value)}</span>
											</div>
										</div>
									);
								})}
							</div>
						</>
					) : (
						<div className="flex-1 flex items-center justify-center text-slate-300 text-sm">Sem dados no período</div>
					)}
				</div>
			</div>

			{/* ── Mix por serviço + Volume × Receita ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<ServiceMixChart data={serviceMix} />
				<VolumeRevenueChart data={volumeReceitaData} />
			</div>

			{/* ── Faixas de ticket + Concentração de clientes ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<TicketBandsCard metrics={metrics} />
				<ConcentrationCard metrics={metrics} />
			</div>

			{/* ── Retenção + Top Clientes ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<RetentionCard metrics={metrics} />

				<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-6">
					<h4 className="text-base font-bold text-slate-800">Top Clientes</h4>
					<p className="text-xs text-slate-400 mt-0.5 mb-4">Ranking por receita</p>
					{topClients.length > 0 ? (
						<div className="space-y-3.5">
							{topClients.map((c, i) => (
								<div key={c.name} className="flex items-center gap-3">
									<span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700/70" : "text-slate-300"}`}>{i + 1}</span>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between mb-1">
											<span className="text-xs font-semibold text-slate-700 truncate pr-2">{c.name}</span>
											{/* Volume ao lado da receita: o ranking passa a mostrar os dois. */}
											<span className="flex items-baseline gap-2 flex-shrink-0">
												<span className="num text-2xs text-ink-faint">{c.volume} OS</span>
												<span className="text-xs font-bold text-slate-800">{fmt(c.revenue)}</span>
											</span>
										</div>
										<div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
											<div className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full" style={{ width: `${(c.revenue / maxClientRevenue) * 100}%` }} />
										</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="h-[220px] flex items-center justify-center text-slate-300 text-sm">Sem dados no período</div>
					)}
				</div>
			</div>

			{/* ══ SEÇÃO INFERIOR — filtro próprio ══ */}
			<div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
				<div className="flex flex-wrap items-center gap-2">
					<span className="text-xs font-bold text-indigo-600 uppercase tracking-wide mr-1">Visão Operacional —</span>
					{bottomPresets.map((p) => (
						<button key={p.key} onClick={() => setBottomPeriod(p.key)}
							className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${bottomPeriod === p.key ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-indigo-500 border-indigo-200 hover:border-indigo-400"}`}
						>{p.label}</button>
					))}
					<span className="text-xs text-indigo-400 ml-2">
						{Utils.formatDate(bottomDates.start)} → {Utils.formatDate(bottomDates.end)}
					</span>
				</div>
			</div>

			{/* ── Evolução Diária ── */}
			<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-4 sm:p-6">
				<h4 className="text-sm sm:text-base font-bold text-slate-800">Evolução Diária de Receita</h4>
				<p className="text-2xs sm:text-xs text-slate-400 mt-0.5 mb-4 sm:mb-5">Faturamento dia a dia nos últimos {bottomPeriod === "7d" ? "7 dias" : bottomPeriod === "30d" ? "30 dias" : bottomPeriod === "3m" ? "3 meses" : "6 meses"}</p>
				<ResponsiveContainer width="100%" height={180}>
					<AreaChart data={dailyData} margin={{ left: -10, right: 10 }}>
						<defs>
							<linearGradient id="receitaGrad" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
								<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
						<XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} interval="preserveStartEnd" />
						<YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
						<Tooltip content={<CustomTooltip />} />
						<Area type="monotone" dataKey="receita" name="Receita" stroke="#6366f1" strokeWidth={2.5} fill="url(#receitaGrad)" dot={false} activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 0 }} />
					</AreaChart>
				</ResponsiveContainer>
			</div>

			{/* ── Dia da Semana + Alertas ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
				<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-4 sm:p-6">
					<h4 className="text-sm sm:text-base font-bold text-slate-800">Receita por Dia da Semana</h4>
					<p className="text-2xs sm:text-xs text-slate-400 mt-0.5 mb-3 sm:mb-4">
						Melhor dia:{" "}
						<span className="text-indigo-600 font-bold">
							{dayOfWeekData.reduce((best, d) => d.revenue > best.revenue ? d : best, dayOfWeekData[0])?.name || "—"}
						</span>
					</p>
					<ResponsiveContainer width="100%" height={160}>
						<BarChart data={dayOfWeekData} margin={{ left: -20, right: 5 }}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
							<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
							<YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
							<Tooltip content={<CustomTooltip />} />
							<Bar dataKey="revenue" name="Receita" radius={[6, 6, 0, 0]} barSize={30}>
								{dayOfWeekData.map((d, i) => (
									<Cell key={i} fill={d.revenue === maxDayRevenue && maxDayRevenue > 0 ? "#6366f1" : "#e2e8f0"} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
					{/* O gráfico segue igual — só ganhou a contagem ao lado do valor. */}
					<div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
						{dayOfWeekData.map((d) => (
							<div key={d.name} className="flex items-center justify-between text-xs">
								<span className="font-semibold text-ink-muted">{d.name}</span>
								<span className="num text-2xs text-ink-faint">
									{d.count} OS · {fmt(d.revenue)}
								</span>
							</div>
						))}
					</div>
				</div>

				<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-4 sm:p-6">
					<h4 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
						<AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas
					</h4>
					<p className="text-2xs sm:text-xs text-slate-400 mt-0.5 mb-3 sm:mb-4">Contas e estoque que precisam de atenção</p>
					<div className="space-y-2">
						{upcomingExpenses.length === 0 && stockAlerts.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-6 text-slate-300">
								<CheckCircle2 className="w-7 h-7 mb-2 text-emerald-300" />
								<p className="text-sm font-semibold text-emerald-400">Tudo em dia!</p>
							</div>
						) : (
							<>
								{upcomingExpenses.map((e) => {
									const overdue = new Date(e.vencimento) < new Date();
									return (
										<div key={e.id} className={`flex items-center justify-between p-2.5 rounded-xl border ${overdue ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
											<div className="flex items-center gap-2 min-w-0">
												<Receipt className={`w-3.5 h-3.5 flex-shrink-0 ${overdue ? "text-red-500" : "text-amber-500"}`} />
												<div className="min-w-0">
													<p className="text-xs font-semibold text-slate-700 truncate">{e.produto}</p>
													<p className={`text-2xs ${overdue ? "text-red-500 font-bold" : "text-amber-600"}`}>{overdue ? "⚠ Vencida" : "Vence"} {Utils.formatDate(e.vencimento)}</p>
												</div>
											</div>
											<span className={`text-xs font-bold ml-2 flex-shrink-0 ${overdue ? "text-red-600" : "text-amber-700"}`}>{fmt(e.valor)}</span>
										</div>
									);
								})}
								{stockAlerts.slice(0, 3).map((s) => (
									<div key={s.id} className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50 border border-rose-100">
										<div className="flex items-center gap-2 min-w-0">
											<Package className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
											<div>
												<p className="text-xs font-semibold text-slate-700 truncate">{s.nome}</p>
												<p className="text-2xs text-rose-500">Saldo: {s.saldo} {s.unidade} (mín: {s.minimo})</p>
											</div>
										</div>
										<span className="text-2xs font-bold text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">Crítico</span>
									</div>
								))}
							</>
						)}
					</div>
				</div>
			</div>

			{/* ── Tabela: Últimas Ordens Abertas ── */}
			<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-4 sm:p-6">
				<div className="flex items-center justify-between mb-3 sm:mb-4">
					<div>
						<h4 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
							<Clock className="w-4 h-4 text-blue-500" /> Ordens em Aberto
						</h4>
						<p className="text-2xs sm:text-xs text-slate-400 mt-0.5">{openOrders.length} OS pendentes de conclusão</p>
					</div>
				</div>
				{openOrders.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-8 text-slate-300">
						<CheckCircle2 className="w-7 h-7 mb-2 text-emerald-300" />
						<p className="text-sm font-semibold text-emerald-400">Nenhuma ordem em aberto!</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-200/60">
									<th className="text-left text-2xs font-bold text-slate-500 uppercase tracking-wide pb-2.5 pr-4">#OS</th>
									<th className="text-left text-2xs font-bold text-slate-500 uppercase tracking-wide pb-2.5 pr-4">Cliente</th>
									<th className="text-left text-2xs font-bold text-slate-500 uppercase tracking-wide pb-2.5 pr-4 hidden md:table-cell">Data</th>
									<th className="text-left text-2xs font-bold text-slate-500 uppercase tracking-wide pb-2.5 pr-4 hidden lg:table-cell">Serviços</th>
									<th className="text-left text-2xs font-bold text-slate-500 uppercase tracking-wide pb-2.5 pr-4">Pagamento</th>
									<th className="text-right text-2xs font-bold text-slate-500 uppercase tracking-wide pb-2.5">Valor</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-50">
								{openOrders.map((o) => {
									const isExp = expandedDashOrder === o.id;
									const safeClient = o.cliente_nome.replace(/[<>:"/\\|?*]/g, "").trim().replace(/\s+/g, "_");
									const dateStr = o.data ? o.data.split("T")[0] : "";
									const fmtDate = (() => { const d = new Date(o.data); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")} - ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`; })();
									return (
										<React.Fragment key={o.id}>
											<tr className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExp ? "bg-indigo-50/40" : ""}`} onClick={() => setExpandedDashOrder(isExp ? null : o.id!)}>
												<td className="py-2.5 pr-4 font-bold text-indigo-600 text-xs">#{o.id}</td>
												<td className="py-2.5 pr-4">
													<span className="font-semibold text-slate-700 text-xs truncate max-w-[150px] block">{o.cliente_nome}</span>
												</td>
												<td className="py-2.5 pr-4 text-xs text-slate-400 hidden md:table-cell">{fmtDate}</td>
												<td className="py-2.5 pr-4 hidden lg:table-cell">
													<span className="text-xs text-slate-500 truncate max-w-[180px] block">
														{o.items.map((i) => i.servico).filter((v, i, a) => a.indexOf(v) === i).join(", ") || "—"}
													</span>
												</td>
												<td className="py-2.5 pr-4">
													<span className={`inline-block text-2xs font-bold px-2 py-0.5 rounded-full ${paymentBadge[o.status_pagamento || "NAO_PAGO"]}`}>
														{paymentLabel[o.status_pagamento || "NAO_PAGO"]}
													</span>
												</td>
												<td className="py-2.5 text-right font-bold text-slate-800 text-xs">{fmt(o.total)}</td>
											</tr>
											{isExp && (
												<tr className="bg-slate-50/70">
													<td colSpan={6} className="px-4 py-3">
														<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs animate-in fade-in slide-in-from-top-1 duration-200">
															<div className="space-y-1.5">
																<p className="font-bold text-slate-600 text-2xs uppercase tracking-wide mb-1">Itens do Pedido</p>
																{o.items.map((item, idx) => (
																	<div key={idx} className="flex justify-between bg-white p-2 rounded-lg border border-slate-100">
																		<span className="text-slate-600"><strong className="text-indigo-600">{item.quantidade}x</strong> {item.servico} - {item.material}</span>
																		<span className="font-bold text-slate-700">{fmt(item.total)}</span>
																	</div>
																))}
																{o.descricao && <p className="text-slate-500 italic mt-2">{o.descricao}</p>}
															</div>
															<div className="space-y-2">
																<div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1.5">
																	<p className="font-bold text-slate-600 text-2xs uppercase tracking-wide">Financeiro</p>
																	<div className="flex justify-between"><span className="text-slate-500">Forma:</span><span className="font-bold">{o.forma_pagamento || "N/D"}</span></div>
																	<div className="flex justify-between"><span className="text-slate-500">Total:</span><span className="font-bold text-indigo-600">{fmt(o.total)}</span></div>
																	<div className="flex justify-between"><span className="text-slate-500">Pagamento:</span><span className={`font-bold ${paymentBadge[o.status_pagamento || "NAO_PAGO"]} px-2 py-0.5 rounded-full text-2xs`}>{paymentLabel[o.status_pagamento || "NAO_PAGO"]}</span></div>
																</div>
																<div className="bg-white p-3 rounded-lg border border-slate-100">
																	<p className="font-bold text-slate-600 text-2xs uppercase tracking-wide mb-1">Pasta OneDrive</p>
																	<p className="text-slate-500 font-mono text-2xs break-all bg-slate-50 p-2 rounded border border-slate-200">01_A3_Art_Copy/Ordens/{dateStr}/OS{o.id}_{safeClient}</p>
																</div>
															</div>
														</div>
													</td>
												</tr>
											)}
										</React.Fragment>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>

		</div>
	);
};
