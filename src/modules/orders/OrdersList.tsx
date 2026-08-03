import React, { useMemo } from "react";
import { Select } from "@/components/ui/Field";
import { Utils } from "@/utils";
import { Order, Client } from "@/types";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
	Plus,
	Clock,
	Timer,
	Calendar,
	Settings,
	RefreshCcw,
	CheckCircle2,
	BarChart2,
} from "lucide-react";
import { DataTable, TableHead, Th } from "@/components/ui/DataTable";
import { OrderRow } from "./OrderRow";
import { SearchableSelect } from "./SearchableSelect";

/** KPIs do topo da lista, calculados em `Orders.tsx` sobre as ordens filtradas. */
export interface OrdersSummary {
	totalOrders: number;
	openOrdersSnapshot: number;
	completedOrdersSnapshot: number;
	avgTimeDisplay: string;
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
		// `lg:h-[calc(100dvh-2rem)]` trava a página inteira (estatísticas, filtros,
		// abas de pagamento/NF) numa altura amarrada à viewport — mesma técnica do
		// formulário de ordem (ver OrderFormPage). Só a área da tabela abaixo tem
		// `flex-1 min-h-0`, então é ela quem sobra de altura e rola por conta
		// própria; o resto fica sempre visível, sem precisar rolar a página para
		// alcançar a paginação. Abaixo de `lg` nada disto atua: a página volta a
		// rolar inteira, como em qualquer lista mobile.
		<div className='flex flex-col gap-3 lg:h-[calc(100dvh_-_2rem)] lg:sticky lg:top-4 lg:min-h-0'>
			{/* 1. FAIXA DE ESTATÍSTICAS — pills compactas numa única linha, no lugar
			    dos 4 cartões altos com sparkline: a lista de ordens ganha espaço
			    vertical logo abaixo, que era o ponto principal do pedido. */}
			<div className='flex-shrink-0 bg-white border border-slate-200/70 rounded-2xl shadow-card px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-3'>
				{[
					{ label: "Total de ordens", value: summary.totalOrders, icon: BarChart2, accent: "bg-primary-50 text-primary-600" },
					{ label: "Abertas", value: summary.openOrdersSnapshot, icon: Clock, accent: "bg-info-50 text-info-600" },
					{ label: "Concluídas", value: summary.completedOrdersSnapshot, icon: CheckCircle2, accent: "bg-success-50 text-success-600" },
				].map((s, i) => (
					<div key={s.label} className={`flex items-center gap-2.5 pr-6 ${i < 2 ? "border-r border-slate-100" : ""}`}>
						<div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s.accent}`}>
							<s.icon className='w-4 h-4' />
						</div>
						<div>
							<p className='text-2xs text-ink-faint font-semibold'>{s.label}</p>
							<span className='num text-base font-bold text-ink leading-none'>{s.value}</span>
						</div>
					</div>
				))}
				<div className='flex items-center gap-2.5'>
					<div className='w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-sky-50 text-sky-600'>
						<Timer className='w-4 h-4' />
					</div>
					<div>
						<p className='text-2xs text-ink-faint font-semibold'>Tempo médio</p>
						<span className='num text-base font-bold text-ink leading-none'>{summary.avgTimeDisplay}</span>
					</div>
				</div>
			</div>

			{/* 2. FILTROS + AÇÕES — período, serviços, cliente e status (dropdown
			    compacto) numa faixa só, com as ações à direita. Pagamento e Nota
			    Fiscal ficam de fora daqui: voltaram a ser as abas coloridas logo
			    acima da tabela (bloco 3), como eram antes do ajuste anterior. */}
			<div className='flex-shrink-0 bg-white p-3 rounded-xl border border-slate-200/70 shadow-card flex flex-wrap items-center gap-2'>
				<div className='flex items-center gap-2 border border-slate-200 rounded-[10px] px-2.5 h-8 bg-white hover:border-slate-300 transition-colors w-full sm:w-auto'>
					<Calendar className='w-3.5 h-3.5 text-ink-faint flex-shrink-0' />
					<input
						type='date'
						className='num bg-transparent text-xs outline-none text-ink-muted min-w-0 flex-1'
						value={filterStart}
						onChange={(e) => setFilterStart(e.target.value)}
					/>
					<span className='text-slate-300'>–</span>
					<input
						type='date'
						className='num bg-transparent text-xs outline-none text-ink-muted min-w-0 flex-1'
						value={filterEnd}
						onChange={(e) => setFilterEnd(e.target.value)}
					/>
				</div>
				<div className='w-full sm:w-48'>
					<MultiSelect
						options={uniqueServices}
						selected={filterServices}
						onChange={setFilterServices}
						placeholder='Serviços'
						formatLabel={Utils.displayName}
					/>
				</div>
				<div className='w-full sm:w-48'>
					<SearchableSelect
						options={clientOptions}
						value={filterClient}
						onChange={setFilterClient}
						placeholder='Cliente'
						fullClients={clients}
					/>
				</div>
				<Select
					className='!w-auto'
					value={filterOrderStatus}
					onChange={(e) => setFilterOrderStatus(e.target.value as any)}
				>
					<option value='TODOS'>Status: Todas ({orders.length})</option>
					<option value='ABERTA'>Abertas ({orders.filter((o) => o.status === "ABERTA").length})</option>
					<option value='CONCLUIDA'>Concluídas ({orders.filter((o) => o.status === "CONCLUIDA").length})</option>
					<option value='CANCELADA'>Canceladas ({orders.filter((o) => o.status === "CANCELADA").length})</option>
				</Select>
				<div className='flex items-center gap-2 sm:ml-auto'>
					<button
						onClick={onRefresh}
						disabled={isRefreshing}
						className={`p-2 rounded-[10px] transition border border-slate-200 ${
							isRefreshing
								? "bg-slate-50 text-slate-300 cursor-not-allowed"
								: "bg-white text-ink-muted hover:bg-slate-50 hover:text-primary-600"
						}`}
						title='Atualizar Lista'
					>
						<RefreshCcw
							className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
						/>
					</button>
					<button
						onClick={onOpenConfig}
						className='bg-slate-100 text-ink-muted hover:bg-slate-200 p-2 rounded-[10px] transition'
						title='Configurações (Taxas)'
					>
						<Settings className='w-3.5 h-3.5' />
					</button>
					<button
						onClick={onNewOrder}
						className='bg-primary-600 text-white px-3 sm:px-4 h-8 rounded-[10px] hover:bg-primary-700 transition font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-primary-600/20'
					>
						<Plus className='w-3.5 h-3.5' /> <span className='hidden sm:inline'>Nova</span> Ordem
					</button>
				</div>
			</div>

			{/* 3. ABAS DE PAGAMENTO (esquerda) + NOTA FISCAL (direita) — mesmo efeito
			    visual (cor sólida quando ativa) e posição de antes do ajuste que
			    tinha convertido os dois em dropdowns. */}
			<div className='flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-slate-200 pb-1'>
				<div className='flex gap-1 overflow-x-auto w-full sm:w-auto pb-1'>
					{[
						{ key: "TODOS", label: "Todas" },
						{ key: "PAGO", label: "Pagas" },
						{ key: "NAO_PAGO", label: "Não Pagas" },
						{ key: "PARCIAL", label: "Parcial" },
					].map((tab) => (
						<button
							key={tab.key}
							onClick={() => setFilterPaymentStatus(tab.key as any)}
							className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all ${
								filterPaymentStatus === tab.key
									? "border-b-2 border-primary-600 text-primary-600 bg-primary-50/50"
									: "text-ink-faint hover:text-ink-muted hover:bg-slate-50"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
				{/* Filtro NF */}
				<div className='flex items-center gap-1.5'>
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
									? "bg-primary-600 text-white shadow-sm"
									: "text-ink-faint hover:text-ink-muted bg-slate-100 hover:bg-slate-200"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
			</div>

			{/* 4. TABELA — única área que cresce/rola dentro da caixa travada. */}
			<div className='flex-1 min-h-0 flex flex-col gap-2'>
				<DataTable
					className='lg:flex-1 lg:min-h-0'
					isEmpty={paginatedOrders.length === 0}
					emptyTitle='Nenhuma ordem no período e filtros selecionados'
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
				    agora rola por conta própria. `flex-shrink-0`: dentro da caixa
				    travada (lg+) fica sempre visível, nunca é empurrada pra fora. */}
				<div className='flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200/70 rounded-2xl shadow-card'>
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
		</div>
	);
};
