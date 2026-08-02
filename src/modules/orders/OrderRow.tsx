import React from "react";
import { Badge } from "@/components/ui/Badge";
import { Utils } from "@/utils";
import { Order } from "@/types";
import {
	Edit2,
	Trash2,
	Clock,
	ChevronDown,
	ChevronUp,
	List,
	FolderOpen,
	CheckCircle2,
	XCircle,
} from "lucide-react";

interface OrderRowProps {
	order: Order;
	isExpanded: boolean;
	onToggleExpand: (id: number) => void;
	onEdit: (order: Order) => void;
	onDelete: (id: number) => void;
	onUpdateStatus: (order: Order, updates: Partial<Order>) => void;
	onedriveConfig: { cid: string; folderPath: string } | null;
}

/**
 * Uma linha da tabela de ordens, com a linha de detalhes expandida.
 *
 * Memoizado de propósito: sem isso, digitar em qualquer campo do módulo
 * reconstruía as até 100 linhas visíveis a cada tecla.
 */
export const OrderRow = React.memo(function OrderRow({
	order,
	isExpanded,
	onToggleExpand,
	onEdit,
	onDelete,
	onUpdateStatus,
	onedriveConfig,
}: OrderRowProps) {
	return (
		<>
			<tr
				className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
					isExpanded ? "bg-indigo-50/30" : ""
				}`}
				onClick={() => onToggleExpand(Number(order.id))}
			>
				<td className='p-2 sm:p-4 font-mono text-xs text-slate-400'>
					<span>#{order.id}</span>
					{order.nota_fiscal && <span className='ml-1 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold'>NF</span>}
				</td>
				<td className='p-2 sm:p-4 max-w-[140px] sm:max-w-[200px]'>
					<span className='font-bold text-slate-700 text-xs sm:text-sm block break-words leading-snug'>{order.cliente_nome}</span>
					<span className='text-2xs text-slate-400 sm:hidden block mt-0.5'>{Utils.formatDateTime(order.data)}</span>
				</td>
				<td className='p-2 sm:p-4 text-xs hidden lg:table-cell'>
					{Utils.formatDateTime(order.data)}
				</td>
				<td className='p-2 sm:p-4 text-xs hidden xl:table-cell'>
					{order.data_conclusao ? (
						<span className='text-emerald-600 font-medium'>
							{Utils.formatDateTime(order.data_conclusao)}
						</span>
					) : (
						<span className='text-slate-400 italic'>--</span>
					)}
				</td>
				<td
					className='p-2 sm:p-4 text-xs max-w-[200px] truncate hidden md:table-cell'
					title={order.items
						.map((i) => Utils.displayName(i.servico))
						.join(", ")}
				>
					{order.items.length > 0 ? (
						<div className='flex gap-1 overflow-hidden'>
							{order.items.slice(0, 2).map((i, idx) => (
								<span
									key={idx}
									className='inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-2xs text-slate-600 whitespace-nowrap'
								>
									{Utils.displayName(i.servico)}
								</span>
							))}
						</div>
					) : (
						"Sem itens"
					)}
				</td>
				<td className='num p-2 sm:p-4 font-bold text-slate-800 text-xs sm:text-sm'>
					{Utils.formatCurrency(order.total)}
					{(order.taxa_extra || 0) > 0 && (
						<span className='text-[9px] text-slate-400 block'>
							(+ juros)
						</span>
					)}
				</td>
				<td className='p-2 sm:p-4 hidden sm:table-cell'>
					<Badge
						status={order.status_pagamento || "NAO_PAGO"}
					/>
				</td>
				<td className='p-2 sm:p-4 hidden sm:table-cell'>
					<span
						className={`px-2 py-1 rounded-[6px] text-2xs font-bold border uppercase tracking-wide
					${
						order.status === "ABERTA"
							? "bg-blue-50 text-blue-600 border-blue-100"
							: order.status === "CONCLUIDA"
							? "bg-emerald-50 text-emerald-600 border-emerald-100"
							: "bg-slate-100 text-slate-500 border-slate-200"
					}`}
					>
						{order.status}
					</span>
				</td>
				<td className='p-2 sm:p-4 text-right' onClick={(e) => e.stopPropagation()}>
					<div className='flex justify-end gap-1 sm:gap-1.5 flex-wrap'>
						{order.status === "ABERTA" && (
							<button
								onClick={() => onUpdateStatus(order, { status: "CONCLUIDA" })}
								className='flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-emerald-500 text-white text-2xs font-bold rounded-lg hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition-all'
							>
								<CheckCircle2 className='w-3.5 h-3.5' /> <span className='hidden sm:inline'>Concluir</span>
							</button>
						)}
						{order.status === "ABERTA" && (
							<button
								onClick={() => onUpdateStatus(order, { status: "CANCELADA" })}
								className='flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-red-50 text-red-600 text-2xs font-bold rounded-lg border border-red-200 hover:bg-red-100 transition-all'
							>
								<XCircle className='w-3.5 h-3.5' /> <span className='hidden sm:inline'>Cancelar</span>
							</button>
						)}
						{order.status === "CONCLUIDA" && (
							<button
								onClick={() => onUpdateStatus(order, { status: "ABERTA" })}
								className='flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-blue-50 text-blue-600 text-2xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-all'
							>
								<Clock className='w-3.5 h-3.5' /> <span className='hidden sm:inline'>Reabrir</span>
							</button>
						)}
						{order.status === "CANCELADA" && (
							<button
								onClick={() => onUpdateStatus(order, { status: "ABERTA" })}
								className='flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-blue-50 text-blue-600 text-2xs font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-all'
							>
								<Clock className='w-3.5 h-3.5' /> <span className='hidden sm:inline'>Reabrir</span>
							</button>
						)}
						<button
							onClick={() => onEdit(order)}
							className='p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[6px] transition'
						>
							<Edit2 className='w-4 h-4' />
						</button>
						<button
							onClick={() => onDelete(order.id!)}
							className='p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[6px] transition'
						>
							<Trash2 className='w-4 h-4' />
						</button>
						<button
							onClick={() => onToggleExpand(Number(order.id))}
							className='p-1.5 text-slate-400 hover:text-indigo-600'
						>
							{isExpanded ? <ChevronUp className='w-4 h-4' /> : <ChevronDown className='w-4 h-4' />}
						</button>
					</div>
				</td>
			</tr>
			{isExpanded && (
				<tr className='bg-slate-50/50'>
					<td
						colSpan={9}
						className='p-4 border-b border-indigo-100'
					>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300 origin-top'>
							{/* Detalhes (Item 1) */}
							<div className='col-span-2 space-y-3'>
								<div className='bg-white p-4 rounded-[10px] border-l-4 border-indigo-500 shadow-sm'>
									<h5 className='text-2xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2'>
										<List className='w-4 h-4 text-indigo-500' />{" "}
										Detalhes do Pedido
									</h5>
									<ul className='space-y-2'>
										{order.items.map((item, idx) => (
											<li
												key={idx}
												className='flex justify-between text-xs border-b border-slate-50 last:border-0 pb-2'
											>
												<span className='text-slate-700'>
													<strong className='text-indigo-600'>
														{item.quantidade}x
													</strong>{" "}
													{Utils.displayName(item.servico)}
													{Utils.displayName(item.material)
														? ` - ${Utils.displayName(item.material)}`
														: ""}
													{Utils.displayName(item.gramatura)
														? ` (${Utils.displayName(item.gramatura)})`
														: ""}
													{Utils.displayName(item.tamanho)
														? ` · ${Utils.displayName(item.tamanho)}`
														: ""}
													{Utils.displayName(item.cor) && (
														<span className='text-slate-400 text-2xs ml-1'>
															({Utils.displayName(item.cor)})
														</span>
													)}
												</span>
												<span className='num font-bold text-slate-600'>
													{Utils.formatCurrency(item.total)}
												</span>
											</li>
										))}
									</ul>
									{(order.taxa_extra || 0) > 0 && (
										<div className='num flex justify-end mt-2 pt-2 border-t border-slate-100 text-2xs text-red-500 font-bold'>
											+ Juros/Taxas:{" "}
											{Utils.formatCurrency(
												order.taxa_extra || 0
											)}
										</div>
									)}
								</div>
								<div className='bg-white p-4 rounded-[10px] border-l-4 border-amber-400 shadow-sm'>
									<h5 className='text-2xs font-bold text-slate-500 uppercase mb-2'>
										Descrição / Obs
									</h5>
									<p className='text-xs text-slate-600 italic leading-relaxed'>
										{order.descricao ||
											"Nenhuma observação registrada."}
									</p>
								</div>
							</div>
							{/* Coluna 2 */}
							<div className='space-y-3'>
								<div className='bg-white p-4 rounded-[10px] border-l-4 border-slate-400 shadow-sm'>
									<h5 className='text-2xs font-bold text-slate-500 uppercase mb-3'>
										Financeiro
									</h5>
									<div className='space-y-2 mb-3'>
										<div className='flex justify-between text-xs'>
											<span className='text-slate-500'>
												Forma:
											</span>
											<span className='font-bold text-slate-700'>
												{order.forma_pagamento || "N/D"}
											</span>
										</div>
										<div className='flex justify-between text-xs'>
											<span className='text-slate-500'>
												Total:
											</span>
											<span className='num font-bold text-indigo-600'>
												{Utils.formatCurrency(order.total)}
											</span>
										</div>
									</div>
									{/* Ações */}
									<div className='flex flex-col gap-2 pt-2 border-t border-slate-100'>
										<div className='flex gap-1'>
											{["PAGO", "PARCIAL", "NAO_PAGO"].map(
												(btn) => (
													<button
														key={btn}
														onClick={() =>
															onUpdateStatus(order, {
																status_pagamento: btn as any,
															})
														}
														className={`flex-1 text-[9px] font-bold py-1 rounded border transition-colors ${
															order.status_pagamento === btn
																? "bg-slate-800 text-white"
																: "text-slate-400 hover:bg-slate-100"
														}`}
													>
														{btn.replace("_", " ")}
													</button>
												)
											)}
										</div>
									</div>
								</div>
								<div className='bg-white p-4 rounded-[10px] border-l-4 border-blue-400 shadow-sm'>
									<h5 className='text-2xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2'>
										<FolderOpen className='w-4 h-4 text-blue-500' />{" "}
										Arquivos
									</h5>
									<div className='mb-2 bg-slate-50 p-2 rounded border border-slate-200 text-2xs text-slate-500 font-mono break-all'>
										01_A3_Art_Copy/Ordens/{order.data.split("T")[0]}/OS{order.id}_{order.cliente_nome.replace(/\s+/g, "_")}
									</div>
									{onedriveConfig?.cid && (() => {
										const folderName = `OS${order.id}_${order.cliente_nome.replace(/\s+/g, "_")}`;
										const date = order.data?.split("T")[0] || "";
										const fullPath = `/personal/${onedriveConfig.cid}/Documents/${onedriveConfig.folderPath}/${date}/${folderName}`;
										const url = `https://onedrive.live.com/?id=${encodeURIComponent(fullPath)}&search=${encodeURIComponent(folderName)}&view=0`;
										return (
											<a
												href={url}
												target="_blank"
												rel="noopener noreferrer"
												className='inline-flex items-center gap-1.5 text-2xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors'
												onClick={(e) => e.stopPropagation()}
											>
												<FolderOpen className='w-3.5 h-3.5' />
												Abrir no OneDrive
											</a>
										);
									})()}
								</div>
							</div>
						</div>
					</td>
				</tr>
			)}
		</>
	);
});
