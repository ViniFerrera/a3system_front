import React, { useMemo, useState, useEffect } from "react";
import {
	ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
	ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart,
} from "recharts";
import {
	TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, Filter,
	CheckCircle2, Clock, XCircle, BarChart2, AlertTriangle, Receipt,
	Target, Package, RefreshCw, DollarSign, ChevronDown,
} from "lucide-react";
import { Order, Expense, StockItem } from "@/types";
import { Utils } from "@/utils";
import { MultiSelect } from "@/components/ui/MultiSelect";

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
		<div className="bg-white border border-slate-100 rounded-2xl shadow-xl p-3 min-w-[140px]">
			<p className="font-bold text-slate-700 text-xs mb-2">{label}</p>
			{payload.map((p: any, i: number) => (
				<div key={i} className="flex items-center gap-2 mt-1">
					<span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
					<span className="text-slate-500 text-xs">{p.name}:</span>
					<span className="font-bold text-slate-800 text-xs ml-auto">{Utils.formatCurrency(Number(p.value))}</span>
				</div>
			))}
		</div>
	);
};

interface KpiCardProps {
	label: string; value: string; sub: string;
	icon: React.ReactNode; gradient: string; trend?: number;
}
const KpiCard = ({ label, value, sub, icon, gradient, trend }: KpiCardProps) => (
	<div className={`rounded-2xl p-5 text-white shadow-lg ${gradient} relative overflow-hidden`}>
		<div className="absolute right-3 top-3 opacity-[0.12] scale-[2.2] origin-center">{icon}</div>
		<div className="relative z-10">
			<p className="text-white/75 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
			<p className="text-2xl font-bold leading-tight tracking-tight">{value}</p>
			<div className="flex items-center gap-2 mt-1.5 flex-wrap">
				<p className="text-white/65 text-xs">{sub}</p>
				{trend !== undefined && (
					<span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend >= 0 ? "bg-white/25" : "bg-black/20"}`}>
						{trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
						{Math.abs(trend).toFixed(1)}%
					</span>
				)}
			</div>
		</div>
	</div>
);

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

	const allServices = useMemo(() => {
		const s = new Set<string>();
		orders.forEach((o) => o.items.forEach((i) => s.add(i.servico)));
		return Array.from(s);
	}, [orders]);

	// ── Helpers ──────────────────────────────────────────────────────────────
	const filterByDate = (dateStr: string, start: string, end: string) => {
		if (!dateStr) return false;
		const dateLocal = toLocalDate(new Date(dateStr));
		return (!start || dateLocal >= start) && (!end || dateLocal <= end);
	};

	const calcOrderTotal = (order: Order) => {
		if (selectedServices.length > 0)
			return order.items.reduce((acc, i) => selectedServices.includes(i.servico) ? acc + i.total : acc, 0);
		return order.total;
	};

	// ── Dados filtrados (filtro principal) ───────────────────────────────────
	const currentOrders = useMemo(() => orders.filter((o) => {
		if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return false;
		if (!filterByDate(o.data_conclusao || o.data, startDate, endDate)) return false;
		if (selectedServices.length > 0 && !o.items.some((i) => selectedServices.includes(i.servico))) return false;
		if (selectedPaymentStatus.length > 0 && !selectedPaymentStatus.includes(o.status_pagamento || "NAO_PAGO")) return false;
		return true;
	}), [orders, startDate, endDate, selectedServices, selectedPaymentStatus, orderStatusFilter]);

	const currentExpenses = useMemo(() =>
		expenses.filter((e) => e.status === "PAGO" && filterByDate(e.vencimento, startDate, endDate)),
		[expenses, startDate, endDate]);

	// ── Dados do período anterior (tendência) ────────────────────────────────
	const prevRevenue = useMemo(() => {
		const dur = new Date(endDate).getTime() - new Date(startDate).getTime() + 86400000;
		const pe = new Date(new Date(startDate).getTime() - 1);
		const ps = new Date(pe.getTime() - dur + 1);
		return orders
			.filter((o) => (orderStatusFilter === "ALL" || o.status === orderStatusFilter) && filterByDate(o.data_conclusao || o.data, ps.toISOString().split("T")[0], pe.toISOString().split("T")[0]))
			.reduce((acc, o) => acc + o.total, 0);
	}, [orders, startDate, endDate, orderStatusFilter]);

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
			.filter((o) => (orderStatusFilter === "ALL" || o.status === orderStatusFilter) && filterByDate(o.data_conclusao || o.data, startDate, endDate) && (o.status_pagamento || "NAO_PAGO") !== "PAGO")
			.reduce((acc, o) => acc + o.total, 0);
		const revTrend = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : undefined;
		return { revenue, expense, profit, margin, ticket, toReceive, revTrend };
	}, [currentOrders, currentExpenses, prevRevenue, orders, startDate, endDate, orderStatusFilter]);

	// ── Gráfico Mensal (dinâmico baseado no período) ──────────────────────────
	const monthlyData = useMemo(() => {
		const months = new Map<string, { name: string; receita_concluida: number; receita_aberta: number; despesa: number; lucro: number }>();
		let curr = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth(), 1);
		const end = new Date(endDate);
		while (curr <= end) {
			const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}`;
			const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
			const label = `${monthNames[curr.getMonth()]}/${String(curr.getFullYear()).slice(2)}`;
			months.set(key, { name: label, receita_concluida: 0, receita_aberta: 0, despesa: 0, lucro: 0 });
			curr.setMonth(curr.getMonth() + 1);
		}
		orders.forEach((o) => {
			if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return;
			const d = new Date(o.data_conclusao || o.data);
			const key = toLocalDate(d).slice(0, 7);
			const entry = months.get(key);
			if (!entry) return;
			if (selectedPaymentStatus.length > 0 && !selectedPaymentStatus.includes(o.status_pagamento || "NAO_PAGO")) return;
			const val = (selectedServices.length === 0 || o.items.some((i) => selectedServices.includes(i.servico))) ? calcOrderTotal(o) : 0;
			if (val <= 0) return;
			if (o.status === "CONCLUIDA") entry.receita_concluida += val;
			else entry.receita_aberta += val;
		});
		expenses.filter((e) => e.status === "PAGO").forEach((e) => {
			const d = new Date(e.vencimento);
			const key = toLocalDate(d).slice(0, 7);
			const entry = months.get(key);
			if (entry) entry.despesa += e.valor;
		});
		return Array.from(months.values()).map((d) => ({
			...d,
			receita: d.receita_concluida + d.receita_aberta,
			lucro: d.receita_concluida + d.receita_aberta - d.despesa,
		}));
	}, [orders, expenses, selectedServices, selectedPaymentStatus, orderStatusFilter, startDate, endDate]);

	// ── Dados do filtro inferior ──────────────────────────────────────────────
	const bottomOrders = useMemo(() => orders.filter((o) => {
		if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return false;
		return filterByDate(o.data_conclusao || o.data, bottomDates.start, bottomDates.end);
	}), [orders, bottomDates, orderStatusFilter]);

	// ── Gráfico Diário ────────────────────────────────────────────────────────
	const dailyData = useMemo(() => {
		const daysMap = new Map<string, { receita: number; volume: number }>();
		bottomOrders.forEach((o) => {
			const key = toLocalDate(new Date(o.data_conclusao || o.data));
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
			const day = new Date(o.data_conclusao || o.data).getDay();
			const cur = map.get(day)!;
			map.set(day, { revenue: cur.revenue + o.total, count: cur.count + 1 });
		});
		return days.map((name, i) => ({ name, ...map.get(i)! }));
	}, [bottomOrders]);
	const maxDayRevenue = Math.max(...dayOfWeekData.map((d) => d.revenue), 1);

	// ── Top Serviços / Clientes ───────────────────────────────────────────────
	const topServices = useMemo(() => {
		const map = new Map<string, { volume: number; revenue: number }>();
		currentOrders.forEach((o) => o.items.forEach((i) => {
			if (selectedServices.length === 0 || selectedServices.includes(i.servico)) {
				const cur = map.get(i.servico) || { volume: 0, revenue: 0 };
				map.set(i.servico, { volume: cur.volume + (i.quantidade || 1), revenue: cur.revenue + (i.total || 0) });
			}
		}));
		return Array.from(map.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.revenue - a.revenue).slice(0, 6);
	}, [currentOrders, selectedServices]);

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
		<div className="space-y-5 pb-20 md:pb-0">

			{/* ── Status Tabs ── */}
			<div className="flex flex-wrap gap-2">
				{statusButtons.map((btn) => (
					<button key={btn.key} onClick={() => setOrderStatusFilter(btn.key)}
						className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border font-semibold text-xs transition-all duration-150 shadow-sm ${orderStatusFilter === btn.key ? btn.active + " shadow-md" : btn.inactive}`}
					>
						{btn.icon}{btn.label}
						<span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${orderStatusFilter === btn.key ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{btn.count}</span>
					</button>
				))}
			</div>

			{/* ── Barra de Filtros ── */}
			<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4">
				<div className="flex flex-col gap-3">
					{/* Período Presets */}
					<div className="flex flex-wrap items-center gap-2">
						<span className="flex items-center gap-1.5 text-slate-400 font-bold text-xs uppercase tracking-wide mr-1">
							<Filter className="w-3.5 h-3.5 text-indigo-400" /> Período
						</span>
						{periodPresets.map((p) => (
							<button key={p.key} onClick={() => setPeriodPreset(p.key)}
								className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${periodPreset === p.key ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"}`}
							>{p.label}</button>
						))}
					</div>
					{/* Se custom, mostra date pickers */}
					{periodPreset === "custom" && (
						<div className="flex flex-wrap gap-3 items-end">
							<div className="w-full md:w-36">
								<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Início</label>
								<input type="date" className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-slate-50" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
							</div>
							<div className="w-full md:w-36">
								<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Fim</label>
								<input type="date" className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-slate-50" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
							</div>
						</div>
					)}
					{/* Filtros adicionais */}
					<div className="flex flex-wrap gap-3 items-end">
						<div className="w-full md:w-44">
							<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Pagamento</label>
							<MultiSelect options={["PAGO", "PARCIAL", "NAO_PAGO"]} selected={selectedPaymentStatus} onChange={setSelectedPaymentStatus} placeholder="Todos" />
						</div>
						<div className="w-full md:w-52">
							<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Serviços</label>
							<MultiSelect options={allServices} selected={selectedServices} onChange={setSelectedServices} placeholder="Todos" />
						</div>
						<button
							onClick={() => { setPeriodPreset("12m"); setSelectedServices([]); setSelectedPaymentStatus([]); setOrderStatusFilter("ALL"); }}
							className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-all"
						>
							<RefreshCw className="w-3 h-3" /> Limpar
						</button>
					</div>
				</div>
			</div>

			{/* ── KPI Cards ── */}
			<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
				<KpiCard label="Receita" value={fmt(kpis.revenue)} sub={`${currentOrders.length} ordens`} icon={<TrendingUp />} gradient="bg-gradient-to-br from-emerald-400 to-emerald-600" trend={kpis.revTrend} />
				<KpiCard label="Despesas" value={fmt(kpis.expense)} sub="pagas no período" icon={<ArrowDownRight />} gradient="bg-gradient-to-br from-rose-400 to-rose-600" />
				<KpiCard label="Lucro Líquido" value={fmt(kpis.profit)} sub={`Margem: ${kpis.margin.toFixed(1)}%`} icon={<Wallet />} gradient={kpis.profit >= 0 ? "bg-gradient-to-br from-indigo-500 to-violet-600" : "bg-gradient-to-br from-orange-500 to-red-600"} />
				<KpiCard label="Ticket Médio" value={fmt(kpis.ticket)} sub="por ordem" icon={<Receipt />} gradient="bg-gradient-to-br from-sky-400 to-sky-600" />
				<KpiCard label="Total de OS" value={String(currentOrders.length)} sub={`${statusCounts.open} em aberto`} icon={<Target />} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
				<KpiCard label="A Receber" value={fmt(kpis.toReceive)} sub="pendente + parcial" icon={<DollarSign />} gradient={kpis.toReceive > 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-slate-400 to-slate-500"} />
			</div>

			{/* ── Fluxo Mensal + Distribuição Pagamento ── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
				<div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-2">
						<div>
							<h4 className="text-base font-bold text-slate-800">Fluxo de Caixa Mensal</h4>
							<p className="text-xs text-slate-400 mt-0.5">
								{Utils.formatDate(startDate)} → {Utils.formatDate(endDate)}
							</p>
						</div>
						<div className="flex gap-3 text-[11px] font-semibold text-slate-500">
							<span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block" />Concluídas</span>
							<span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-300 inline-block" />Abertas</span>
							<span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-rose-400 inline-block" />Despesa</span>
							<span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />Lucro</span>
						</div>
					</div>
					<ResponsiveContainer width="100%" height={260}>
						<ComposedChart data={monthlyData} margin={{ left: -5, right: 10 }}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
							<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
							<YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
							<Tooltip content={<CustomTooltip />} />
							<Bar dataKey="receita_concluida" name="Concluídas" stackId="receita" fill="#34d399" barSize={16} />
							<Bar dataKey="receita_aberta" name="Abertas" stackId="receita" fill="#fbbf24" radius={[5, 5, 0, 0]} barSize={16} />
							<Bar dataKey="despesa" name="Despesa" fill="#fb7185" radius={[5, 5, 0, 0]} barSize={16} />
							<Line type="monotone" dataKey="lucro" name="Lucro" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} />
						</ComposedChart>
					</ResponsiveContainer>
				</div>

				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col">
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
												<span className="text-[10px] text-slate-400">{count} OS</span>
											</div>
											<div className="flex items-center gap-2">
												<span className="text-[10px] text-slate-400">{pct}%</span>
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

			{/* ── Top Serviços + Top Clientes ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<h4 className="text-base font-bold text-slate-800">Top Serviços</h4>
					<p className="text-xs text-slate-400 mt-0.5 mb-5">Receita por tipo de serviço</p>
					{topServices.length > 0 ? (
						<ResponsiveContainer width="100%" height={220}>
							<ComposedChart data={topServices} layout="vertical" margin={{ left: 0, right: 55 }}>
								<CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
								<XAxis type="number" hide />
								<YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }} />
								<Tooltip content={<CustomTooltip />} />
								<Bar dataKey="revenue" name="Receita" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={22}>
									{/* LabelList removido pois CustomTooltip já mostra */}
								</Bar>
							</ComposedChart>
						</ResponsiveContainer>
					) : (
						<div className="h-[220px] flex items-center justify-center text-slate-300 text-sm">Sem dados no período</div>
					)}
				</div>

				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
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
											<span className="text-xs font-bold text-slate-800 flex-shrink-0">{fmt(c.revenue)}</span>
										</div>
										<div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
											<div className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full" style={{ width: `${(c.revenue / maxClientRevenue) * 100}%` }} />
										</div>
										<p className="text-[10px] text-slate-400 mt-0.5">{c.volume} pedido{c.volume !== 1 ? "s" : ""}</p>
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
			<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
				<h4 className="text-base font-bold text-slate-800">Evolução Diária de Receita</h4>
				<p className="text-xs text-slate-400 mt-0.5 mb-5">Faturamento dia a dia nos últimos {bottomPeriod === "7d" ? "7 dias" : bottomPeriod === "30d" ? "30 dias" : bottomPeriod === "3m" ? "3 meses" : "6 meses"}</p>
				<ResponsiveContainer width="100%" height={210}>
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
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<h4 className="text-base font-bold text-slate-800">Receita por Dia da Semana</h4>
					<p className="text-xs text-slate-400 mt-0.5 mb-4">
						Melhor dia:{" "}
						<span className="text-indigo-600 font-bold">
							{dayOfWeekData.reduce((best, d) => d.revenue > best.revenue ? d : best, dayOfWeekData[0])?.name || "—"}
						</span>
					</p>
					<ResponsiveContainer width="100%" height={180}>
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
				</div>

				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
						<AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas
					</h4>
					<p className="text-xs text-slate-400 mt-0.5 mb-4">Contas e estoque que precisam de atenção</p>
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
													<p className={`text-[10px] ${overdue ? "text-red-500 font-bold" : "text-amber-600"}`}>{overdue ? "⚠ Vencida" : "Vence"} {Utils.formatDate(e.vencimento)}</p>
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
												<p className="text-[10px] text-rose-500">Saldo: {s.saldo} {s.unidade} (mín: {s.minimo})</p>
											</div>
										</div>
										<span className="text-[10px] font-bold text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full ml-2 flex-shrink-0">Crítico</span>
									</div>
								))}
							</>
						)}
					</div>
				</div>
			</div>

			{/* ── Tabela: Últimas Ordens Abertas ── */}
			<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
							<Clock className="w-4 h-4 text-blue-500" /> Ordens em Aberto
						</h4>
						<p className="text-xs text-slate-400 mt-0.5">{openOrders.length} OS pendentes de conclusão</p>
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
								<tr className="border-b border-slate-100">
									<th className="text-left text-[10px] font-bold text-slate-400 uppercase pb-2 pr-4">#OS</th>
									<th className="text-left text-[10px] font-bold text-slate-400 uppercase pb-2 pr-4">Cliente</th>
									<th className="text-left text-[10px] font-bold text-slate-400 uppercase pb-2 pr-4 hidden md:table-cell">Data</th>
									<th className="text-left text-[10px] font-bold text-slate-400 uppercase pb-2 pr-4 hidden lg:table-cell">Serviços</th>
									<th className="text-left text-[10px] font-bold text-slate-400 uppercase pb-2 pr-4">Pagamento</th>
									<th className="text-right text-[10px] font-bold text-slate-400 uppercase pb-2">Valor</th>
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
													<span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${paymentBadge[o.status_pagamento || "NAO_PAGO"]}`}>
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
																<p className="font-bold text-slate-600 text-[10px] uppercase tracking-wide mb-1">Itens do Pedido</p>
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
																	<p className="font-bold text-slate-600 text-[10px] uppercase tracking-wide">Financeiro</p>
																	<div className="flex justify-between"><span className="text-slate-500">Forma:</span><span className="font-bold">{o.forma_pagamento || "N/D"}</span></div>
																	<div className="flex justify-between"><span className="text-slate-500">Total:</span><span className="font-bold text-indigo-600">{fmt(o.total)}</span></div>
																	<div className="flex justify-between"><span className="text-slate-500">Pagamento:</span><span className={`font-bold ${paymentBadge[o.status_pagamento || "NAO_PAGO"]} px-2 py-0.5 rounded-full text-[10px]`}>{paymentLabel[o.status_pagamento || "NAO_PAGO"]}</span></div>
																</div>
																<div className="bg-white p-3 rounded-lg border border-slate-100">
																	<p className="font-bold text-slate-600 text-[10px] uppercase tracking-wide mb-1">Pasta OneDrive</p>
																	<p className="text-slate-500 font-mono text-[10px] break-all bg-slate-50 p-2 rounded border border-slate-200">A3_Ordens/{dateStr}/OS{o.id}_{safeClient}</p>
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
