import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Utils } from "@/utils";
import { Order, Expense } from "@/types";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ComposedChart,
	Line,
	LabelList,
	Legend,
} from "recharts";
import {
	TrendingUp,
	DollarSign,
	Wallet,
	ArrowDownRight,
	ArrowUpRight,
	Filter,
	CheckCircle2,
	Clock,
	XCircle,
	BarChart2,
} from "lucide-react";

// ─── Tipos internos ─────────────────────────────────────────────────────────
type OrderStatusFilter = "CONCLUIDA" | "ABERTA" | "CANCELADA" | "ALL";

// ─── Componente ─────────────────────────────────────────────────────────────
export const DashboardModule = ({
	orders,
	expenses,
}: {
	orders: Order[];
	expenses: Expense[];
}) => {
	const now = new Date();
	const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
		.toISOString()
		.split("T")[0];
	const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
		.toISOString()
		.split("T")[0];

	const [startDate, setStartDate] = useState(defaultStart);
	const [endDate, setEndDate] = useState(defaultEnd);
	const [selectedServices, setSelectedServices] = useState<string[]>([]);

	// Status de pagamento — padrão vazio = todos os status (bug PAGO corrigido)
	const [selectedPaymentStatus, setSelectedPaymentStatus] = useState<string[]>(
		[]
	);
	const paymentStatusOptions = ["PAGO", "PARCIAL", "NAO_PAGO"];

	// Filtro de status das ordens (botão rápido)
	const [orderStatusFilter, setOrderStatusFilter] =
		useState<OrderStatusFilter>("CONCLUIDA");

	// Anos disponíveis
	const allYears = useMemo(() => {
		const years = new Set<string>();
		orders.forEach((o) => {
			const dateStr = o.data_conclusao || o.data;
			if (dateStr) years.add(new Date(dateStr).getFullYear().toString());
		});
		expenses.forEach((e) => {
			if (e.vencimento)
				years.add(new Date(e.vencimento).getFullYear().toString());
		});
		const currentYear = new Date().getFullYear().toString();
		if (!years.has(currentYear)) years.add(currentYear);
		return Array.from(years).sort();
	}, [orders, expenses]);

	const [selectedYears, setSelectedYears] = useState<string[]>([
		new Date().getFullYear().toString(),
	]);

	const allServices = useMemo(() => {
		const services = new Set<string>();
		orders.forEach((o) => o.items.forEach((i) => services.add(i.servico)));
		return Array.from(services);
	}, [orders]);

	// ─── Contadores rápidos de status ───────────────────────────────────────
	const statusCounts = useMemo(() => {
		const concluded = orders.filter((o) => o.status === "CONCLUIDA").length;
		const open = orders.filter((o) => o.status === "ABERTA").length;
		const cancelled = orders.filter((o) => o.status === "CANCELADA").length;
		return { concluded, open, cancelled };
	}, [orders]);

	// ─── Helpers ────────────────────────────────────────────────────────────
	const filterByDate = (dateStr: string, start: string, end: string) => {
		const date = new Date(dateStr);
		const s = start ? new Date(start) : null;
		const e = end ? new Date(end) : null;
		if (e) e.setHours(23, 59, 59, 999);
		return (!s || date >= s) && (!e || date <= e);
	};

	// ─── Filtragem principal ─────────────────────────────────────────────────
	const currentOrders = useMemo(() => {
		return orders.filter((o) => {
			// Filtro de status da OS
			if (orderStatusFilter !== "ALL" && o.status !== orderStatusFilter)
				return false;

			// Filtro de Data
			if (!filterByDate(o.data_conclusao || o.data, startDate, endDate))
				return false;

			// Filtro de Serviços
			if (selectedServices.length > 0) {
				const hasService = o.items.some((i) =>
					selectedServices.includes(i.servico)
				);
				if (!hasService) return false;
			}

			// Filtro de Status de Pagamento (vazio = todos)
			if (selectedPaymentStatus.length > 0) {
				const status = o.status_pagamento || "NAO_PAGO";
				if (!selectedPaymentStatus.includes(status)) return false;
			}

			return true;
		});
	}, [
		orders,
		startDate,
		endDate,
		selectedServices,
		selectedPaymentStatus,
		orderStatusFilter,
	]);

	const currentExpenses = useMemo(() => {
		return expenses.filter((e) => {
			if (e.status !== "PAGO") return false;
			if (!filterByDate(e.vencimento, startDate, endDate)) return false;
			return true;
		});
	}, [expenses, startDate, endDate]);

	const calculateOrderTotal = (order: Order) => {
		if (selectedServices.length > 0) {
			return order.items.reduce(
				(acc, item) =>
					selectedServices.includes(item.servico) ? acc + item.total : acc,
				0
			);
		}
		return order.total;
	};

	// ─── KPIs ───────────────────────────────────────────────────────────────
	const kpis = useMemo(() => {
		const revenue = currentOrders.reduce(
			(acc, o) => acc + calculateOrderTotal(o),
			0
		);
		const expense = currentExpenses.reduce((acc, e) => acc + e.valor, 0);
		const profit = revenue - expense;
		const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
		return { revenue, expense, profit, margin };
	}, [currentOrders, currentExpenses, selectedServices]);

	// ─── Dados mensais ───────────────────────────────────────────────────────
	const monthlyData = useMemo(() => {
		const data = Array(12)
			.fill(0)
			.map((_, i) => {
				const d = new Date();
				d.setMonth(i);
				return {
					name: d.toLocaleString("pt-BR", { month: "short" }),
					receita: 0,
					despesa: 0,
					lucro: 0,
				};
			});

		orders
			.filter((o) =>
				orderStatusFilter === "ALL"
					? true
					: o.status === orderStatusFilter
			)
			.forEach((o) => {
				const d = new Date(o.data_conclusao || o.data);
				if (!selectedYears.includes(d.getFullYear().toString())) return;
				const status = o.status_pagamento || "NAO_PAGO";
				if (
					selectedPaymentStatus.length > 0 &&
					!selectedPaymentStatus.includes(status)
				)
					return;
				if (
					selectedServices.length === 0 ||
					o.items.some((i) => selectedServices.includes(i.servico))
				) {
					data[d.getMonth()].receita += calculateOrderTotal(o);
				}
			});

		expenses
			.filter((e) => e.status === "PAGO")
			.forEach((e) => {
				const d = new Date(e.vencimento);
				if (selectedYears.includes(d.getFullYear().toString()))
					data[d.getMonth()].despesa += e.valor;
			});

		data.forEach((d) => (d.lucro = d.receita - d.despesa));
		return data;
	}, [
		orders,
		expenses,
		selectedServices,
		selectedYears,
		selectedPaymentStatus,
		orderStatusFilter,
	]);

	// ─── Dados diários ───────────────────────────────────────────────────────
	const dailyData = useMemo(() => {
		const activeStart = startDate
			? new Date(startDate)
			: new Date(now.getFullYear(), now.getMonth(), 1);
		const activeEnd = endDate ? new Date(endDate) : new Date();
		const daysMap = new Map<string, { revenue: number; volume: number }>();

		currentOrders.forEach((o) => {
			const key = new Date(o.data_conclusao || o.data)
				.toISOString()
				.split("T")[0];
			const cur = daysMap.get(key) || { revenue: 0, volume: 0 };
			daysMap.set(key, {
				revenue: cur.revenue + calculateOrderTotal(o),
				volume: cur.volume + 1,
			});
		});

		const result = [];
		let curr = new Date(activeStart);
		while (curr <= activeEnd) {
			const key = curr.toISOString().split("T")[0];
			const val = daysMap.get(key) || { revenue: 0, volume: 0 };
			result.push({
				date: curr.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
				receita: val.revenue,
				volume: val.volume,
			});
			curr.setDate(curr.getDate() + 1);
		}
		return result.length > 31
			? result.filter((_, i) => i % Math.ceil(result.length / 30) === 0)
			: result;
	}, [currentOrders, startDate, endDate, selectedServices]);

	// ─── Top Serviços / Clientes ──────────────────────────────────────────────
	const topServices = useMemo(() => {
		const map = new Map<string, { volume: number; revenue: number }>();
		currentOrders.forEach((o) =>
			o.items.forEach((i) => {
				if (selectedServices.length === 0 || selectedServices.includes(i.servico)) {
					const cur = map.get(i.servico) || { volume: 0, revenue: 0 };
					map.set(i.servico, {
						volume: cur.volume + (i.quantidade || 1),
						revenue: cur.revenue + (i.total || 0),
					});
				}
			})
		);
		return Array.from(map.entries())
			.map(([name, val]) => ({ name, ...val }))
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, 5);
	}, [currentOrders, selectedServices]);

	const topClients = useMemo(() => {
		const map = new Map<string, { volume: number; revenue: number }>();
		currentOrders.forEach((o) => {
			const cur = map.get(o.cliente_nome) || { volume: 0, revenue: 0 };
			map.set(o.cliente_nome, {
				volume: cur.volume + 1,
				revenue: cur.revenue + calculateOrderTotal(o),
			});
		});
		return Array.from(map.entries())
			.map(([name, val]) => ({ name, ...val }))
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, 5);
	}, [currentOrders, selectedServices]);

	// ─── UI ──────────────────────────────────────────────────────────────────
	const statusButtons: {
		key: OrderStatusFilter;
		label: string;
		icon: React.ReactNode;
		colors: string;
		activeColors: string;
		count: number;
	}[] = [
		{
			key: "CONCLUIDA",
			label: "Concluídas",
			icon: <CheckCircle2 className="w-4 h-4" />,
			colors: "text-emerald-600 border-emerald-200 bg-white",
			activeColors: "bg-emerald-500 text-white border-emerald-500 shadow-emerald-200",
			count: statusCounts.concluded,
		},
		{
			key: "ABERTA",
			label: "Em Aberto",
			icon: <Clock className="w-4 h-4" />,
			colors: "text-blue-600 border-blue-200 bg-white",
			activeColors: "bg-blue-500 text-white border-blue-500 shadow-blue-200",
			count: statusCounts.open,
		},
		{
			key: "CANCELADA",
			label: "Canceladas",
			icon: <XCircle className="w-4 h-4" />,
			colors: "text-slate-500 border-slate-200 bg-white",
			activeColors: "bg-slate-600 text-white border-slate-600 shadow-slate-200",
			count: statusCounts.cancelled,
		},
		{
			key: "ALL",
			label: "Todas",
			icon: <BarChart2 className="w-4 h-4" />,
			colors: "text-indigo-600 border-indigo-200 bg-white",
			activeColors: "bg-indigo-500 text-white border-indigo-500 shadow-indigo-200",
			count: orders.length,
		},
	];

	return (
		<div className="space-y-5 animate-in fade-in duration-500 pb-20 md:pb-0">

			{/* ── Botões de status rápido ── */}
			<div className="flex flex-wrap gap-2">
				{statusButtons.map((btn) => (
					<button
						key={btn.key}
						onClick={() => setOrderStatusFilter(btn.key)}
						className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-semibold text-sm shadow-sm transition-all duration-200 ${
							orderStatusFilter === btn.key
								? `${btn.activeColors} shadow-lg`
								: `${btn.colors} hover:shadow-md`
						}`}
					>
						{btn.icon}
						{btn.label}
						<span
							className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
								orderStatusFilter === btn.key
									? "bg-white/25"
									: "bg-slate-100 text-slate-600"
							}`}
						>
							{btn.count}
						</span>
					</button>
				))}
			</div>

			{/* ── Barra de filtros ── */}
			<Card className="p-4 bg-white sticky top-0 z-20 shadow-sm border-b border-indigo-100 overflow-visible">
				<div className="flex flex-col md:flex-row gap-3 items-end flex-wrap">
					<div className="flex items-center gap-2 text-indigo-600 font-bold uppercase text-xs mb-2 md:mb-0 mr-1">
						<Filter className="w-4 h-4" /> Filtros
					</div>
					<div className="w-full md:w-36">
						<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Início</label>
						<input
							type="date"
							className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>
					<div className="w-full md:w-36">
						<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Fim</label>
						<input
							type="date"
							className="w-full border border-slate-200 rounded-xl p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
					<div className="w-full md:w-28">
						<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Ano</label>
						<MultiSelect
							options={allYears}
							selected={selectedYears}
							onChange={setSelectedYears}
							placeholder="Ano"
						/>
					</div>
					<div className="w-full md:w-44">
						<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Pagamento</label>
						<MultiSelect
							options={paymentStatusOptions}
							selected={selectedPaymentStatus}
							onChange={setSelectedPaymentStatus}
							placeholder="Todos"
						/>
					</div>
					<div className="w-full md:w-56">
						<label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Serviços</label>
						<MultiSelect
							options={allServices}
							selected={selectedServices}
							onChange={setSelectedServices}
							placeholder="Todos os serviços"
						/>
					</div>
					<button
						onClick={() => {
							setStartDate(defaultStart);
							setEndDate(defaultEnd);
							setSelectedServices([]);
							setSelectedYears([new Date().getFullYear().toString()]);
							setSelectedPaymentStatus([]);
							setOrderStatusFilter("CONCLUIDA");
						}}
						className="text-xs font-bold text-red-500 hover:text-red-700 px-3 py-2 transition"
					>
						LIMPAR
					</button>
				</div>
			</Card>

			{/* ── KPI Cards ── */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="p-5 rounded-2xl border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">Receita</p>
							<h3 className="text-2xl font-bold mt-1">{Utils.formatCurrency(kpis.revenue)}</h3>
							<p className="text-emerald-100 text-xs mt-1">{currentOrders.length} ordens</p>
						</div>
						<div className="bg-white/20 p-2 rounded-xl">
							<TrendingUp className="w-5 h-5" />
						</div>
					</div>
				</Card>

				<Card className="p-5 rounded-2xl border-0 bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-lg shadow-red-200">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-red-100 text-xs font-semibold uppercase tracking-wider">Despesas</p>
							<h3 className="text-2xl font-bold mt-1">{Utils.formatCurrency(kpis.expense)}</h3>
							<p className="text-red-100 text-xs mt-1">pagas no período</p>
						</div>
						<div className="bg-white/20 p-2 rounded-xl">
							<ArrowDownRight className="w-5 h-5" />
						</div>
					</div>
				</Card>

				<Card className="p-5 rounded-2xl border-0 bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-indigo-100 text-xs font-semibold uppercase tracking-wider">Lucro</p>
							<h3 className="text-2xl font-bold mt-1">{Utils.formatCurrency(kpis.profit)}</h3>
							<p className="text-indigo-100 text-xs mt-1">resultado líquido</p>
						</div>
						<div className="bg-white/20 p-2 rounded-xl">
							<Wallet className="w-5 h-5" />
						</div>
					</div>
				</Card>

				<Card className="p-5 rounded-2xl border-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200">
					<div className="flex justify-between items-start">
						<div>
							<p className="text-amber-100 text-xs font-semibold uppercase tracking-wider">Margem</p>
							<h3 className="text-2xl font-bold mt-1">{kpis.margin.toFixed(1)}%</h3>
							<p className="text-amber-100 text-xs mt-1">receita vs despesa</p>
						</div>
						<div className="bg-white/20 p-2 rounded-xl">
							<ArrowUpRight className="w-5 h-5" />
						</div>
					</div>
				</Card>
			</div>

			{/* ── Gráfico Mensal ── */}
			<Card className="p-6 rounded-2xl h-[380px]">
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-2">
					<div>
						<h4 className="text-base font-bold text-slate-800">Fluxo de Caixa Mensal</h4>
						<p className="text-xs text-slate-400">
							{orderStatusFilter === "ALL" ? "Todas as ordens" : orderStatusFilter} •{" "}
							{selectedPaymentStatus.length > 0
								? selectedPaymentStatus.join(", ")
								: "Todos os pagamentos"}
						</p>
					</div>
					<div className="flex gap-4 text-xs font-medium">
						<span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block" /> Receita</span>
						<span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-400 inline-block" /> Despesa</span>
						<span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" /> Lucro</span>
					</div>
				</div>
				<ResponsiveContainer width="100%" height="85%">
					<ComposedChart data={monthlyData}>
						<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
						<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
						<YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
						<Tooltip
							cursor={{ fill: "#f8fafc" }}
							contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
							formatter={(v: number) => Utils.formatCurrency(v)}
						/>
						<Bar dataKey="receita" fill="#10b981" radius={[6, 6, 0, 0]} barSize={18} />
						<Bar dataKey="despesa" fill="#f87171" radius={[6, 6, 0, 0]} barSize={18} />
						<Line type="monotone" dataKey="lucro" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1" }} />
					</ComposedChart>
				</ResponsiveContainer>
			</Card>

			{/* ── Top Serviços e Clientes ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
				<Card className="p-6 rounded-2xl h-[360px]">
					<h4 className="text-base font-bold text-slate-800 mb-1">Top Serviços</h4>
					<p className="text-xs text-slate-400 mb-5">Volume vs Receita</p>
					<ResponsiveContainer width="100%" height="82%">
						<ComposedChart data={topServices} layout="vertical" margin={{ left: 10, right: 20 }}>
							<CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#e2e8f0" />
							<XAxis type="number" hide />
							<YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }} />
							<Tooltip
								cursor={{ fill: "transparent" }}
								contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
							/>
							<Legend verticalAlign="top" height={30} />
							<Bar dataKey="volume" name="Qtd" fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={16}>
								<LabelList dataKey="volume" position="right" style={{ fill: "#3b82f6", fontSize: "10px", fontWeight: "bold" }} />
							</Bar>
							<Bar dataKey="revenue" name="Receita" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={8}>
								<LabelList dataKey="revenue" position="right" formatter={(v: number) => `R$${v.toFixed(0)}`} style={{ fill: "#8b5cf6", fontSize: "10px" }} />
							</Bar>
						</ComposedChart>
					</ResponsiveContainer>
				</Card>

				<Card className="p-6 rounded-2xl h-[360px]">
					<h4 className="text-base font-bold text-slate-800 mb-1">Top Clientes</h4>
					<p className="text-xs text-slate-400 mb-5">Quem mais compra</p>
					<ResponsiveContainer width="100%" height="82%">
						<ComposedChart data={topClients} layout="vertical" margin={{ left: 10, right: 20 }}>
							<CartesianGrid strokeDasharray="3 3" horizontal vertical={false} stroke="#e2e8f0" />
							<XAxis type="number" hide />
							<YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={90} tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }} />
							<Tooltip
								cursor={{ fill: "transparent" }}
								contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
								formatter={(v: number) => Utils.formatCurrency(v)}
							/>
							<Bar dataKey="volume" name="Pedidos" fill="#10b981" radius={[0, 6, 6, 0]} barSize={16}>
								<LabelList dataKey="volume" position="right" style={{ fill: "#10b981", fontSize: "10px", fontWeight: "bold" }} />
							</Bar>
							<Bar dataKey="revenue" name="Total" fill="#f59e0b" radius={[0, 6, 6, 0]} barSize={8}>
								<LabelList dataKey="revenue" position="right" formatter={(v: number) => `R$${v.toFixed(0)}`} style={{ fill: "#f59e0b", fontSize: "10px" }} />
							</Bar>
						</ComposedChart>
					</ResponsiveContainer>
				</Card>
			</div>

			{/* ── Evolução Diária ── */}
			<Card className="p-6 rounded-2xl h-[320px]">
				<h4 className="text-base font-bold text-slate-800 mb-5">Evolução Diária de Receita</h4>
				<ResponsiveContainer width="100%" height="82%">
					<ComposedChart data={dailyData}>
						<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
						<XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
						<YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
						<YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
						<Tooltip
							contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
							formatter={(v: number, name: string) =>
								name === "receita" ? Utils.formatCurrency(v) : v
							}
						/>
						<Legend verticalAlign="top" height={30} />
						<Bar yAxisId="right" dataKey="volume" name="Pedidos" fill="#e2e8f0" barSize={28} radius={[4, 4, 0, 0]} opacity={0.7} />
						<Line yAxisId="left" type="monotone" dataKey="receita" name="Receita" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3, fill: "#4f46e5" }} />
					</ComposedChart>
				</ResponsiveContainer>
			</Card>
		</div>
	);
};
