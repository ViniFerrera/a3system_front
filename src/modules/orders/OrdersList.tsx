import React, { useMemo, useState, useEffect } from "react";
import { Select } from "@/components/ui/Field";
import { Utils } from "@/utils";
import { Order, Client, Orcamento, OrcamentoVersao } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { api } from "@/services/api";
import {
	Plus,
	Clock,
	Timer,
	Calendar,
	Settings,
	RefreshCcw,
	CheckCircle2,
	BarChart2,
	Wallet,
	HourglassIcon,
	Ban,
	FileText,
	ChevronDown,
	ChevronUp,
	Trash2,
} from "lucide-react";
import { DataTable, TableHead, Th } from "@/components/ui/DataTable";
import { OrderRow } from "./OrderRow";
import { SearchableSelect } from "./SearchableSelect";

// ─── OrcamentoRow com expansão ───────────────────────────────────────────────

const OrcamentoRow = React.memo(function OrcamentoRow({
	orcamento,
	isExpanded,
	onToggleExpand,
	onOpen,
	onDelete,
}: {
	orcamento: Orcamento;
	isExpanded: boolean;
	onToggleExpand: (id: number) => void;
	onOpen: (orc: Orcamento) => void;
	onDelete: (id: number) => void;
}) {
	const [fullData, setFullData] = useState<Orcamento | null>(null);
	const [isFetching, setIsFetching] = useState(false);

	// Carrega versões completas na primeira expansão
	useEffect(() => {
		if (!isExpanded || fullData) return;
		setIsFetching(true);
		api
			.get(`/orcamentos/${orcamento.id}`)
			.then((res) => setFullData(res.data))
			.catch(() => {})
			.finally(() => setIsFetching(false));
	}, [isExpanded]);

	const versoesCrono = useMemo(
		() => [...(fullData?.versoes ?? [])].sort((a, b) => b.versao - a.versao),
		[fullData]
	);

	const totalByNum = useMemo(() => {
		const m = new Map<number, number>();
		for (const v of fullData?.versoes ?? []) m.set(v.versao, v.total);
		return m;
	}, [fullData]);

	const Chevron = isExpanded ? ChevronUp : ChevronDown;

	return (
		<>
			<tr
				className="hover:bg-violet-50/60 transition-colors cursor-pointer border-l-2 border-l-violet-400"
				onClick={() => onToggleExpand(Number(orcamento.id))}
			>
				<td className="p-2 sm:p-3 font-mono text-xs">
					<span className="text-violet-600 font-bold">ORC#{orcamento.id}</span>
				</td>
				<td className="p-2 sm:p-3">
					<span className="font-semibold text-ink text-xs sm:text-sm">
						{orcamento.cliente_nome}
					</span>
					<p className="text-2xs text-ink-faint lg:hidden">
						{Utils.formatDateTime(orcamento.data)}
					</p>
				</td>
				<td className="p-2 sm:p-3 text-xs hidden lg:table-cell text-ink-muted">
					{Utils.formatDateTime(orcamento.data)}
				</td>
				<td className="p-2 sm:p-3 text-xs hidden xl:table-cell">
					<span className="text-ink-faint italic">—</span>
				</td>
				<td className="p-2 sm:p-3 text-xs hidden md:table-cell">
					<span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-violet-100 text-2xs text-violet-700 whitespace-nowrap">
						{orcamento.versao_count ?? 1} versão(ões)
					</span>
				</td>
				<td className="p-2 sm:p-3 font-bold text-ink text-xs sm:text-sm num">
					{Utils.formatCurrency(orcamento.total_atual ?? 0)}
				</td>
				<td className="p-2 sm:p-3 hidden sm:table-cell">
					<span className="text-ink-faint text-xs">—</span>
				</td>
				<td className="p-2 sm:p-3 hidden sm:table-cell">
					<Badge status={orcamento.status} />
				</td>
				<td className="p-2 sm:p-3">
					<div
						className="flex items-center justify-end gap-1"
						onClick={(e) => e.stopPropagation()}
					>
						<button
							onClick={() => onDelete(Number(orcamento.id))}
							className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
							title="Excluir orçamento"
						>
							<Trash2 className="w-3.5 h-3.5" />
						</button>
						<Chevron
							className="w-4 h-4 text-violet-400 cursor-pointer"
							onClick={() => onToggleExpand(Number(orcamento.id))}
						/>
					</div>
				</td>
			</tr>

			{isExpanded && (
				<tr>
					<td colSpan={9} className="bg-violet-50/30 px-4 py-3 border-l-2 border-l-violet-400">
						{isFetching ? (
							<div className="flex items-center gap-2 text-xs text-ink-faint py-2">
								<div className="w-4 h-4 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
								Carregando versões...
							</div>
						) : (
							<div className="flex flex-col gap-3">
								{/* Cartões de versão em linha */}
								<div className="flex gap-3 overflow-x-auto pb-1">
									{versoesCrono.map((v) => {
										const prevTotal = totalByNum.get(v.versao - 1);
										const delta =
											prevTotal !== undefined ? v.total - prevTotal : null;
										return (
											<div
												key={v.id}
												onClick={() => onOpen(orcamento)}
												className="flex-shrink-0 w-52 cursor-pointer bg-white rounded-xl border border-slate-200 hover:border-violet-400 hover:shadow-sm p-3 transition-all"
											>
												<div className="flex items-center justify-between mb-1.5">
													<span className="flex items-center gap-1.5 text-xs font-bold text-violet-700">
														<span className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center text-2xs font-bold">
															{v.versao}
														</span>
														Versão {v.versao}
													</span>
													{delta !== null && delta !== 0 && (
														<span
															className={`text-2xs font-bold px-1.5 py-0.5 rounded ${
																delta > 0
																	? "bg-emerald-50 text-emerald-600"
																	: "bg-red-50 text-red-600"
															}`}
														>
															{delta > 0 ? "+" : ""}
															{Utils.formatCurrency(delta)}
														</span>
													)}
												</div>
												<p className="num text-base font-bold text-ink">
													{Utils.formatCurrency(v.total)}
												</p>
												<p className="text-2xs text-ink-faint mt-0.5">
													{Utils.formatDateTime(v.data_criacao)}
												</p>
												{v.itens && v.itens.length > 0 && (
													<div className="mt-2 space-y-0.5">
														{v.itens.slice(0, 3).map((item, idx) => (
															<p
																key={idx}
																className="text-2xs text-ink-muted truncate"
															>
																{[
																	Utils.displayName(item.servico),
																	item.tamanho && item.tamanho !== "-"
																		? item.tamanho
																		: null,
																	Utils.displayName(item.material),
																	item.cor && item.cor !== "-"
																		? Utils.displayName(item.cor)
																		: null,
																]
																	.filter(Boolean)
																	.join(" · ")}
															</p>
														))}
														{v.itens.length > 3 && (
															<p className="text-2xs text-ink-faint">
																+{v.itens.length - 3} itens
															</p>
														)}
													</div>
												)}
											</div>
										);
									})}
								</div>
								<div className="flex justify-end">
									<button
										onClick={() => onOpen(orcamento)}
										className="text-xs font-bold text-violet-600 hover:text-violet-800 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition"
									>
										Ver detalhes →
									</button>
								</div>
							</div>
						)}
					</td>
				</tr>
			)}
		</>
	);
});

// ─── Tipos exportados ─────────────────────────────────────────────────────────

/** KPIs do topo da lista, calculados em `Orders.tsx` sobre as ordens filtradas. */
export interface OrdersSummary {
	totalOrders: number;
	openOrdersSnapshot: number;
	completedOrdersSnapshot: number;
	totalRevenue: number;
	pendingRevenue: number;
	cancelledRevenue: number;
	avgTimeDisplay: string;
}

export type FilterPaymentStatus = "TODOS" | "PAGO" | "NAO_PAGO" | "PARCIAL" | "ORCADO";
export type FilterOrderStatus = "TODOS" | "ABERTA" | "CONCLUIDA" | "CANCELADA" | "EM_ORCAMENTO" | "CONVERTIDO";
export type FilterNF = "TODOS" | "COM_NF" | "SEM_NF";

type ListRow =
	| { type: "order"; data: Order }
	| { type: "orcamento"; data: Orcamento };

interface OrdersListProps {
	orders: Order[];
	clients: Client[];
	filteredOrders: Order[];
	paginatedOrders: Order[];
	summary: OrdersSummary;
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
	expandedOrcamentoId: number | null;
	onToggleExpandOrcamento: (id: number) => void;

	onNewOrder: () => void;
	onEditOrder: (order: Order) => void;
	onDelete: (id: number) => void;
	onUpdateStatus: (order: Order, updates: Partial<Order>) => void;
	onRefresh: () => void;
	onOpenConfig: () => void;
	onedriveConfig: { cid: string; folderPath: string } | null;
	isRefreshing: boolean;
	orcamentos: Orcamento[];
	onNewOrcamento: () => void;
	onOpenOrcamento: (orc: Orcamento) => void;
	onDeleteOrcamento: (id: number) => void;
}

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
	expandedOrcamentoId,
	onToggleExpandOrcamento,
	onNewOrder,
	onEditOrder,
	onDelete,
	onUpdateStatus,
	onRefresh,
	onOpenConfig,
	onedriveConfig,
	isRefreshing,
	orcamentos,
	onNewOrcamento,
	onOpenOrcamento,
	onDeleteOrcamento,
}: OrdersListProps) => {
	const clientOptions = useMemo(
		() => [
			{ id: 0, label: "Todos Clientes" },
			...clients.map((c) => ({ id: Number(c.id), label: c.nome })),
		],
		[clients]
	);

	const isOrcadoTab = filterPaymentStatus === "ORCADO";

	// Lista combinada já ordenada por data desc (antes de paginar)
	const allRowsSorted = useMemo((): ListRow[] => {
		// Aba "Orçado" → só orçamentos
		if (isOrcadoTab) {
			return orcamentos
				.filter((o) => {
					if (filterClient !== 0 && o.cliente_id !== filterClient) return false;
					const dateStr = o.data ? o.data.split("T")[0] : "";
					if (filterStart && dateStr < filterStart) return false;
					if (filterEnd && dateStr > filterEnd) return false;
					return true;
				})
				.map((o) => ({ type: "orcamento" as const, data: o }));
		}

		// Filtro de pagamento ativo (não TODOS) → só ordens, sem orçamentos
		if (filterPaymentStatus !== "TODOS") {
			return filteredOrders.map((o) => ({ type: "order" as const, data: o }));
		}

		// Status de ordem específico → só ordens
		if (filterOrderStatus !== "TODOS") {
			return filteredOrders.map((o) => ({ type: "order" as const, data: o }));
		}

		// TODOS + TODOS → mescla ordens + orçamentos por data desc
		const orderRows: ListRow[] = filteredOrders.map((o) => ({
			type: "order" as const,
			data: o,
		}));
		const orcamentoRows: ListRow[] = orcamentos
			.filter((o) => {
				if (filterClient !== 0 && o.cliente_id !== filterClient) return false;
				const dateStr = o.data ? o.data.split("T")[0] : "";
				if (filterStart && dateStr < filterStart) return false;
				if (filterEnd && dateStr > filterEnd) return false;
				return true;
			})
			.map((o) => ({ type: "orcamento" as const, data: o }));

		return [...orderRows, ...orcamentoRows].sort((a, b) => {
			const dA = (a.data.data ?? "").substring(0, 10);
			const dB = (b.data.data ?? "").substring(0, 10);
			if (dB !== dA) return dB.localeCompare(dA);
			return (Number(b.data.id) || 0) - (Number(a.data.id) || 0);
		});
	}, [
		isOrcadoTab,
		filterPaymentStatus,
		filteredOrders,
		orcamentos,
		filterOrderStatus,
		filterClient,
		filterStart,
		filterEnd,
	]);

	const paginatedRows = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return allRowsSorted.slice(start, start + pageSize);
	}, [allRowsSorted, currentPage, pageSize]);

	const totalRowsForPagination = allRowsSorted.length;
	const totalPages = Math.max(1, Math.ceil(totalRowsForPagination / pageSize));

	return (
		<div className='flex flex-col gap-3 lg:sticky lg:top-4 lg:h-[calc(100dvh_-_6.5rem)] lg:min-h-0'>
			{/* 1. KPIs */}
			<div className='flex-shrink-0 bg-white border border-slate-200/70 rounded-2xl shadow-card px-4 sm:px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-3'>
				{[
					{ label: "Total de ordens", value: summary.totalOrders, icon: BarChart2, accent: "bg-primary-50 text-primary-600" },
					{ label: "Abertas", value: summary.openOrdersSnapshot, icon: Clock, accent: "bg-info-50 text-info-600" },
					{ label: "Concluídas", value: summary.completedOrdersSnapshot, icon: CheckCircle2, accent: "bg-success-50 text-success-600" },
					{ label: "Receita", value: Utils.formatCurrency(summary.totalRevenue), icon: Wallet, accent: "bg-emerald-50 text-emerald-600" },
					{ label: "Receita pendente", value: Utils.formatCurrency(summary.pendingRevenue), icon: HourglassIcon, accent: "bg-amber-50 text-amber-600" },
					{ label: "Receita cancelada", value: Utils.formatCurrency(summary.cancelledRevenue), icon: Ban, accent: "bg-rose-50 text-rose-600" },
				].map((s, i, arr) => (
					<div key={s.label} className={`flex items-center gap-2.5 pr-6 ${i < arr.length - 1 ? "border-r border-slate-100" : ""}`}>
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

			{/* 2. FILTROS — linha única com scroll horizontal em telas pequenas */}
			<div className='flex-shrink-0 bg-white px-3 py-2 rounded-xl border border-slate-200/70 shadow-card flex items-center gap-2 overflow-x-auto'>
				{/* Período */}
				<div className='flex items-center gap-1.5 border border-slate-200 rounded-[10px] px-2.5 h-8 bg-white hover:border-slate-300 transition-colors flex-shrink-0'>
					<Calendar className='w-3.5 h-3.5 text-ink-faint flex-shrink-0' />
					<input
						type='date'
						className='num bg-transparent text-xs outline-none text-ink-muted w-[6.5rem]'
						value={filterStart}
						onChange={(e) => setFilterStart(e.target.value)}
					/>
					<span className='text-slate-300 flex-shrink-0'>–</span>
					<input
						type='date'
						className='num bg-transparent text-xs outline-none text-ink-muted w-[6.5rem]'
						value={filterEnd}
						onChange={(e) => setFilterEnd(e.target.value)}
					/>
				</div>

				{/* Serviços */}
				<div className='w-36 flex-shrink-0'>
					<MultiSelect
						options={uniqueServices}
						selected={filterServices}
						onChange={setFilterServices}
						placeholder='Serviços'
						formatLabel={Utils.displayName}
					/>
				</div>

				{/* Cliente */}
				<div className='w-40 flex-shrink-0'>
					<SearchableSelect
						options={clientOptions}
						value={filterClient}
						onChange={setFilterClient}
						placeholder='Cliente'
						fullClients={clients}
					/>
				</div>

				{/* Status */}
				<Select
					className='!w-auto flex-shrink-0'
					value={filterOrderStatus}
					onChange={(e) => { setFilterOrderStatus(e.target.value as any); setCurrentPage(1); }}
				>
					<option value='TODOS'>Status: Todas</option>
					<option value='ABERTA'>Abertas ({orders.filter((o) => o.status === "ABERTA").length})</option>
					<option value='CONCLUIDA'>Concluídas ({orders.filter((o) => o.status === "CONCLUIDA").length})</option>
					<option value='CANCELADA'>Canceladas ({orders.filter((o) => o.status === "CANCELADA").length})</option>
				</Select>

				{/* Ações — empurradas para a direita */}
				<div className='flex items-center gap-1.5 ml-auto flex-shrink-0'>
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
						<RefreshCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
					</button>
					<button
						onClick={onOpenConfig}
						className='bg-slate-100 text-ink-muted hover:bg-slate-200 p-2 rounded-[10px] transition'
						title='Configurações (Taxas)'
					>
						<Settings className='w-3.5 h-3.5' />
					</button>
					<button
						onClick={onNewOrcamento}
						className='bg-violet-600 text-white px-3 h-8 rounded-[10px] hover:bg-violet-700 transition font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-violet-600/20 flex-shrink-0'
					>
						<FileText className='w-3.5 h-3.5' />
						<span className='hidden sm:inline'>Novo</span> Orçamento
					</button>
					<button
						onClick={onNewOrder}
						className='bg-primary-600 text-white px-3 h-8 rounded-[10px] hover:bg-primary-700 transition font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-primary-600/20 flex-shrink-0'
					>
						<Plus className='w-3.5 h-3.5' />
						<span className='hidden sm:inline'>Nova</span> Ordem
					</button>
				</div>
			</div>

			{/* 3. ABAS DE PAGAMENTO + NF */}
			<div className='flex-shrink-0 flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-slate-200 pb-1'>
				<div className='flex gap-1 overflow-x-auto w-full sm:w-auto pb-1'>
					{[
						{ key: "TODOS", label: "Todas" },
						{ key: "PAGO", label: "Pagas" },
						{ key: "NAO_PAGO", label: "Não Pagas" },
						{ key: "PARCIAL", label: "Parcial" },
						{ key: "ORCADO", label: `Orçado (${orcamentos.length})` },
					].map((tab) => (
						<button
							key={tab.key}
							onClick={() => { setFilterPaymentStatus(tab.key as any); setCurrentPage(1); }}
							className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all whitespace-nowrap ${
								filterPaymentStatus === tab.key
									? tab.key === "ORCADO"
										? "border-b-2 border-violet-600 text-violet-600 bg-violet-50/50"
										: "border-b-2 border-primary-600 text-primary-600 bg-primary-50/50"
									: "text-ink-faint hover:text-ink-muted hover:bg-slate-50"
							}`}
						>
							{tab.label}
						</button>
					))}
				</div>
				{/* Filtro NF — oculto na aba Orçado */}
				{!isOrcadoTab && (
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
				)}
			</div>

			{/* 4. TABELA */}
			<div className='flex-1 min-h-0 flex flex-col gap-2'>
				<DataTable
					className='lg:flex-1 lg:min-h-0'
					isEmpty={paginatedRows.length === 0}
					emptyTitle={isOrcadoTab ? 'Nenhum orçamento no período selecionado' : 'Nenhuma ordem no período e filtros selecionados'}
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
						{paginatedRows.map((row) =>
							row.type === "order" ? (
								<OrderRow
									key={`order-${row.data.id}`}
									order={row.data}
									isExpanded={expandedOrderId === row.data.id}
									onToggleExpand={onToggleExpand}
									onEdit={onEditOrder}
									onDelete={onDelete}
									onUpdateStatus={onUpdateStatus}
									onedriveConfig={onedriveConfig}
								/>
							) : (
								<OrcamentoRow
									key={`orc-${row.data.id}`}
									orcamento={row.data}
									isExpanded={expandedOrcamentoId === row.data.id}
									onToggleExpand={onToggleExpandOrcamento}
									onOpen={onOpenOrcamento}
									onDelete={onDeleteOrcamento}
								/>
							)
						)}
					</tbody>
				</DataTable>

				{/* Paginação */}
				<div className='flex-shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200/70 rounded-2xl shadow-card'>
					<div className='flex items-center gap-3 text-xs text-slate-500'>
						<span className='font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg border border-indigo-100'>
							{totalRowsForPagination}{" "}
							{isOrcadoTab
								? totalRowsForPagination === 1 ? "orçamento" : "orçamentos"
								: totalRowsForPagination === 1 ? "registro" : "registros"}
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
												? "bg-indigo-600 text-white shadow-sm"
												: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
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
