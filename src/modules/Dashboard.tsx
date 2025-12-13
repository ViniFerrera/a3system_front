import React, { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Utils } from "@/utils";
import { Order, Expense } from "@/types";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	ComposedChart,
	Area,
	AreaChart,
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
} from "lucide-react";
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
	const allServices = useMemo(() => {
		const services = new Set<string>();
		orders.forEach((o) => o.items.forEach((i) => services.add(i.servico)));
		return Array.from(services);
	}, [orders]);
	const filterByDate = (dateStr: string, start: string, end: string) => {
		const date = new Date(dateStr);
		const s = start ? new Date(start) : null;
		const e = end ? new Date(end) : null;
		if (e) e.setHours(23, 59, 59, 999);
		return (!s || date >= s) && (!e || date <= e);
	};
	const currentOrders = useMemo(() => {
		return orders.filter((o) => {
			if (o.status !== "CONCLUIDA") return false;
			if (!filterByDate(o.data_conclusao || o.data, startDate, endDate))
				return false;
			if (selectedServices.length > 0) {
				const hasService = o.items.some((i) =>
					selectedServices.includes(i.servico)
				);
				if (!hasService) return false;
			}
			return true;
		});
	}, [orders, startDate, endDate, selectedServices]);
	const currentExpenses = useMemo(() => {
		return expenses.filter((e) => {
			if (e.status !== "PAGO") return false;
			if (!filterByDate(e.vencimento, startDate, endDate)) return false;
			return true;
		});
	}, [expenses, startDate, endDate]);
	const calculateOrderTotal = (order: Order) => {
		if (selectedServices.length === 0) return order.total;
		return order.items.reduce((acc, item) => {
			if (selectedServices.includes(item.servico)) {
				return acc + item.total;
			}
			return acc;
		}, 0);
	};
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
	const monthlyData = useMemo(() => {
		const data = Array(12)
			.fill(0)
			.map((_, i) => {
				const date = new Date();
				date.setMonth(i);
				return {
					name: date.toLocaleString("pt-BR", { month: "short" }),
					receita: 0,
					despesa: 0,
					lucro: 0,
				};
			});
		orders
			.filter((o) => o.status === "CONCLUIDA")
			.forEach((o) => {
				const d = new Date(o.data_conclusao || o.data);
				if (d.getFullYear() === new Date().getFullYear()) {
					if (
						selectedServices.length === 0 ||
						o.items.some((i) => selectedServices.includes(i.servico))
					) {
						data[d.getMonth()].receita += calculateOrderTotal(o);
					}
				}
			});
		expenses
			.filter((e) => e.status === "PAGO")
			.forEach((e) => {
				const d = new Date(e.vencimento);
				if (d.getFullYear() === new Date().getFullYear())
					data[d.getMonth()].despesa += e.valor;
			});
		data.forEach((d) => (d.lucro = d.receita - d.despesa));
		return data;
	}, [orders, expenses, selectedServices]);
	const dailyData = useMemo(() => {
		const activeStartDate = startDate
			? new Date(startDate)
			: new Date(new Date().getFullYear(), new Date().getMonth(), 1);
		const activeEndDate = endDate ? new Date(endDate) : new Date();
		const daysMap = new Map<string, { revenue: number; volume: number }>();
		currentOrders.forEach((o) => {
			const dateKey = new Date(o.data_conclusao || o.data)
				.toISOString()
				.split("T")[0];
			const current = daysMap.get(dateKey) || { revenue: 0, volume: 0 };
			daysMap.set(dateKey, {
				revenue: current.revenue + calculateOrderTotal(o),
				volume: current.volume + 1,
			});
		});
		const result = [];
		let curr = new Date(activeStartDate);
		while (curr <= activeEndDate) {
			const key = curr.toISOString().split("T")[0];
			const val = daysMap.get(key) || { revenue: 0, volume: 0 };
			result.push({
				date: curr.toLocaleDateString("pt-BR", {
					day: "2-digit",
					month: "2-digit",
				}),
				receita: val.revenue,
				volume: val.volume,
			});
			curr.setDate(curr.getDate() + 1);
		}
		return result.length > 31
			? result.filter((_, i) => i % Math.ceil(result.length / 30) === 0)
			: result;
	}, [currentOrders, startDate, endDate, selectedServices]);
	const topServices = useMemo(() => {
		const map = new Map<string, { volume: number; revenue: number }>();
		currentOrders.forEach((o) => {
			o.items.forEach((i) => {
				if (
					selectedServices.length === 0 ||
					selectedServices.includes(i.servico)
				) {
					const curr = map.get(i.servico) || { volume: 0, revenue: 0 };
					map.set(i.servico, {
						volume: curr.volume + (i.quantidade || 1),
						revenue: curr.revenue + (i.total || 0),
					});
				}
			});
		});
		return Array.from(map.entries())
			.map(([name, val]) => ({ name, ...val }))
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, 5);
	}, [currentOrders, selectedServices]);
	const topClients = useMemo(() => {
		const map = new Map<string, { volume: number; revenue: number }>();
		currentOrders.forEach((o) => {
			const curr = map.get(o.cliente_nome) || { volume: 0, revenue: 0 };
			map.set(o.cliente_nome, {
				volume: curr.volume + 1,
				revenue: curr.revenue + calculateOrderTotal(o),
			});
		});
		return Array.from(map.entries())
			.map(([name, val]) => ({ name, ...val }))
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, 5);
	}, [currentOrders, selectedServices]);
	const VariationBadge = ({
		val,
		isInverse = false,
	}: {
		val: number;
		isInverse?: boolean;
	}) => {
		const isPositive = val >= 0;
		const isGood = isInverse ? !isPositive : isPositive;
		const Color = isGood ? "text-emerald-600" : "text-red-600";
		const Icon = isPositive ? ArrowUpRight : ArrowDownRight;
		return (
			<div
				className={`flex items-center gap-1 text-xs font-bold ${Color} bg-white/80 px-1.5 py-0.5 rounded-[5px]`}
			>
				<Icon className='w-3 h-3' /> {Math.abs(val).toFixed(1)}%
			</div>
		);
	};
	return (
		<div className='space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0'>
			{" "}
			<Card className='p-4 bg-white sticky top-0 z-20 shadow-sm border-b border-indigo-100 overflow-visible'>
				{" "}
				<div className='flex flex-col md:flex-row gap-4 items-end min-w-max md:min-w-0'>
					{" "}
					<div className='flex items-center gap-2 text-indigo-600 font-bold uppercase text-xs w-full md:w-auto mb-2 md:mb-0'>
						<Filter className='w-4 h-4' /> Filtros
					</div>{" "}
					<div className='w-full md:w-40'>
						<label className='text-[10px] font-bold text-slate-400 uppercase mb-1 block'>
							Início
						</label>
						<input
							type='date'
							className='w-full border border-slate-200 rounded-[10px] p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none'
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>{" "}
					<div className='w-full md:w-40'>
						<label className='text-[10px] font-bold text-slate-400 uppercase mb-1 block'>
							Fim
						</label>
						<input
							type='date'
							className='w-full border border-slate-200 rounded-[10px] p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none'
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>{" "}
					<div className='w-full md:w-64'>
						<label className='text-[10px] font-bold text-slate-400 uppercase mb-1 block'>
							Serviços (Múltiplos)
						</label>
						<MultiSelect
							options={allServices}
							selected={selectedServices}
							onChange={setSelectedServices}
							placeholder='Todos os serviços'
						/>
					</div>{" "}
					<button
						onClick={() => {
							setStartDate(defaultStart);
							setEndDate(defaultEnd);
							setSelectedServices([]);
						}}
						className='text-xs font-bold text-red-500 hover:text-red-700 px-4 py-2.5 h-full transition'
					>
						REDEFINIR
					</button>{" "}
				</div>{" "}
			</Card>{" "}
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6'>
				{" "}
				<Card className='p-6 border-l-[4px] border-emerald-500'>
					<div className='flex justify-between items-start'>
						<div>
							<p className='text-xs text-slate-500 font-bold uppercase tracking-wider'>
								Receita
							</p>
							<h3 className='text-2xl font-bold text-slate-800 mt-1'>
								{Utils.formatCurrency(kpis.revenue)}
							</h3>
						</div>
						<div className='bg-emerald-50 p-2 rounded-[10px] text-emerald-600'>
							<TrendingUp className='w-5 h-5' />
						</div>
					</div>
				</Card>{" "}
				<Card className='p-6 border-l-[4px] border-red-500'>
					<div className='flex justify-between items-start'>
						<div>
							<p className='text-xs text-slate-500 font-bold uppercase tracking-wider'>
								Despesas
							</p>
							<h3 className='text-2xl font-bold text-slate-800 mt-1'>
								{Utils.formatCurrency(kpis.expense)}
							</h3>
						</div>
						<div className='bg-red-50 p-2 rounded-[10px] text-red-600'>
							<ArrowDownRight className='w-5 h-5' />
						</div>
					</div>
				</Card>{" "}
				<Card className='p-6 border-l-[4px] border-indigo-500'>
					<div className='flex justify-between items-start'>
						<div>
							<p className='text-xs text-slate-500 font-bold uppercase tracking-wider'>
								Lucro
							</p>
							<h3 className='text-2xl font-bold text-slate-800 mt-1'>
								{Utils.formatCurrency(kpis.profit)}
							</h3>
						</div>
						<div className='bg-indigo-50 p-2 rounded-[10px] text-indigo-600'>
							<Wallet className='w-5 h-5' />
						</div>
					</div>
				</Card>{" "}
				<Card className='p-6 border-l-[4px] border-amber-500'>
					<div className='flex justify-between items-start'>
						<div>
							<p className='text-xs text-slate-500 font-bold uppercase tracking-wider'>
								Margem
							</p>
							<h3 className='text-2xl font-bold text-slate-800 mt-1'>
								{kpis.margin.toFixed(1)}%
							</h3>
						</div>
						<div className='bg-amber-50 p-2 rounded-[10px] text-amber-600'>
							<ArrowUpRight className='w-5 h-5' />
						</div>
					</div>
				</Card>{" "}
			</div>{" "}
			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
				{" "}
				<Card className='p-6 lg:col-span-2 h-[400px]'>
					{" "}
					<div className='flex flex-col md:flex-row justify-between items-center mb-6'>
						{" "}
						<div className='mb-2 md:mb-0'>
							<h4 className='text-lg font-bold text-slate-800'>
								Fluxo de Caixa (Anual)
							</h4>
							<p className='text-xs text-slate-400'>
								Receitas e Despesas consolidadas mês a mês
							</p>
						</div>{" "}
						<div className='flex gap-4 text-xs font-medium'>
							<div className='flex items-center gap-1'>
								<div className='w-3 h-3 bg-emerald-500 rounded-sm'></div>{" "}
								Receita
							</div>
							<div className='flex items-center gap-1'>
								<div className='w-3 h-3 bg-red-400 rounded-sm'></div> Despesa
							</div>
							<div className='flex items-center gap-1'>
								<div className='w-3 h-3 bg-indigo-500 rounded-full'></div> Lucro
							</div>
						</div>{" "}
					</div>{" "}
					<ResponsiveContainer width='100%' height='85%'>
						{" "}
						<ComposedChart data={monthlyData}>
							{" "}
							<CartesianGrid
								strokeDasharray='3 3'
								vertical={false}
								stroke='#e2e8f0'
							/>{" "}
							<XAxis
								dataKey='name'
								axisLine={false}
								tickLine={false}
								tick={{ fill: "#64748b", fontSize: 12 }}
							/>{" "}
							<YAxis
								axisLine={false}
								tickLine={false}
								tick={{ fill: "#64748b", fontSize: 12 }}
							/>{" "}
							<Tooltip
								cursor={{ fill: "#f8fafc" }}
								contentStyle={{ borderRadius: "10px" }}
								formatter={(value: number) => Utils.formatCurrency(value)}
							/>{" "}
							<Bar
								dataKey='receita'
								fill='#10b981'
								radius={[4, 4, 0, 0]}
								barSize={20}
							/>{" "}
							<Bar
								dataKey='despesa'
								fill='#f87171'
								radius={[4, 4, 0, 0]}
								barSize={20}
							/>{" "}
							<Line
								type='monotone'
								dataKey='lucro'
								stroke='#6366f1'
								strokeWidth={3}
								dot={{ r: 4, fill: "#6366f1" }}
							/>{" "}
						</ComposedChart>{" "}
					</ResponsiveContainer>{" "}
				</Card>{" "}
				<Card className='p-6 h-[400px]'>
					{" "}
					<h4 className='text-lg font-bold text-slate-800 mb-1'>
						Top Serviços
					</h4>{" "}
					<p className='text-xs text-slate-400 mb-6'>
						Comparativo Volume vs Receita
					</p>{" "}
					<ResponsiveContainer width='100%' height='80%'>
						{" "}
						<ComposedChart
							data={topServices}
							layout='vertical'
							margin={{ left: 20, right: 20 }}
						>
							{" "}
							<CartesianGrid
								strokeDasharray='3 3'
								horizontal={true}
								vertical={false}
								stroke='#e2e8f0'
							/>{" "}
							<XAxis type='number' hide />{" "}
							<YAxis
								dataKey='name'
								type='category'
								axisLine={false}
								tickLine={false}
								width={100}
								tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
							/>{" "}
							<Tooltip
								cursor={{ fill: "transparent" }}
								contentStyle={{
									borderRadius: "10px",
									border: "none",
									boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
								}}
							/>{" "}
							<Legend verticalAlign='top' height={36} />{" "}
							<Bar
								dataKey='volume'
								name='Qtd'
								fill='#3b82f6'
								radius={[0, 5, 5, 0]}
								barSize={20}
							>
								<LabelList
									dataKey='volume'
									position='right'
									style={{
										fill: "#3b82f6",
										fontSize: "10px",
										fontWeight: "bold",
									}}
								/>
							</Bar>{" "}
							<Bar
								dataKey='revenue'
								name='Receita'
								fill='#8b5cf6'
								radius={[0, 5, 5, 0]}
								barSize={10}
							>
								<LabelList
									dataKey='revenue'
									position='right'
									formatter={(val: number) => `R$${val.toFixed(2)}`}
									style={{ fill: "#8b5cf6", fontSize: "10px" }}
								/>
							</Bar>{" "}
						</ComposedChart>{" "}
					</ResponsiveContainer>{" "}
				</Card>{" "}
				<Card className='p-6 h-[400px]'>
					{" "}
					<h4 className='text-lg font-bold text-slate-800 mb-1'>
						Top Clientes
					</h4>{" "}
					<p className='text-xs text-slate-400 mb-6'>
						Quem mais compra (Vol vs Valor)
					</p>{" "}
					<ResponsiveContainer width='100%' height='80%'>
						{" "}
						<ComposedChart
							data={topClients}
							layout='vertical'
							margin={{ left: 20, right: 20 }}
						>
							{" "}
							<CartesianGrid
								strokeDasharray='3 3'
								horizontal={true}
								vertical={false}
								stroke='#e2e8f0'
							/>{" "}
							<XAxis type='number' hide />{" "}
							<YAxis
								dataKey='name'
								type='category'
								axisLine={false}
								tickLine={false}
								width={100}
								tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }}
							/>{" "}
							<Tooltip
								cursor={{ fill: "transparent" }}
								contentStyle={{
									borderRadius: "10px",
									border: "none",
									boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
								}}
								formatter={(value: number) => Utils.formatCurrency(value)}
							/>{" "}
							<Bar
								dataKey='volume'
								name='Pedidos'
								fill='#10b981'
								radius={[0, 5, 5, 0]}
								barSize={20}
							>
								<LabelList
									dataKey='volume'
									position='right'
									style={{
										fill: "#10b981",
										fontSize: "10px",
										fontWeight: "bold",
									}}
								/>
							</Bar>{" "}
							<Bar
								dataKey='revenue'
								name='Total Gasto'
								fill='#f59e0b'
								radius={[0, 5, 5, 0]}
								barSize={10}
							>
								<LabelList
									dataKey='revenue'
									position='right'
									formatter={(val: number) => `R$${val.toFixed(2)}`}
									style={{ fill: "#f59e0b", fontSize: "10px" }}
								/>
							</Bar>{" "}
						</ComposedChart>{" "}
					</ResponsiveContainer>{" "}
				</Card>{" "}
			</div>{" "}
			<Card className='p-6 h-[350px]'>
				{" "}
				<h4 className='text-lg font-bold text-slate-800 mb-6'>
					Evolução de Receita e Volume Diário
				</h4>{" "}
				<ResponsiveContainer width='100%' height='80%'>
					{" "}
					<ComposedChart data={dailyData}>
						{" "}
						<CartesianGrid
							strokeDasharray='3 3'
							vertical={false}
							stroke='#e2e8f0'
						/>{" "}
						<XAxis
							dataKey='date'
							axisLine={false}
							tickLine={false}
							tick={{ fill: "#64748b", fontSize: 12 }}
						/>{" "}
						<YAxis
							yAxisId='left'
							axisLine={false}
							tickLine={false}
							tick={{ fill: "#64748b", fontSize: 12 }}
						/>{" "}
						<YAxis
							yAxisId='right'
							orientation='right'
							axisLine={false}
							tickLine={false}
							tick={{ fill: "#94a3b8", fontSize: 12 }}
						/>{" "}
						<Tooltip
							contentStyle={{
								borderRadius: "10px",
								border: "none",
								boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
							}}
							formatter={(value: number, name: string) =>
								name === "receita" ? Utils.formatCurrency(value) : value
							}
						/>{" "}
						<Legend verticalAlign='top' height={36} />{" "}
						<Bar
							yAxisId='right'
							dataKey='volume'
							name='Pedidos'
							fill='#cbd5e1'
							barSize={30}
							radius={[5, 5, 0, 0]}
							opacity={0.5}
						/>{" "}
						<Line
							yAxisId='left'
							type='monotone'
							dataKey='receita'
							name='Receita'
							stroke='#4f46e5'
							strokeWidth={3}
							dot={{ r: 4, fill: "#4f46e5" }}
						/>{" "}
					</ComposedChart>{" "}
				</ResponsiveContainer>{" "}
			</Card>{" "}
		</div>
	);
};
