import React, { useMemo, useState } from "react";
import {
	ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
	ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
	LabelList, BarChart,
} from "recharts";
import {
	TrendingUp, Wallet, ArrowDownRight, ArrowUpRight, Filter,
	CheckCircle2, Clock, XCircle, BarChart2, AlertTriangle, Receipt,
	Target, Package, RefreshCw, DollarSign,
} from "lucide-react";
import { Order, Expense, StockItem } from "@/types";
import { Utils } from "@/utils";
import { MultiSelect } from "@/components/ui/MultiSelect";

type OrderStatusFilter = "CONCLUIDA" | "ABERTA" | "CANCELADA" | "ALL";

const PIE_COLORS: Record<string, string> = {
	PAGO: "#10b981",
	PARCIAL: "#f59e0b",
	NAO_PAGO: "#f43f5e",
};

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="bg-white border border-slate-100 rounded-2xl shadow-xl p-3 min-w-[140px]">
			<p className="font-bold text-slate-700 text-xs mb-2">{label}</p>
			{payload.map((p: any, i: number) => (
				<div key={i} className="flex items-center gap-2 mt-1">
					<span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
					<span className="text-slate-500 text-xs">{p.name}:</span>
					<span className="font-bold text-slate-800 text-xs ml-auto">
						{Utils.formatCurrency(Number(p.value))}
					</span>
				</div>
			))}
		</div>
	);
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KpiCardProps {
	label: string;
	value: string;
	sub: string;
	icon: React.ReactNode;
	gradient: string;
	trend?: number;
}

const KpiCard = ({ label, value, sub, icon, gradient, trend }: KpiCardProps) => (
	<div className={`rounded-2xl p-5 text-white shadow-lg ${gradient} relative overflow-hidden`}>
		<div className="absolute right-3 top-3 opacity-[0.15] scale-[2] origin-center">{icon}</div>
		<div className="relative z-10">
			<p className="text-white/75 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</p>
			<p className="text-2xl font-bold leading-tight tracking-tight">{value}</p>
			<div className="flex items-center gap-2 mt-1.5 flex-wrap">
				<p className="text-white/65 text-xs">{sub}</p>
				{trend !== undefined && (
					<span className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
						trend >= 0 ? "bg-white/25" : "bg-black/20"
					}`}>
						{trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
						{Math.abs(trend).toFixed(1)}%
					</span>
				)}
			</div>
		</div>
	</div>
);

// ─── Componente Principal ─────────────────────────────────────────────────────
export const DashboardModule = ({
	orders,
	expenses,
	stock = [],
}: {
	orders: Order[];
	expenses: Expense[];
	stock?: StockItem[];
}) => {
	const now = new Date();
	const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
	const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

	const [startDate, setStartDate] = useState(defaultStart);
	const [endDate, setEndDate] = useState(defaultEnd);
	const [selectedServices, setSelectedServices] = useState<string[]>([]);
	const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string[]>([]);
	const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>("CONCLUIDA");

	const allYears = useMemo(() => {
		const years = new Set<string>();
		orders.forEach((o) => { const d = o.data_conclusao || o.data; if (d) years.add(new Date(d).getFullYear().toString()); });
		expenses.forEach((e) => { if (e.vencimento) years.add(new Date(e.vencimento).getFullYear().toString()); });
		const cy = now.getFullYear().toString();
		if (!years.has(cy)) years.add(cy);
		return Array.from(years).sort();
	}, [orders, expenses]);

	const [selectedYears, setSelectedYears] = useState<string[]>([now.getFullYear().toString()]);

	const allServices = useMemo(() => {
		const s = new Set<string>();
		orders.forEach((o) => o.items.forEach((i) => s.add(i.servico)));
		return Array.from(s);
	}, [orders]);

	// ─── Helpers ─────────────────────────────────────────────────────────────
	const filterByDate = (dateStr: string, start: string, end: string) => {
		const date = new Date(dateStr);
		const s = start ? new Date(start) : null;
		const e = end ? new Date(end) : null;
		if (e) e.setHours(23, 59, 59, 999);
		return (!s || date >= s) && (!e || date <= e);
	};

	const calcOrderTotal = (order: Order) => {
		if (selectedServices.length > 0) {
			return order.items.reduce((acc, i) => (selectedServices.includes(i.servico) ? acc + i.total : acc), 0);
		}
		return order.total;
	};

	// ─── Dados filtrados ─────────────────────────────────────────────────────
	const currentOrders = useMemo(() => {
		return orders.filter((o) => {
			if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return false;
			if (!filterByDate(o.data_conclusao || o.data, startDate, endDate)) return false;
			if (selectedServices.length > 0 && !o.items.some((i) => selectedServices.includes(i.servico))) return false;
			if (selectedPaymentStatus.length > 0 && !selectedPaymentStatus.includes(o.status_pagamento || "NAO_PAGO")) return false;
			return true;
		});
	}, [orders, startDate, endDate, selectedServices, selectedPaymentStatus, orderStatusFilter]);

	const currentExpenses = useMemo(() => {
		return expenses.filter((e) => e.status === "PAGO" && filterByDate(e.vencimento, startDate, endDate));
	}, [expenses, startDate, endDate]);

	// ─── Período anterior (comparação de tendência) ───────────────────────────
	const prevPeriodRevenue = useMemo(() => {
		const duration = new Date(endDate).getTime() - new Date(startDate).getTime() + 86400000;
		const prevEnd = new Date(new Date(startDate).getTime() - 1);
		const prevStart = new Date(prevEnd.getTime() - duration + 1);
		const ps = prevStart.toISOString().split("T")[0];
		const pe = prevEnd.toISOString().split("T")[0];
		return orders
			.filter((o) => (orderStatusFilter === "ALL" || o.status === orderStatusFilter) && filterByDate(o.data_conclusao || o.data, ps, pe))
			.reduce((acc, o) => acc + o.total, 0);
	}, [orders, startDate, endDate, orderStatusFilter]);

	// ─── Contadores de status ─────────────────────────────────────────────────
	const statusCounts = useMemo(() => ({
		concluded: orders.filter((o) => o.status === "CONCLUIDA").length,
		open: orders.filter((o) => o.status === "ABERTA").length,
		cancelled: orders.filter((o) => o.status === "CANCELADA").length,
	}), [orders]);

	// ─── KPIs ─────────────────────────────────────────────────────────────────
	const kpis = useMemo(() => {
		const revenue = currentOrders.reduce((acc, o) => acc + calcOrderTotal(o), 0);
		const expense = currentExpenses.reduce((acc, e) => acc + e.valor, 0);
		const profit = revenue - expense;
		const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
		const ticket = currentOrders.length > 0 ? revenue / currentOrders.length : 0;
		const toReceive = orders
			.filter((o) => {
				if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter) return false;
				if (!filterByDate(o.data_conclusao || o.data, startDate, endDate)) return false;
				return (o.status_pagamento || "NAO_PAGO") !== "PAGO";
			})
			.reduce((acc, o) => acc + o.total, 0);
		const revTrend = prevPeriodRevenue > 0 ? ((revenue - prevPeriodRevenue) / prevPeriodRevenue) * 100 : undefined;
		return { revenue, expense, profit, margin, ticket, toReceive, revTrend };
	}, [currentOrders, currentExpenses, prevPeriodRevenue, orders, startDate, endDate, orderStatusFilter]);

	// ─── Gráfico Mensal ───────────────────────────────────────────────────────
	const monthlyData = useMemo(() => {
		const data = Array(12).fill(0).map((_, i) => {
			const d = new Date(); d.setMonth(i);
			return { name: d.toLocaleString("pt-BR", { month: "short" }), receita: 0, despesa: 0, lucro: 0 };
		});
		orders.filter((o) => orderStatusFilter === "ALL" || o.status === orderStatusFilter).forEach((o) => {
			const d = new Date(o.data_conclusao || o.data);
			if (!selectedYears.includes(d.getFullYear().toString())) return;
			if (selectedPaymentStatus.length > 0 && !selectedPaymentStatus.includes(o.status_pagamento || "NAO_PAGO")) return;
			if (selectedServices.length === 0 || o.items.some((i) => selectedServices.includes(i.servico))) {
				data[d.getMonth()].receita += calcOrderTotal(o);
			}
		});
		expenses.filter((e) => e.status === "PAGO").forEach((e) => {
			const d = new Date(e.vencimento);
			if (selectedYears.includes(d.getFullYear().toString())) data[d.getMonth()].despesa += e.valor;
		});
		data.forEach((d) => (d.lucro = d.receita - d.despesa));
		return data;
	}, [orders, expenses, selectedServices, selectedYears, selectedPaymentStatus, orderStatusFilter]);

	// ─── Gráfico Diário ───────────────────────────────────────────────────────
	const dailyData = useMemo(() => {
		const daysMap = new Map<string, { receita: number; volume: number }>();
		currentOrders.forEach((o) => {
			const key = new Date(o.data_conclusao || o.data).toISOString().split("T")[0];
			const cur = daysMap.get(key) || { receita: 0, volume: 0 };
			daysMap.set(key, { receita: cur.receita + calcOrderTotal(o), volume: cur.volume + 1 });
		});
		const s = startDate ? new Date(startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
		const e = endDate ? new Date(endDate) : now;
		const result = [];
		let curr = new Date(s);
		while (curr <= e) {
			const key = curr.toISOString().split("T")[0];
			const val = daysMap.get(key) || { receita: 0, volume: 0 };
			result.push({ date: curr.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }), ...val });
			curr.setDate(curr.getDate() + 1);
		}
		return result.length > 31 ? result.filter((_, i) => i % Math.ceil(result.length / 30) === 0) : result;
	}, [currentOrders, startDate, endDate]);

	// ─── Top Serviços / Clientes ──────────────────────────────────────────────
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

	// ─── Distribuição de Pagamento ────────────────────────────────────────────
	const paymentDist = useMemo(() => {
		const map = new Map([["PAGO", 0], ["PARCIAL", 0], ["NAO_PAGO", 0]]);
		currentOrders.forEach((o) => {
			const s = o.status_pagamento || "NAO_PAGO";
			map.set(s, (map.get(s) || 0) + calcOrderTotal(o));
		});
		return Array.from(map.entries()).map(([name, value]) => ({ name, value })).filter((d) => d.value > 0);
	}, [currentOrders]);

	// ─── Análise por dia da semana ────────────────────────────────────────────
	const dayOfWeekData = useMemo(() => {
		const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
		const map = new Map<number, { revenue: number; count: number }>();
		days.forEach((_, i) => map.set(i, { revenue: 0, count: 0 }));
		currentOrders.forEach((o) => {
			const day = new Date(o.data_conclusao || o.data).getDay();
			const cur = map.get(day)!;
			map.set(day, { revenue: cur.revenue + calcOrderTotal(o), count: cur.count + 1 });
		});
		return days.map((name, i) => ({ name, ...map.get(i)! }));
	}, [currentOrders]);

	const maxDayRevenue = Math.max(...dayOfWeekData.map((d) => d.revenue), 1);

	// ─── Alertas ─────────────────────────────────────────────────────────────
	const stockAlerts = useMemo(() => stock.filter((s) => (s.saldo || 0) <= (s.minimo || 0)), [stock]);

	const upcomingExpenses = useMemo(() => {
		const today = new Date();
		const in7 = new Date(today.getTime() + 7 * 86400000);
		return expenses
			.filter((e) => { if (e.status !== "PENDENTE") return false; const d = new Date(e.vencimento); return d <= in7; })
			.sort((a, b) => new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime())
			.slice(0, 5);
	}, [expenses]);

	// ─── UI helpers ──────────────────────────────────────────────────────────
	const fmt = Utils.formatCurrency;
	const maxClientRevenue = topClients[0]?.revenue || 1;

	const statusButtons = [
		{ key: "CONCLUIDA" as const, label: "Concluídas", icon: <CheckCircle2 className="w-3.5 h-3.5" />, active: "bg-emerald-500 text-white border-emerald-500 shadow-emerald-100", inactive: "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50", count: statusCounts.concluded },
		{ key: "ABERTA" as const, label: "Em Aberto", icon: <Clock className="w-3.5 h-3.5" />, active: "bg-blue-500 text-white border-blue-500 shadow-blue-100", inactive: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50", count: statusCounts.open },
		{ key: "CANCELADA" as const, label: "Canceladas", icon: <XCircle className="w-3.5 h-3.5" />, active: "bg-slate-600 text-white border-slate-600 shadow-slate-100", inactive: "bg-white text-slate-500 border-slate-200 hover:bg-slate-50", count: statusCounts.cancelled },
		{ key: "ALL" as const, label: "Todas", icon: <BarChart2 className="w-3.5 h-3.5" />, active: "bg-indigo-500 text-white border-indigo-500 shadow-indigo-100", inactive: "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50", count: orders.length },
	];

	const paymentLabel: Record<string, string> = { PAGO: "Pago", PARCIAL: "Parcial", NAO_PAGO: "Não Pago" };

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
				<div className="flex flex-col md:flex-row gap-3 items-end flex-wrap">
					<div className="flex items-center gap-1.5 text-slate-400 font-bold text-xs uppercase tracking-wide mr-2 mb-1 md:mb-0">
						<Filter className="w-3.5 h-3.5 text-indigo-400" /> Filtros
					</div>
					<div className="w-full md:w-36">
						<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Início</label>
						<input type="date" className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-slate-50" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
					</div>
					<div className="w-full md:w-36">
						<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Fim</label>
						<input type="date" className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none bg-slate-50" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
					</div>
					<div className="w-full md:w-28">
						<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Ano(s)</label>
						<MultiSelect options={allYears} selected={selectedYears} onChange={setSelectedYears} placeholder="Ano" />
					</div>
					<div className="w-full md:w-44">
						<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Pagamento</label>
						<MultiSelect options={["PAGO", "PARCIAL", "NAO_PAGO"]} selected={selectedPaymentStatus} onChange={setSelectedPaymentStatus} placeholder="Todos" />
					</div>
					<div className="w-full md:w-52">
						<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Serviços</label>
						<MultiSelect options={allServices} selected={selectedServices} onChange={setSelectedServices} placeholder="Todos" />
					</div>
					<button
						onClick={() => { setStartDate(defaultStart); setEndDate(defaultEnd); setSelectedServices([]); setSelectedYears([now.getFullYear().toString()]); setSelectedPaymentStatus([]); setOrderStatusFilter("CONCLUIDA"); }}
						className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-500 px-3 py-2 rounded-xl hover:bg-red-50 transition-all"
					>
						<RefreshCw className="w-3 h-3" /> Limpar
					</button>
				</div>
			</div>

			{/* ── KPI Cards ── */}
			<div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
				<KpiCard label="Receita" value={fmt(kpis.revenue)} sub={`${currentOrders.length} ordens no período`} icon={<TrendingUp />} gradient="bg-gradient-to-br from-emerald-400 to-emerald-600" trend={kpis.revTrend} />
				<KpiCard label="Despesas" value={fmt(kpis.expense)} sub="contas pagas no período" icon={<ArrowDownRight />} gradient="bg-gradient-to-br from-rose-400 to-rose-600" />
				<KpiCard label="Lucro Líquido" value={fmt(kpis.profit)} sub={`Margem: ${kpis.margin.toFixed(1)}%`} icon={<Wallet />} gradient={kpis.profit >= 0 ? "bg-gradient-to-br from-indigo-500 to-violet-600" : "bg-gradient-to-br from-orange-500 to-red-600"} />
				<KpiCard label="Ticket Médio" value={fmt(kpis.ticket)} sub="por ordem de serviço" icon={<Receipt />} gradient="bg-gradient-to-br from-sky-400 to-sky-600" />
				<KpiCard label="Total de OS" value={String(currentOrders.length)} sub={`${statusCounts.open} em aberto agora`} icon={<Target />} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
				<KpiCard label="A Receber" value={fmt(kpis.toReceive)} sub="pendente + parcial" icon={<DollarSign />} gradient={kpis.toReceive > 0 ? "bg-gradient-to-br from-amber-400 to-orange-500" : "bg-gradient-to-br from-slate-400 to-slate-500"} />
			</div>

			{/* ── Fluxo Mensal + Distribuição de Pagamento ── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

				{/* Fluxo Mensal */}
				<div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-2">
						<div>
							<h4 className="text-base font-bold text-slate-800">Fluxo de Caixa Mensal</h4>
							<p className="text-xs text-slate-400 mt-0.5">Receita × Despesa × Lucro — {selectedYears.join(", ")}</p>
						</div>
						<div className="flex gap-3 text-[11px] font-semibold text-slate-500">
							<span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-emerald-400 inline-block" />Receita</span>
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
							<Bar dataKey="receita" name="Receita" fill="#34d399" radius={[5, 5, 0, 0]} barSize={14} />
							<Bar dataKey="despesa" name="Despesa" fill="#fb7185" radius={[5, 5, 0, 0]} barSize={14} />
							<Line type="monotone" dataKey="lucro" name="Lucro" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }} />
						</ComposedChart>
					</ResponsiveContainer>
				</div>

				{/* Distribuição de Pagamento */}
				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 flex flex-col">
					<h4 className="text-base font-bold text-slate-800">Status de Pagamento</h4>
					<p className="text-xs text-slate-400 mt-0.5 mb-4">Distribuição do período selecionado</p>
					{paymentDist.length > 0 ? (
						<>
							<div className="flex-1 min-h-[150px]">
								<ResponsiveContainer width="100%" height={160}>
									<PieChart>
										<Pie data={paymentDist} cx="50%" cy="50%" innerRadius={50} outerRadius={72} dataKey="value" paddingAngle={4}>
											{paymentDist.map((entry) => (
												<Cell key={entry.name} fill={PIE_COLORS[entry.name] || "#94a3b8"} />
											))}
										</Pie>
										<Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: "12px" }} />
									</PieChart>
								</ResponsiveContainer>
							</div>
							<div className="space-y-2.5 mt-2">
								{paymentDist.map((d) => {
									const count = currentOrders.filter((o) => (o.status_pagamento || "NAO_PAGO") === d.name).length;
									const pct = currentOrders.length > 0 ? ((count / currentOrders.length) * 100).toFixed(0) : "0";
									return (
										<div key={d.name} className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[d.name] }} />
												<span className="text-xs text-slate-600 font-semibold">{paymentLabel[d.name]}</span>
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

				{/* Top Serviços */}
				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<h4 className="text-base font-bold text-slate-800">Top Serviços</h4>
					<p className="text-xs text-slate-400 mt-0.5 mb-5">Receita gerada por tipo de serviço</p>
					{topServices.length > 0 ? (
						<ResponsiveContainer width="100%" height={220}>
							<ComposedChart data={topServices} layout="vertical" margin={{ left: 0, right: 55 }}>
								<CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
								<XAxis type="number" hide />
								<YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }} />
								<Tooltip content={<CustomTooltip />} />
								<Bar dataKey="revenue" name="Receita" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={22}>
									<LabelList dataKey="revenue" position="right" formatter={(v: number) => fmt(v)} style={{ fill: "#6366f1", fontSize: "10px", fontWeight: "bold" }} />
								</Bar>
							</ComposedChart>
						</ResponsiveContainer>
					) : (
						<div className="h-[220px] flex items-center justify-center text-slate-300 text-sm">Sem dados no período</div>
					)}
				</div>

				{/* Top Clientes — Ranking */}
				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<h4 className="text-base font-bold text-slate-800">Top Clientes</h4>
					<p className="text-xs text-slate-400 mt-0.5 mb-4">Ranking por receita no período</p>
					{topClients.length > 0 ? (
						<div className="space-y-3.5">
							{topClients.map((c, i) => (
								<div key={c.name} className="flex items-center gap-3">
									<span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${
										i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-700/70" : "text-slate-300"
									}`}>{i + 1}</span>
									<div className="flex-1 min-w-0">
										<div className="flex items-center justify-between mb-1">
											<span className="text-xs font-semibold text-slate-700 truncate pr-2">{c.name}</span>
											<span className="text-xs font-bold text-slate-800 flex-shrink-0">{fmt(c.revenue)}</span>
										</div>
										<div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
											<div className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full transition-all duration-500" style={{ width: `${(c.revenue / maxClientRevenue) * 100}%` }} />
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

			{/* ── Evolução Diária (Area Chart) ── */}
			<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
				<h4 className="text-base font-bold text-slate-800">Evolução Diária de Receita</h4>
				<p className="text-xs text-slate-400 mt-0.5 mb-5">Faturamento e volume de OS por dia no período selecionado</p>
				<ResponsiveContainer width="100%" height={210}>
					<AreaChart data={dailyData} margin={{ left: -10, right: 10 }}>
						<defs>
							<linearGradient id="receitaGradient" x1="0" y1="0" x2="0" y2="1">
								<stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
								<stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
							</linearGradient>
						</defs>
						<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
						<XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 10 }} interval="preserveStartEnd" />
						<YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
						<Tooltip content={<CustomTooltip />} />
						<Area type="monotone" dataKey="receita" name="Receita" stroke="#6366f1" strokeWidth={2.5} fill="url(#receitaGradient)" dot={false} activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 0 }} />
					</AreaChart>
				</ResponsiveContainer>
			</div>

			{/* ── Análise por Dia da Semana + Alertas ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

				{/* Dia da Semana */}
				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<h4 className="text-base font-bold text-slate-800">Receita por Dia da Semana</h4>
					<p className="text-xs text-slate-400 mt-0.5 mb-5">
						Identifique os dias mais produtivos —{" "}
						<span className="text-indigo-500 font-semibold">
							{dayOfWeekData.reduce((best, d) => d.revenue > best.revenue ? d : best, dayOfWeekData[0])?.name || "—"}
						</span>{" "}
						é o melhor dia
					</p>
					<ResponsiveContainer width="100%" height={180}>
						<BarChart data={dayOfWeekData} margin={{ left: -20, right: 5 }}>
							<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
							<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
							<YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
							<Tooltip content={<CustomTooltip />} />
							<Bar dataKey="revenue" name="Receita" radius={[6, 6, 0, 0]} barSize={30}>
								{dayOfWeekData.map((d, i) => (
									<Cell key={i} fill={d.revenue === maxDayRevenue && maxDayRevenue > 0 ? "#6366f1" : "#cbd5e1"} />
								))}
							</Bar>
						</BarChart>
					</ResponsiveContainer>
				</div>

				{/* Alertas */}
				<div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6">
					<h4 className="text-base font-bold text-slate-800 flex items-center gap-2">
						<AlertTriangle className="w-4 h-4 text-amber-500" /> Alertas
					</h4>
					<p className="text-xs text-slate-400 mt-0.5 mb-4">Contas e estoque que precisam de atenção</p>
					<div className="space-y-2">
						{upcomingExpenses.length === 0 && stockAlerts.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-slate-300">
								<CheckCircle2 className="w-8 h-8 mb-2 text-emerald-300" />
								<p className="text-sm font-semibold text-emerald-400">Tudo em dia!</p>
								<p className="text-xs mt-1">Nenhum alerta no momento</p>
							</div>
						) : (
							<>
								{upcomingExpenses.map((e) => {
									const isOverdue = new Date(e.vencimento) < new Date();
									return (
										<div key={e.id} className={`flex items-center justify-between p-3 rounded-xl border ${isOverdue ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
											<div className="flex items-center gap-2 min-w-0">
												<Receipt className={`w-3.5 h-3.5 flex-shrink-0 ${isOverdue ? "text-red-500" : "text-amber-500"}`} />
												<div className="min-w-0">
													<p className="text-xs font-semibold text-slate-700 truncate">{e.produto}</p>
													<p className={`text-[10px] ${isOverdue ? "text-red-500 font-bold" : "text-amber-600"}`}>
														{isOverdue ? "⚠ Vencida" : "Vence"} em {Utils.formatDate(e.vencimento)}
													</p>
												</div>
											</div>
											<span className={`text-xs font-bold flex-shrink-0 ml-3 ${isOverdue ? "text-red-600" : "text-amber-700"}`}>{fmt(e.valor)}</span>
										</div>
									);
								})}
								{stockAlerts.slice(0, 3).map((s) => (
									<div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-rose-50 border border-rose-100">
										<div className="flex items-center gap-2 min-w-0">
											<Package className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
											<div className="min-w-0">
												<p className="text-xs font-semibold text-slate-700 truncate">{s.nome}</p>
												<p className="text-[10px] text-rose-500">Saldo: {s.saldo} {s.unidade} (mín: {s.minimo})</p>
											</div>
										</div>
										<span className="text-[10px] font-bold text-rose-500 bg-rose-100 px-2 py-0.5 rounded-full flex-shrink-0 ml-3">Crítico</span>
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
