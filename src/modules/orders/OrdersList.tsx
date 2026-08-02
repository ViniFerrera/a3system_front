import React, { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Utils } from "@/utils";
import { Order, Client } from "@/types";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
	Plus,
	Clock,
	Calendar,
	TrendingUp,
	TrendingDown,
	Minus,
	Settings,
	RefreshCcw,
	CheckCircle2,
	XCircle,
	BarChart2,
} from "lucide-react";
import { DataTable, TableHead, Th } from "@/components/ui/DataTable";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { OrderRow } from "./OrderRow";
import { SearchableSelect } from "./SearchableSelect";

// COMPONENTES AUXILIARES VISUAIS (MANTIDOS IGUAIS)
const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
	const chartData = data.map((val, i) => ({ i, val }));
	return (
		<div className='h-[40px] w-[80px]'>
			<ResponsiveContainer width='100%' height='100%'>
				<LineChart data={chartData}>
					<Line
						type='monotone'
						dataKey='val'
						stroke={color}
						strokeWidth={2}
						dot={false}
						isAnimationActive={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
};

const VariationIndicator = ({
	val,
	label = "mês",
}: {
	val: number;
	label?: string;
}) => {
	const isNeutral = val === 0;
	const isPositive = val > 0;
	if (isNeutral) {
		return (
			<div className='flex items-center gap-1 mt-2 text-2xs font-bold text-slate-400'>
				<Minus className='w-3 h-3' />
				<span>0% {label}</span>
			</div>
		);
	}
	return (
		<div
			className={`flex items-center gap-1 mt-2 text-2xs font-bold ${
				isPositive ? "text-emerald-600" : "text-red-500"
			}`}
		>
			{isPositive ? (
				<TrendingUp className='w-3 h-3' />
			) : (
				<TrendingDown className='w-3 h-3' />
			)}
			<span>
				{isPositive ? "+" : ""}
				{val.toFixed(0)}% {label}
			</span>
		</div>
	);
};

/** KPIs do topo da lista, calculados em `Orders.tsx` sobre as ordens filtradas. */
export interface OrdersSummary {
	totalOrders: number;
	openOrdersSnapshot: number;
	completedOrdersSnapshot: number;
	avgTimeDisplay: string;
	variationTotal: number;
	variationOpen: number;
	variationCompleted: number;
	sparklineData: number[];
}

export type FilterPaymentStatus = "TODOS" | "PAGO" | "NAO_PAGO" | "PARCIAL";
export type FilterOrderStatus = "TODOS" | "ABERTA" | "CONCLUIDA" | "CANCELADA";
export type FilterNF = "TODOS" | "COM_NF" | "SEM_NF";

interface OrdersListProps {
	orders: Order[];
	clients: Client[];
	filteredOrders: Order[];
	paginatedOrders: Order[];
	summary: OrdersSummary;
	/** Serviços distintos da tabela de preços, para o filtro. */
	uniqueServices: string[];

	filterStart: string;
	setFilterStart: React.Dispatch<React.SetStateAction<string>>;
	filterEnd: string;
	setFilterEnd: React.Dispatch<React.SetStateAction<string>>;
	filterClient: number;
	setFilterClient: React.Dispatch<React.SetStateAction<number>>;
	filterServices: string[];
	setFilterServices: React.Dispatch<React.SetStateAction<string[]>>;
	filterPaymentStatus: FilterPaymentStatus;
	setFilterPaymentStatus: React.Dispatch<React.SetStateAction<FilterPaymentStatus>>;
	filterOrderStatus: FilterOrderStatus;
	setFilterOrderStatus: React.Dispatch<React.SetStateAction<FilterOrderStatus>>;
	filterNF: FilterNF;
	setFilterNF: React.Dispatch<React.SetStateAction<FilterNF>>;

	currentPage: number;
	setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
	pageSize: number;
	setPageSize: React.Dispatch<React.SetStateAction<number>>;

	expandedOrderId: number | null;
	onToggleExpand: (id: number) => void;

	onNewOrder: () => void;
	onEditOrder: (order: Order) => void;
	onDelete: (id: number) => void;
	onUpdateStatus: (order: Order, updates: Partial<Order>) => void;
	onRefresh: () => void;
	onOpenConfig: () => void;
	onedriveConfig: { cid: string; folderPath: string } | null;
	isRefreshing: boolean;
}

/**
 * Vista de lista das ordens: cards de resumo, filtros, abas de status, tabela
 * e paginação. Os estados de filtro e paginação vivem em `Orders.tsx` e descem
 * por prop — é isso que os preserva ao ir para o formulário e voltar.
 */
export const OrdersList = ({
	orders,
	clients,
	filteredOrders,
	paginatedOrders,
	summary,
	uniqueServices,
	filterStart,
	setFilterStart,
	filterEnd,
	setFilterEnd,
	filterClient,
	setFilterClient,
	filterServices,
	setFilterServices,
	filterPaymentStatus,
	setFilterPaymentStatus,
	filterOrderStatus,
	setFilterOrderStatus,
	filterNF,
	setFilterNF,
	currentPage,
	setCurrentPage,
	pageSize,
	setPageSize,
	expandedOrderId,
	onToggleExpand,
	onNewOrder,
	onEditOrder,
	onDelete,
	onUpdateStatus,
	onRefresh,
	onOpenConfig,
	onedriveConfig,
	isRefreshing,
}: OrdersListProps) => {
	const clientOptions = useMemo(
		() => [
			{ id: 0, label: "Todos Clientes" },
			...clients.map((c) => ({ id: Number(c.id), label: c.nome })),
		],
		[clients]
	);

	const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));

	return (
		<>
			{/* 1. CARDS RESUMO */}
			<div className='grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4'>
				<Card className='p-3 sm:p-4 flex justify-between items-center bg-slate-50 border border-slate-100 shadow-sm relative overflow-hidden group'>
					<div className='absolute left-0 top-0 bottom-0 w-1 bg-indigo-500'></div>
					<div>
						<p className='text-2xs sm:text-xs text-slate-500 font-medium capitalize'>
							Total de ordens
						</p>
						<h3 className='num text-xl sm:text-2xl font-bold text-slate-800 mt-1'>
							{summary.totalOrders}
						</h3>
						<VariationIndicator val={summary.variationTotal} />
					</div>
					<div className='hidden sm:block'><MiniSparkline data={summary.sparklineData} color='#6366f1' /></div>
				</Card>

				<Card className='p-3 sm:p-4 flex justify-between items-center bg-amber-50/30 border border-amber-100 shadow-sm relative overflow-hidden group'>
					<div className='absolute left-0 top-0 bottom-0 w-1 bg-amber-500'></div>
					<div>
						<p className='text-2xs sm:text-xs text-slate-500 font-medium capitalize'>
							Ordens abertas
						</p>
						<h3 className='num text-xl sm:text-2xl font-bold text-slate-800 mt-1'>
							{summary.openOrdersSnapshot}
						</h3>
						<VariationIndicator val={summary.variationOpen} />
					</div>
					<div className='opacity-50'>
						<MiniSparkline
							data={[2, 4, 1, 5, 2, 1, summary.openOrdersSnapshot]}
							color='#f59e0b'
						/>
					</div>
				</Card>

				<Card className='p-3 sm:p-4 flex justify-between items-center bg-emerald-50/30 border border-emerald-100 shadow-sm relative overflow-hidden group'>
					<div className='absolute left-0 top-0 bottom-0 w-1 bg-emerald-500'></div>
					<div>
						<p className='text-2xs sm:text-xs text-slate-500 font-medium capitalize'>
							Ordens concluídas
						</p>
						<h3 className='num text-xl sm:text-2xl font-bold text-slate-800 mt-1'>
							{summary.completedOrdersSnapshot}
						</h3>
						<VariationIndicator val={summary.variationCompleted} />
					</div>
					<div className='opacity-50'>
						<MiniSparkline data={[1, 2, 3, 4, 3, 5, 6]} color='#10b981' />
					</div>
				</Card>
				<Card className='p-3 sm:p-4 flex justify-between items-center bg-blue-50/30 border border-blue-100 shadow-sm relative overflow-hidden group'>
					<div className='absolute left-0 top-0 bottom-0 w-1 bg-blue-500'></div>
					<div>
						<p className='text-2xs sm:text-xs text-slate-500 font-medium capitalize'>
							Tempo médio
						</p>
						<h3 className='num text-lg sm:text-xl font-bold text-slate-800 mt-1'>
							{summary.avgTimeDisplay}
						</h3>
						<div className='flex items-center gap-1 mt-2 text-2xs text-blue-500'>
							<Clock className='w-3 h-3' /> Conclusão
						</div>
					</div>
					<div className='opacity-50'>
						<MiniSparkline data={[10, 12, 11, 10, 9, 8, 10]} color='#3b82f6' />
					</div>
				</Card>
			</div>

			{/* 2. FILTROS — filtro e ações na mesma faixa; `flex-wrap` só entra em
			    jogo abaixo do ponto onde tudo deixa de caber numa linha. */}
			<div className='bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-3'>
				<div className='flex items-center gap-2 border border-slate-200 rounded-[10px] p-2 bg-slate-50 w-full sm:w-auto hover:border-indigo-200 transition-colors'>
					<Calendar className='w-4 h-4 text-slate-400 flex-shrink-0' />
					<input
						type='date'
						className='bg-transparent text-xs sm:text-sm outline-none text-slate-600 min-w-0 flex-1'
						value={filterStart}
						onChange={(e) => setFilterStart(e.target.value)}
					/>
					<span className='text-slate-300'>|</span>
					<input
						type='date'
						className='bg-transparent text-xs sm:text-sm outline-none text-slate-600 min-w-0 flex-1'
						value={filterEnd}
						onChange={(e) => setFilterEnd(e.target.value)}
					/>
				</div>
				<div className='w-full sm:w-64'>
					<MultiSelect
						options={uniqueServices}
						selected={filterServices}
						onChange={setFilterServices}
						placeholder='Filtrar Serviços'
						formatLabel={Utils.displayName}
					/>
				</div>
				<div className='w-full sm:w-64'>
					<SearchableSelect
						options={clientOptions}
						value={filterClient}
						onChange={setFilterClient}
						placeholder='Filtrar por Cliente'
						fullClients={clients}
					/>
				</div>
				<div className='flex items-center gap-2 sm:ml-auto'>
					<button
						onClick={onRefresh}
						disabled={isRefreshing}
						className={`p-2.5 rounded-[10px] transition border border-slate-200 ${
							isRefreshing
								? "bg-slate-50 text-slate-300 cursor-not-allowed"
								: "bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
						}`}
						title='Atualizar Lista'
					>
						<RefreshCcw
							className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
						/>
					</button>
					<button
						onClick={onOpenConfig}
						className='bg-slate-100 text-slate-600 hover:bg-slate-200 p-2.5 rounded-[10px] transition'
						title='Configurações (Taxas)'
					>
						<Settings className='w-4 h-4' />
					</button>
					<button
						onClick={onNewOrder}
						className='bg-indigo-600 text-white px-4 sm:px-5 py-2.5 rounded-[10px] hover:bg-indigo-700 transition font-bold text-sm flex items-center gap-2 shadow-md shadow-indigo-200'
					>
						<Plus className='w-4 h-4' /> <span className='hidden sm:inline'>Nova</span> Ordem
					</button>
				</div>
			</div>

			{/* 3. STATUS ORDEM + TABS PAGAMENTO */}
			<div className='flex gap-2 mb-2 overflow-x-auto pb-1 -mx-1 px-1'>
				{([
					{ key: "TODOS", label: "Todas", icon: <BarChart2 className="w-3.5 h-3.5" />, active: "bg-indigo-500 text-white border-indigo-500", inactive: "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50" },
					{ key: "ABERTA", label: "Abertas", icon: <Clock className="w-3.5 h-3.5" />, active: "bg-blue-500 text-white border-blue-500", inactive: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50" },
					{ key: "CONCLUIDA", label: "Concluídas", icon: <CheckCircle2 className="w-3.5 h-3.5" />, active: "bg-emerald-500 text-white border-emerald-500", inactive: "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50" },
					{ key: "CANCELADA", label: "Canceladas", icon: <XCircle className="w-3.5 h-3.5" />, active: "bg-slate-600 text-white border-slate-600", inactive: "bg-white text-slate-500 border-slate-200 hover:bg-slate-50" },
				] as const).map((btn) => {
					const count = orders.filter((o) => btn.key === "TODOS" || o.status === btn.key).length;
					return (
						<button key={btn.key} onClick={() => setFilterOrderStatus(btn.key as any)}
							className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border font-semibold text-xs transition-all duration-150 shadow-sm ${filterOrderStatus === btn.key ? btn.active + " shadow-md" : btn.inactive}`}
						>
							{btn.icon}{btn.label}
							<span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-2xs font-bold ${filterOrderStatus === btn.key ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{count}</span>
						</button>
					);
				})}
			</div>
			<div className='flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-slate-200 pb-1'>
				<div className='flex gap-1 overflow-x-auto w-full sm:w-auto pb-1'>
					{[
						{ key: "TODOS", label: "Todas" },
						{
							key: "PAGO",
							label: "Pagas",
							color: "text-emerald-600 bg-emerald-50",
						},
						{
							key: "NAO_PAGO",
							label: "Não Pagas",
							color: "text-red-600 bg-red-50",
						},
						{
							key: "PARCIAL",
							label: "Parcial",
							color: "text-amber-600 bg-amber-50",
						},
					].map((tab) => (
						<button
							key={tab.key}
							onClick={() => setFilterPaymentStatus(tab.key as any)}
							className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all ${
								filterPaymentStatus === tab.key
									? "border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50"
									: "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
							}`}
						>
							{tab.label}
						</button>
					))}
					{/* Filtro NF */}
					<div className="ml-auto flex items-center gap-1.5">
						{[
							{ key: "TODOS", label: "NF: Todas" },
							{ key: "COM_NF", label: "Com NF" },
							{ key: "SEM_NF", label: "Sem NF" },
						].map((tab) => (
							<button
								key={tab.key}
								onClick={() => setFilterNF(tab.key as any)}
								className={`px-3 py-1.5 text-2xs font-bold rounded-lg transition-all ${
									filterNF === tab.key
										? "bg-indigo-600 text-white shadow-sm"
										: "text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* 4. TABELA */}
			<div className='space-y-2'>
				<DataTable
					isEmpty={paginatedOrders.length === 0}
					emptyTitle='Nenhuma ordem no período e filtros selecionados'
					// Piso de 420px: em telas curtas (celular, notebook 768px)
					// `100vh - 420px` deixava a janela da tabela com ~250px, bem
					// menos do que a lista ocupava antes, quando crescia com a
					// página. O teto por viewport continua valendo no desktop.
					maxHeight='max(420px, calc(100vh - 420px))'
				>
					<TableHead>
						<tr>
							<Th className='w-14 sm:w-20'>ID</Th>
							<Th>Cliente</Th>
							<Th className='hidden lg:table-cell'>Criação</Th>
							<Th className='hidden xl:table-cell'>Conclusão</Th>
							<Th className='hidden md:table-cell'>Serviços</Th>
							<Th>Total</Th>
							<Th className='hidden sm:table-cell'>Pagamento</Th>
							<Th className='hidden sm:table-cell'>Status</Th>
							<Th align='right'>Ações</Th>
						</tr>
					</TableHead>
					<tbody className='divide-y divide-slate-100/60 text-left text-sm text-slate-600'>
						{paginatedOrders.map((order) => (
							<OrderRow
								key={order.id}
								order={order}
								isExpanded={expandedOrderId === order.id}
								onToggleExpand={onToggleExpand}
								onEdit={onEditOrder}
								onDelete={onDelete}
								onUpdateStatus={onUpdateStatus}
								onedriveConfig={onedriveConfig}
							/>
						))}
					</tbody>
				</DataTable>
				{/* Paginação + contagem de linhas — fora da casca da tabela, que
				    agora rola por conta própria. */}
				<div className='flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200/70 rounded-2xl shadow-card'>
					<div className='flex items-center gap-3 text-xs text-slate-500'>
						<span className='font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg border border-indigo-100'>
							{filteredOrders.length} {filteredOrders.length === 1 ? 'ordem' : 'ordens'}
						</span>
						<span>|</span>
						<label className='flex items-center gap-1.5'>
							Exibir
							<select
								value={pageSize}
								onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
								className='border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white'
							>
								{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
							</select>
							por página
						</label>
					</div>
					{totalPages > 1 && (
						<div className='flex items-center gap-1'>
							<button
								onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
								disabled={currentPage === 1}
								className='px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
							>
								Anterior
							</button>
							{Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
								let page: number;
								if (totalPages <= 7) {
									page = i + 1;
								} else if (currentPage <= 4) {
									page = i + 1;
								} else if (currentPage >= totalPages - 3) {
									page = totalPages - 6 + i;
								} else {
									page = currentPage - 3 + i;
								}
								return (
									<button
										key={page}
										onClick={() => setCurrentPage(page)}
										className={`w-8 h-8 text-xs font-semibold rounded-lg transition-colors ${
											currentPage === page
												? 'bg-indigo-600 text-white shadow-sm'
												: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
										}`}
									>
										{page}
									</button>
								);
							})}
							<button
								onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
								disabled={currentPage === totalPages}
								className='px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
							>
								Próxima
							</button>
						</div>
					)}
				</div>
			</div>
		</>
	);
};
