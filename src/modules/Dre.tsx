import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { DataTable, PageHeader, Select, TableHead, Th } from "@/components/ui";
import { Utils } from "@/utils";
import { Order, Expense } from "@/types";
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	AreaChart,
	Area,
} from "recharts";
import {
	TrendingUp,
	TrendingDown,
	DollarSign,
	ArrowUpRight,
	ArrowDownRight,
	Calendar,
	Filter,
	FileText,
	MinusCircle,
	PlusCircle,
	AlertTriangle,
	CheckCircle,
	Clock,
	BarChart2,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (v: number) => Utils.formatCurrency(v);

const MONTHS_PT = [
	"Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
	"Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const getMonthLabel = (ym: string) => {
	const [y, m] = ym.split("-");
	return `${MONTHS_PT[parseInt(m) - 1]}/${y}`;
};

// ─── Componente DRE ──────────────────────────────────────────────────────────
export const DreModule = ({
	orders = [],
	expenses = [],
}: {
	orders: Order[];
	expenses: Expense[];
}) => {
	// ── Filtro de período ────────────────────────────────────────────────────
	const currentYear = new Date().getFullYear();
	const [selectedYear, setSelectedYear] = useState(currentYear);
	const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // null = ano inteiro

	const availableYears = useMemo(() => {
		const years = new Set<number>();
		orders.forEach((o) => {
			const efetiva = Utils.effectiveOrderDate(o);
			if (efetiva) years.add(parseInt(efetiva.slice(0, 4)));
		});
		expenses.forEach((e) => {
			if (e.vencimento) years.add(parseInt(e.vencimento.slice(0, 4)));
		});
		if (years.size === 0) years.add(currentYear);
		return Array.from(years).sort((a, b) => b - a);
	}, [orders, expenses, currentYear]);

	// ── Filtra dados pelo período selecionado ────────────────────────────────
	const periodPrefix = useMemo(() => {
		if (selectedMonth !== null) {
			return `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
		}
		return `${selectedYear}`;
	}, [selectedYear, selectedMonth]);

	const filteredOrders = useMemo(
		() => orders.filter((o) => Utils.effectiveOrderDate(o)?.startsWith(periodPrefix)),
		[orders, periodPrefix]
	);

	const filteredExpenses = useMemo(
		() => expenses.filter((e) => e.vencimento?.startsWith(periodPrefix)),
		[expenses, periodPrefix]
	);

	// ── Cálculos DRE ────────────────────────────────────────────────────────
	const dre = useMemo(() => {
		// RECEITA BRUTA: total de todas as ordens (exceto canceladas)
		const ordensValidas = filteredOrders.filter((o) => o.status !== "CANCELADA");
		const receitaBruta = ordensValidas.reduce((acc, o) => acc + (o.total || 0), 0);

		// DEDUÇÕES: ordens canceladas (valor que não se realizou)
		const ordensCanceladas = filteredOrders.filter((o) => o.status === "CANCELADA");
		const deducoes = ordensCanceladas.reduce((acc, o) => acc + (o.total || 0), 0);

		// RECEITA LÍQUIDA
		const receitaLiquida = receitaBruta;

		// DESPESAS OPERACIONAIS
		const despesasTotais = filteredExpenses.reduce((acc, e) => acc + (e.valor || 0), 0);
		const despesasPagas = filteredExpenses
			.filter((e) => e.status === "PAGO")
			.reduce((acc, e) => acc + (e.valor || 0), 0);
		const despesasPendentes = filteredExpenses
			.filter((e) => e.status === "PENDENTE")
			.reduce((acc, e) => acc + (e.valor || 0), 0);

		// RESULTADO OPERACIONAL
		const resultadoOperacional = receitaLiquida - despesasTotais;

		// CONTAS A RECEBER (ordens não pagas / parcialmente pagas, exceto canceladas)
		const contasReceber = ordensValidas
			.filter((o) => o.status_pagamento !== "PAGO")
			.reduce((acc, o) => acc + (o.total || 0), 0);

		// CONTAS A PAGAR (despesas pendentes)
		const contasPagar = despesasPendentes;

		// RECEITA RECEBIDA (ordens pagas)
		const receitaRecebida = ordensValidas
			.filter((o) => o.status_pagamento === "PAGO")
			.reduce((acc, o) => acc + (o.total || 0), 0);

		// MARGEM DE LUCRO
		const margemLucro = receitaLiquida > 0
			? (resultadoOperacional / receitaLiquida) * 100
			: 0;

		return {
			receitaBruta,
			deducoes,
			receitaLiquida,
			despesasTotais,
			despesasPagas,
			despesasPendentes,
			resultadoOperacional,
			contasReceber,
			contasPagar,
			receitaRecebida,
			margemLucro,
			totalOrdens: ordensValidas.length,
			totalDespesas: filteredExpenses.length,
			ordensCanceladas: ordensCanceladas.length,
		};
	}, [filteredOrders, filteredExpenses]);

	// ── Dados mensais para gráficos ─────────────────────────────────────────
	const monthlyData = useMemo(() => {
		const months: Record<string, { receita: number; despesa: number; resultado: number }> = {};

		// Inicializa os 12 meses do ano selecionado
		for (let m = 1; m <= 12; m++) {
			const key = `${selectedYear}-${String(m).padStart(2, "0")}`;
			months[key] = { receita: 0, despesa: 0, resultado: 0 };
		}

		// Receita (ordens válidas)
		orders
			.filter((o) => Utils.effectiveOrderDate(o)?.startsWith(`${selectedYear}`) && o.status !== "CANCELADA")
			.forEach((o) => {
				const key = Utils.effectiveOrderDate(o).slice(0, 7);
				if (months[key]) months[key].receita += o.total || 0;
			});

		// Despesas
		expenses
			.filter((e) => e.vencimento?.startsWith(`${selectedYear}`))
			.forEach((e) => {
				const key = e.vencimento.slice(0, 7);
				if (months[key]) months[key].despesa += e.valor || 0;
			});

		// Resultado
		Object.values(months).forEach((m) => {
			m.resultado = m.receita - m.despesa;
		});

		return Object.entries(months)
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([key, val]) => ({
				mes: MONTHS_PT[parseInt(key.split("-")[1]) - 1]?.slice(0, 3),
				...val,
			}));
	}, [orders, expenses, selectedYear]);

	// ── Composição de despesas (top 10) ─────────────────────────────────────
	const expenseComposition = useMemo(() => {
		const groups: Record<string, number> = {};
		filteredExpenses.forEach((e) => {
			const cat = e.produto || "Outros";
			groups[cat] = (groups[cat] || 0) + (e.valor || 0);
		});
		return Object.entries(groups)
			.sort(([, a], [, b]) => b - a)
			.slice(0, 10)
			.map(([name, value]) => ({ name, value }));
	}, [filteredExpenses]);

	// ── Composição de receita por forma de pagamento ─────────────────────────
	const revenueByPayment = useMemo(() => {
		const groups: Record<string, number> = {};
		filteredOrders
			.filter((o) => o.status !== "CANCELADA")
			.forEach((o) => {
				const forma = o.forma_pagamento || "Não informado";
				groups[forma] = (groups[forma] || 0) + (o.total || 0);
			});
		return Object.entries(groups)
			.sort(([, a], [, b]) => b - a)
			.map(([name, value]) => ({ name, value }));
	}, [filteredOrders]);

	// ── Contas a receber detalhadas ──────────────────────────────────────────
	const contasReceberDetail = useMemo(() => {
		return filteredOrders
			.filter((o) => o.status !== "CANCELADA" && o.status_pagamento !== "PAGO")
			.sort((a, b) => (b.total || 0) - (a.total || 0))
			.slice(0, 10);
	}, [filteredOrders]);

	// ── Contas a pagar detalhadas ────────────────────────────────────────────
	const contasPagarDetail = useMemo(() => {
		return filteredExpenses
			.filter((e) => e.status === "PENDENTE")
			.sort((a, b) => (a.vencimento || "").localeCompare(b.vencimento || ""))
			.slice(0, 10);
	}, [filteredExpenses]);

	// ── Cores para gráficos ─────────────────────────────────────────────────
	const COLORS = [
		"#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
		"#818cf8", "#4f46e5", "#7c3aed", "#5b21b6",
		"#3730a3", "#312e81",
	];

	const periodLabel = selectedMonth !== null
		? `${MONTHS_PT[selectedMonth]} de ${selectedYear}`
		: `Ano ${selectedYear}`;

	// ── Render ──────────────────────────────────────────────────────────────
	return (
		<div className="space-y-6">
			{/* ── Header + Filtros ─────────────────────────────────── */}
			<PageHeader
				title="DRE - Demonstrativo de Resultados"
				subtitle={periodLabel}
				actions={
					<>
						<Filter className="w-4 h-4 text-ink-faint" />
						{/* `!` obrigatório: `w-full` do kit venceria a largura automática. */}
						<Select
							className="!w-auto"
							value={selectedYear}
							onChange={(e) => setSelectedYear(Number(e.target.value))}
						>
							{availableYears.map((y) => (
								<option key={y} value={y}>{y}</option>
							))}
						</Select>
						<Select
							className="!w-auto"
							value={selectedMonth ?? "all"}
							onChange={(e) =>
								setSelectedMonth(e.target.value === "all" ? null : Number(e.target.value))
							}
						>
							<option value="all">Ano inteiro</option>
							{MONTHS_PT.map((m, i) => (
								<option key={m} value={i}>{m}</option>
							))}
						</Select>
					</>
				}
			/>

			{/* ── Cards Resumo ────────────────────────────────────── */}
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
				<Card className="p-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Receita Bruta</span>
						<div className="p-1.5 bg-success-50 rounded-lg">
							<TrendingUp className="w-4 h-4 text-success-500" />
						</div>
					</div>
					<p className="num text-xl font-bold text-success-600">{fmt(dre.receitaBruta)}</p>
					<p className="num text-2xs text-ink-faint mt-1">{dre.totalOrdens} ordens no periodo</p>
				</Card>

				<Card className="p-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Despesas</span>
						<div className="p-1.5 bg-danger-50 rounded-lg">
							<TrendingDown className="w-4 h-4 text-danger-500" />
						</div>
					</div>
					<p className="num text-xl font-bold text-danger-600">{fmt(dre.despesasTotais)}</p>
					<p className="num text-2xs text-ink-faint mt-1">{dre.totalDespesas} despesas no periodo</p>
				</Card>

				<Card className="p-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Resultado</span>
						<div className={`p-1.5 rounded-lg ${dre.resultadoOperacional >= 0 ? "bg-success-50" : "bg-danger-50"}`}>
							{dre.resultadoOperacional >= 0
								? <ArrowUpRight className="w-4 h-4 text-success-500" />
								: <ArrowDownRight className="w-4 h-4 text-danger-500" />
							}
						</div>
					</div>
					<p className={`num text-xl font-bold ${dre.resultadoOperacional >= 0 ? "text-success-600" : "text-danger-600"}`}>
						{fmt(dre.resultadoOperacional)}
					</p>
					<p className="num text-2xs text-ink-faint mt-1">
						Margem: {dre.margemLucro.toFixed(1)}%
					</p>
				</Card>

				<Card className="p-4">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-medium text-ink-muted uppercase tracking-wider">Saldo Pendente</span>
						<div className="p-1.5 bg-warning-50 rounded-lg">
							<Clock className="w-4 h-4 text-warning-500" />
						</div>
					</div>
					<p className="num text-xl font-bold text-warning-600">{fmt(dre.contasReceber - dre.contasPagar)}</p>
					<p className="text-2xs text-ink-faint mt-1">
						Receber - Pagar
					</p>
				</Card>
			</div>

			{/* ── Tabela DRE Formal ──────────────────────────────── */}
			<Card className="p-6">
				<h3 className="text-sm font-bold text-ink uppercase tracking-wider mb-4 flex items-center gap-2">
					<FileText className="w-4 h-4 text-primary-500" />
					Demonstrativo de Resultados do Exercicio - {periodLabel}
				</h3>
				{/* A casca já é um cartão; dentro deste Card ela perde borda e sombra. */}
				<DataTable className="!border-0 !shadow-none !rounded-none">
					<TableHead>
						<tr className="border-b-2 border-slate-200">
							<Th className="w-2/3">Descricao</Th>
							<Th align="right">Valor (R$)</Th>
						</tr>
					</TableHead>
					<tbody>
						{/* RECEITAS */}
						<tr className="bg-success-50/50">
							<td className="py-3 font-bold text-success-700 flex items-center gap-2">
								<PlusCircle className="w-4 h-4" /> RECEITA OPERACIONAL BRUTA
							</td>
							<td className="num py-3 text-right font-bold text-success-700">{fmt(dre.receitaBruta)}</td>
						</tr>
						<tr className="border-b border-slate-100">
							<td className="py-2 pl-8 text-ink-muted">Receita de servicos ({dre.totalOrdens} ordens)</td>
							<td className="num py-2 text-right text-ink-muted">{fmt(dre.receitaBruta)}</td>
						</tr>

						{/* DEDUÇÕES */}
						{dre.deducoes > 0 && (
							<>
								<tr className="bg-orange-50/50">
									<td className="py-3 font-bold text-orange-700 flex items-center gap-2">
										<MinusCircle className="w-4 h-4" /> (-) DEDUCOES
									</td>
									<td className="num py-3 text-right font-bold text-orange-700">({fmt(dre.deducoes)})</td>
								</tr>
								<tr className="border-b border-slate-100">
									<td className="py-2 pl-8 text-ink-muted">Ordens canceladas ({dre.ordensCanceladas})</td>
									<td className="num py-2 text-right text-ink-muted">({fmt(dre.deducoes)})</td>
								</tr>
							</>
						)}

						{/* RECEITA LÍQUIDA */}
						<tr className="bg-success-50/80 border-t-2 border-success-200">
							<td className="py-3 font-bold text-success-700">=&nbsp; RECEITA LIQUIDA</td>
							<td className="num py-3 text-right font-bold text-success-700">{fmt(dre.receitaLiquida)}</td>
						</tr>

						{/* DESPESAS OPERACIONAIS */}
						<tr className="bg-danger-50/50 mt-2">
							<td className="py-3 font-bold text-danger-700 flex items-center gap-2">
								<MinusCircle className="w-4 h-4" /> (-) DESPESAS OPERACIONAIS
							</td>
							<td className="num py-3 text-right font-bold text-danger-700">({fmt(dre.despesasTotais)})</td>
						</tr>
						<tr className="border-b border-slate-100">
							<td className="py-2 pl-8 text-ink-muted flex items-center gap-1.5">
								<CheckCircle className="w-3.5 h-3.5 text-success-400" /> Despesas pagas
							</td>
							<td className="num py-2 text-right text-ink-muted">({fmt(dre.despesasPagas)})</td>
						</tr>
						<tr className="border-b border-slate-100">
							<td className="py-2 pl-8 text-ink-muted flex items-center gap-1.5">
								<Clock className="w-3.5 h-3.5 text-warning-400" /> Despesas pendentes
							</td>
							<td className="num py-2 text-right text-warning-600">({fmt(dre.despesasPendentes)})</td>
						</tr>

						{/* Composição de despesas top 5 */}
						{expenseComposition.slice(0, 5).map((item) => (
							<tr key={item.name} className="border-b border-slate-50">
								<td className="py-1.5 pl-12 text-xs text-ink-faint">{item.name}</td>
								<td className="num py-1.5 text-right text-xs text-ink-faint">({fmt(item.value)})</td>
							</tr>
						))}

						{/* RESULTADO OPERACIONAL */}
						<tr className={`border-t-2 ${dre.resultadoOperacional >= 0 ? "bg-success-100/60 border-success-300" : "bg-danger-100/60 border-danger-300"}`}>
							<td className={`py-4 font-bold text-base ${dre.resultadoOperacional >= 0 ? "text-success-700" : "text-danger-700"}`}>
								=&nbsp; RESULTADO OPERACIONAL
							</td>
							<td className={`num py-4 text-right font-bold text-base ${dre.resultadoOperacional >= 0 ? "text-success-700" : "text-danger-700"}`}>
								{fmt(dre.resultadoOperacional)}
							</td>
						</tr>

						{/* MARGEM */}
						<tr className="border-b border-slate-100">
							<td className="py-2 pl-8 text-ink-muted text-xs">Margem de lucro operacional</td>
							<td className={`num py-2 text-right text-xs font-semibold ${dre.margemLucro >= 0 ? "text-success-600" : "text-danger-600"}`}>
								{dre.margemLucro.toFixed(1)}%
							</td>
						</tr>

						{/* SEPARADOR */}
						<tr><td colSpan={2} className="py-3"></td></tr>

						{/* CONTAS A RECEBER / PAGAR */}
						<tr className="bg-info-50/50">
							<td className="py-3 font-bold text-info-700 flex items-center gap-2">
								<PlusCircle className="w-4 h-4" /> CONTAS A RECEBER
							</td>
							<td className="num py-3 text-right font-bold text-info-700">{fmt(dre.contasReceber)}</td>
						</tr>
						<tr className="border-b border-slate-100">
							<td className="py-2 pl-8 text-ink-muted">Receita ja recebida (pago)</td>
							<td className="num py-2 text-right text-success-600">{fmt(dre.receitaRecebida)}</td>
						</tr>

						<tr className="bg-warning-50/50">
							<td className="py-3 font-bold text-warning-700 flex items-center gap-2">
								<MinusCircle className="w-4 h-4" /> CONTAS A PAGAR
							</td>
							<td className="num py-3 text-right font-bold text-warning-700">{fmt(dre.contasPagar)}</td>
						</tr>

						{/* BALANÇO PENDENTE */}
						<tr className="border-t-2 border-slate-300 bg-surface-sunken">
							<td className="py-3 font-bold text-ink">=&nbsp; BALANCO PENDENTE (Receber - Pagar)</td>
							<td className={`num py-3 text-right font-bold ${(dre.contasReceber - dre.contasPagar) >= 0 ? "text-success-700" : "text-danger-700"}`}>
								{fmt(dre.contasReceber - dre.contasPagar)}
							</td>
						</tr>
					</tbody>
				</DataTable>
			</Card>

			{/* ── Gráficos ────────────────────────────────────────── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Evolução Mensal */}
				<Card className="p-5">
					<h3 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
						<TrendingUp className="w-4 h-4 text-primary-500" />
						Evolucao Mensal - {selectedYear}
					</h3>
					<ResponsiveContainer width="100%" height={280}>
						<BarChart data={monthlyData} barGap={2}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
							<XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} />
							<YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
							<Tooltip
								formatter={(value: number, name: string) => [
									fmt(value),
									name === "receita" ? "Receita" : name === "despesa" ? "Despesa" : "Resultado",
								]}
								contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
							/>
							<Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} name="receita" />
							<Bar dataKey="despesa" fill="#ef4444" radius={[4, 4, 0, 0]} name="despesa" />
						</BarChart>
					</ResponsiveContainer>
				</Card>

				{/* Resultado Mensal (Area) */}
				<Card className="p-5">
					<h3 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
						<BarChart2 className="w-4 h-4 text-primary-500" />
						Resultado Mensal - {selectedYear}
					</h3>
					<ResponsiveContainer width="100%" height={280}>
						<AreaChart data={monthlyData}>
							<CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
							<XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} />
							<YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
							<Tooltip
								formatter={(value: number) => [fmt(value), "Resultado"]}
								contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
							/>
							<defs>
								<linearGradient id="dreGradient" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
									<stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
								</linearGradient>
							</defs>
							<Area
								type="monotone"
								dataKey="resultado"
								stroke="#6366f1"
								strokeWidth={2.5}
								fill="url(#dreGradient)"
							/>
						</AreaChart>
					</ResponsiveContainer>
				</Card>

				{/* Composição de Despesas (Pie) */}
				<Card className="p-5">
					<h3 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
						<DollarSign className="w-4 h-4 text-danger-500" />
						Composicao de Despesas
					</h3>
					{expenseComposition.length > 0 ? (
						<div className="flex items-center gap-4">
							<ResponsiveContainer width="50%" height={240}>
								<PieChart>
									<Pie
										data={expenseComposition}
										cx="50%"
										cy="50%"
										innerRadius={50}
										outerRadius={90}
										paddingAngle={2}
										dataKey="value"
									>
										{expenseComposition.map((item, i) => (
											<Cell key={item.name} fill={COLORS[i % COLORS.length]} />
										))}
									</Pie>
									<Tooltip
										formatter={(value: number) => fmt(value)}
										contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
									/>
								</PieChart>
							</ResponsiveContainer>
							<div className="flex-1 space-y-1.5 max-h-[240px] overflow-y-auto">
								{expenseComposition.map((item, i) => (
									<div key={item.name} className="flex items-center gap-2 text-xs">
										<div
											className="w-2.5 h-2.5 rounded-full flex-shrink-0"
											style={{ backgroundColor: COLORS[i % COLORS.length] }}
										/>
										<span className="text-ink-muted truncate flex-1">{item.name}</span>
										<span className="num text-ink-muted font-medium whitespace-nowrap">{fmt(item.value)}</span>
									</div>
								))}
							</div>
						</div>
					) : (
						<p className="text-sm text-ink-faint text-center py-10">Nenhuma despesa no periodo</p>
					)}
				</Card>

				{/* Receita por Forma de Pagamento (Pie) */}
				<Card className="p-5">
					<h3 className="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
						<DollarSign className="w-4 h-4 text-success-500" />
						Receita por Forma de Pagamento
					</h3>
					{revenueByPayment.length > 0 ? (
						<div className="flex items-center gap-4">
							<ResponsiveContainer width="50%" height={240}>
								<PieChart>
									<Pie
										data={revenueByPayment}
										cx="50%"
										cy="50%"
										innerRadius={50}
										outerRadius={90}
										paddingAngle={2}
										dataKey="value"
									>
										{revenueByPayment.map((item, i) => (
											<Cell key={item.name} fill={COLORS[i % COLORS.length]} />
										))}
									</Pie>
									<Tooltip
										formatter={(value: number) => fmt(value)}
										contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: 12 }}
									/>
								</PieChart>
							</ResponsiveContainer>
							<div className="flex-1 space-y-1.5 max-h-[240px] overflow-y-auto">
								{revenueByPayment.map((item, i) => (
									<div key={item.name} className="flex items-center gap-2 text-xs">
										<div
											className="w-2.5 h-2.5 rounded-full flex-shrink-0"
											style={{ backgroundColor: COLORS[i % COLORS.length] }}
										/>
										<span className="text-ink-muted truncate flex-1">{item.name}</span>
										<span className="num text-ink-muted font-medium whitespace-nowrap">{fmt(item.value)}</span>
									</div>
								))}
							</div>
						</div>
					) : (
						<p className="text-sm text-ink-faint text-center py-10">Nenhuma receita no periodo</p>
					)}
				</Card>
			</div>

			{/* ── Tabelas de Contas a Receber / Pagar ────────────── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Contas a Receber */}
				<Card className="p-5">
					<h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
						<PlusCircle className="w-4 h-4 text-info-500" />
						Contas a Receber (Top 10)
					</h3>
					{contasReceberDetail.length > 0 ? (
						<div className="space-y-2">
							{contasReceberDetail.map((o) => (
								<div key={o.id} className="flex items-center justify-between py-2 px-3 bg-info-50/50 rounded-lg">
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium text-ink truncate">
											OS#{o.id} - {o.cliente_nome}
										</p>
										<p className="num text-2xs text-ink-faint">
											{o.data?.slice(0, 10)} | {o.status_pagamento === "PARCIAL" ? "Parcial" : "Nao pago"}
										</p>
									</div>
									<span className="num text-sm font-bold text-info-600 ml-3 whitespace-nowrap">{fmt(o.total || 0)}</span>
								</div>
							))}
						</div>
					) : (
						<p className="text-sm text-ink-faint text-center py-8">Nenhuma conta a receber</p>
					)}
				</Card>

				{/* Contas a Pagar */}
				<Card className="p-5">
					<h3 className="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
						<MinusCircle className="w-4 h-4 text-warning-500" />
						Contas a Pagar (Proximas)
					</h3>
					{contasPagarDetail.length > 0 ? (
						<div className="space-y-2">
							{contasPagarDetail.map((e) => {
								const isOverdue = e.vencimento < new Date().toISOString().slice(0, 10);
								return (
									<div key={e.id} className={`flex items-center justify-between py-2 px-3 rounded-lg ${isOverdue ? "bg-danger-50/50" : "bg-warning-50/50"}`}>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-ink truncate flex items-center gap-1.5">
												{isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-danger-500 flex-shrink-0" />}
												{e.produto}
											</p>
											<p className="num text-2xs text-ink-faint">
												Venc: {e.vencimento} {isOverdue && "- VENCIDA"}
											</p>
										</div>
										<span className={`num text-sm font-bold ml-3 whitespace-nowrap ${isOverdue ? "text-danger-600" : "text-warning-600"}`}>
											{fmt(e.valor || 0)}
										</span>
									</div>
								);
							})}
						</div>
					) : (
						<p className="text-sm text-ink-faint text-center py-8">Nenhuma conta a pagar pendente</p>
					)}
				</Card>
			</div>
		</div>
	);
};
