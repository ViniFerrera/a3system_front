import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
	ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
	ResponsiveContainer, AreaChart, Area, Cell, BarChart,
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
type PeriodPreset = "mtd" | "30d" | "3m" | "6m" | "12m" | "custom";
type BottomPeriod = "7d" | "30d" | "3m" | "6m";

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
	if (preset === "mtd") start.setDate(1);
	else if (preset === "7d") start.setDate(end.getDate() - 7);
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
	const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("mtd");
	const [startDate, setStartDate] = useState(() => periodToDates("mtd").start);
	const [endDate, setEndDate] = useState(() => periodToDates("mtd").end);
	const [selectedServices, setSelectedServices] = useState<string[]>([]);
	const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string[]>([]);
	const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>("ALL");

	// ── Filtro inferior (gráficos) ────────────────────────────────────────────
	const [bottomPeriod, setBottomPeriod] = useState<BottomPeriod>("30d");
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
		matchesFilters(o) && filterByDate(Utils.effectiveOrderDate(o), startDate, endDate)
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
		matchesFilters(o) && filterByDate(Utils.effectiveOrderDate(o), prevRange.start, prevRange.end)
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
			.filter((o) => o.status !== "CANCELADA" && (orderStatusFilter === "ALL" || o.status === orderStatusFilter) && filterByDate(Utils.effectiveOrderDate(o), startDate, endDate) && (o.status_pagamento || "NAO_PAGO") !== "PAGO")
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

	// ── Gráfico Mensal — fábrica reaproveitada pelos recortes fixos abaixo:
	// 12 meses para o "Fluxo de Caixa Mensal" (`historicoData`) e 6 meses para
	// o "Volume × Receita" ao lado (`historico6mData`). ──
	const buildMonthlyData = useCallback((start: string, end: string) => {
		const months = new Map<string, { name: string; receita_paga: number; receita_pendente: number; despesa: number; lucro: number; volume: number }>();
		let curr = new Date(new Date(start).getFullYear(), new Date(start).getMonth(), 1);
		const endD = new Date(end);
		while (curr <= endD) {
			const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}`;
			const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
			const label = `${monthNames[curr.getMonth()]}/${String(curr.getFullYear()).slice(2)}`;
			months.set(key, { name: label, receita_paga: 0, receita_pendente: 0, despesa: 0, lucro: 0, volume: 0 });
			curr.setMonth(curr.getMonth() + 1);
		}
		orders.forEach((o) => {
			if (o.status === "CANCELADA") return;
			if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return;
			const key = (Utils.effectiveOrderDate(o) || "").slice(0, 7);
			const entry = months.get(key);
			if (!entry) return;
			if (selectedPaymentStatus.length > 0 && !selectedPaymentStatus.includes(o.status_pagamento || "NAO_PAGO")) return;
			const val = (selectedServices.length === 0 || o.items.some((i) => selectedServices.includes(i.servico))) ? calcOrderTotal(o) : 0;
			if (val <= 0) return;
			// Conta o pedido no mesmo ponto em que a receita entra, para volume e
			// receita do mês nunca falarem de conjuntos diferentes de OS.
			entry.volume += 1;
			// Verde só quando efetivamente pago — parcial e não pago contam como
			// pendente, mesmo que a ordem já esteja concluída na produção.
			if ((o.status_pagamento || "NAO_PAGO") === "PAGO") entry.receita_paga += val;
			else entry.receita_pendente += val;
		});
		expenses.filter((e) => e.status === "PAGO").forEach((e) => {
			const key = (e.vencimento || "").slice(0, 7);
			const entry = months.get(key);
			if (entry) entry.despesa += e.valor;
		});
		return Array.from(months.values()).map((d) => ({
			...d,
			receita: d.receita_paga + d.receita_pendente,
			lucro: d.receita_paga + d.receita_pendente - d.despesa,
		}));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [orders, expenses, selectedServices, selectedPaymentStatus, orderStatusFilter]);

	// Recorte fixo dos últimos 12 meses, calculado uma vez (não depende do
	// filtro de período acima) — é o que trava o card "Fluxo de Caixa Mensal"
	// num histórico estável mesmo com o padrão de tela mudado para 30 dias.
	const last12Range = useMemo(() => periodToDates("12m"), []);
	const historicoData = useMemo(
		() => buildMonthlyData(last12Range.start, last12Range.end),
		[buildMonthlyData, last12Range]
	);

	// Mesma ideia, mas 6 meses fixos — alimenta o Volume × Receita ao lado do
	// Fluxo de Caixa Mensal. Fica ao lado dele de propósito, para os dois
	// obedecerem ao mesmo tipo de recorte (fixo, não o filtro de período).
	const last6Range = useMemo(() => periodToDates("6m"), []);
	const historico6mData = useMemo(
		() => buildMonthlyData(last6Range.start, last6Range.end),
		[buildMonthlyData, last6Range]
	);
	const volumeReceita6mData = useMemo(
		() => historico6mData.map((m) => ({ name: m.name, receita: m.receita_paga + m.receita_pendente, volume: m.volume })),
		[historico6mData]
	);

	// ── Dados do filtro inferior ──────────────────────────────────────────────
	const bottomOrders = useMemo(() => orders.filter((o) => {
		if (o.status === "CANCELADA") return false;
		if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return false;
		return filterByDate(Utils.effectiveOrderDate(o), bottomDates.start, bottomDates.end);
	}), [orders, bottomDates, orderStatusFilter]);

	// ── Gráfico Diário ────────────────────────────────────────────────────────
	const dailyData = useMemo(() => {
		const daysMap = new Map<string, { receita: number; volume: number }>();
		bottomOrders.forEach((o) => {
			const key = (Utils.effectiveOrderDate(o) || "").slice(0, 10);
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
			const ds = (Utils.effectiveOrderDate(o) || "").slice(0, 10);
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

	// ── Alertas ───────────────────────────────────────────────────────────────
	const stockAlerts = useMemo(() => stock.filter((s) => (s.saldo || 0) <= (s.minimo || 0)), [stock]);
	const upcomingExpenses = useMemo(() => {
		const today = new Date();
		const in7 = new Date(today.getTime() + 7 * 86400000);
		return expenses.filter((e) => e.status === "PENDENTE" && new Date(e.vencimento) <= in7)
			.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime()).slice(0, 5);
	}, [expenses]);

	// ── UI helpers ────────────────────────────────────────────────────────────
	const fmt = Utils.formatCurrency;
	const periodPresets: { key: PeriodPreset; label: string }[] = [
		{ key: "mtd", label: "Mês atual" },
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

					{/* Rótulo "legend": sobe pro topo e interrompe a borda do campo, em
					    vez de ficar numa linha acima empurrando a barra pra baixo. */}
					<div className="relative w-40">
						<span className="absolute -top-2 left-3 px-1.5 bg-white text-2xs font-bold text-ink-faint uppercase tracking-wide z-10">Pagamento</span>
						<MultiSelect options={["PAGO", "PARCIAL", "NAO_PAGO"]} selected={selectedPaymentStatus} onChange={setSelectedPaymentStatus} placeholder="Todos" />
					</div>
					<div className="relative w-48">
						<span className="absolute -top-2 left-3 px-1.5 bg-white text-2xs font-bold text-ink-faint uppercase tracking-wide z-10">Serviços</span>
						<MultiSelect options={allServices} selected={selectedServices} onChange={setSelectedServices} placeholder="Todos" />
					</div>
					<button
						onClick={() => { setPeriodPreset("mtd"); setSelectedServices([]); setSelectedPaymentStatus([]); setOrderStatusFilter("ALL"); }}
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
					accent="from-violet-500 to-purple-600" trend={kpis.volTrend} />
				<StatTile label="Receita" value={fmt(kpis.revenue)} sub="no período" icon={<TrendingUp className="w-4 h-4" />}
					accent="from-emerald-400 to-emerald-600" trend={kpis.revTrend} />
				<StatTile label="Despesas" value={fmt(kpis.expense)} sub="pagas no período" icon={<ArrowDownRight className="w-4 h-4" />}
					accent="from-rose-400 to-rose-600" />
				<StatTile label="Lucro Líquido" value={fmt(kpis.profit)} sub={`Margem: ${kpis.margin.toFixed(1)}%`} icon={<Wallet className="w-4 h-4" />}
					accent={kpis.profit >= 0 ? "from-primary-500 to-violet-600" : "from-orange-500 to-red-600"} />
				<StatTile label="Ticket Médio" value={fmt(kpis.ticket)} sub="por ordem" icon={<Receipt className="w-4 h-4" />}
					accent="from-sky-400 to-sky-600" trend={kpis.ticketTrend} />
			</div>

			{/* ── Aviso discreto: só os blocos de métricas agregadas dependem da rota ── */}
			{metricsError && (
				<div className="flex items-center gap-2 text-2xs text-warning-700 bg-warning-50 border border-warning-200 rounded-xl px-3 py-2">
					<AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
					Não foi possível carregar as análises agregadas (faixas, concentração e retenção). O restante do painel segue atualizado.
				</div>
			)}

			{/* ── Fluxo Mensal + Volume × Receita (6 meses) ──
			    1.6fr/1.4fr: o Fluxo era 2/3 da linha (2fr num grid-cols-3) — 20%
			    mais estreito vira 1.6fr, e o vizinho absorve a diferença (1.4fr). */}
			<div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1.4fr] gap-5">
				<div className="bg-white border border-slate-200/60 rounded-2xl shadow-card p-4 sm:p-6">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-5 gap-2">
						<div>
							<h4 className="text-sm sm:text-base font-bold text-slate-800">Fluxo de Caixa Mensal</h4>
							<p className="text-2xs sm:text-xs text-slate-400 mt-0.5">
								{/* Fixo nos últimos 12 meses — não segue o filtro de período
								    acima, que agora nasce em "30 dias". */}
								{Utils.formatDate(last12Range.start)} → {Utils.formatDate(last12Range.end)}
							</p>
						</div>
						<div className="flex flex-wrap gap-2 sm:gap-3 text-2xs sm:text-2xs font-semibold text-slate-500">
							<span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded bg-emerald-400 inline-block" />Pago</span>
							<span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded bg-amber-300 inline-block" />Pendente</span>
							<span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded bg-rose-400 inline-block" />Despesa</span>
							<span className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-indigo-500 inline-block" />Lucro</span>
						</div>
					</div>
					<ResponsiveContainer width="100%" height={200}>
						<ComposedChart data={historicoData} margin={{ left: -5, right: 10 }}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
							<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
							<YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
							<Tooltip content={<CustomTooltip />} />
							<Bar dataKey="receita_paga" name="Pago" stackId="receita" fill="#34d399" barSize={16} />
							<Bar dataKey="receita_pendente" name="Pendente" stackId="receita" fill="#fbbf24" radius={[5, 5, 0, 0]} barSize={16} />
							<Bar dataKey="despesa" name="Despesa" fill="#fb7185" radius={[5, 5, 0, 0]} barSize={16} />
							<Line type="monotone" dataKey="lucro" name="Lucro" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} />
						</ComposedChart>
					</ResponsiveContainer>
				</div>

				<VolumeRevenueChart data={volumeReceita6mData} />
			</div>

			{/* ── Mix por serviço + Retenção ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<ServiceMixChart data={serviceMix} />
				<RetentionCard metrics={metrics} />
			</div>

			{/* ── Faixas de ticket + Concentração de clientes ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<TicketBandsCard metrics={metrics} />
				<ConcentrationCard metrics={metrics} />
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

		</div>
	);
};
