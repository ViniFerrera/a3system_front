import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Utils } from "@/utils";
import { Order, Client, PriceRule, OrderItem } from "@/types";
import {
	Plus,
	Edit2,
	CheckCircle,
	Save,
	Trash2,
	XCircle,
	Paperclip,
	Clock,
	Check,
	X,
	FileText,
	DownloadCloud,
	Filter,
	MoreHorizontal,
} from "lucide-react";
import { api } from "@/services/api";

export const OrderModule = ({
	clients,
	priceTable,
	orders,
	setOrders,
	onStockUpdate,
}: {
	clients: Client[];
	priceTable: PriceRule[];
	orders: Order[];
	setOrders: Function;
	onStockUpdate: Function;
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingOrder, setEditingOrder] = useState<Order | null>(null);
	const [popoverId, setPopoverId] = useState<number | null>(null);

	// Novo campo: desconto_pontual
	const [formData, setFormData] = useState<Partial<Order>>({
		cliente_id: 0,
		descricao: "",
		items: [],
		anexos: [],
		status_pagamento: "NAO_PAGO",
		desconto_pontual: 0,
	});

	const [tempItem, setTempItem] = useState({
		servico: "",
		material: "",
		cor: "",
		quantidade: 0,
		gramatura: "", // Corresponde a "Especificação" no formulário
		tamanho: "", // Corresponde a "Tamanho"
		is_double_sided: false,
	});

	const [filterStart, setFilterStart] = useState("");
	const [filterEnd, setFilterEnd] = useState("");
	const [filterClient, setFilterClient] = useState("");
	const [filterServices, setFilterServices] = useState<string[]>([]);

	// --- Filtros em Cascata para Novo Item ---
	const uniqueServices = useMemo(
		() => [...new Set(priceTable.map((p) => p.Servico))].sort(),
		[priceTable]
	);

	const availableMaterials = useMemo(() => {
		if (!tempItem.servico) return [];
		return [
			...new Set(
				priceTable
					.filter((p) => p.Servico === tempItem.servico)
					.map((p) => p.Material)
			),
		].sort();
	}, [tempItem.servico, priceTable]);

	const availableSpecs = useMemo(() => {
		// Gramatura
		if (!tempItem.material) return [];
		return [
			...new Set(
				priceTable
					.filter(
						(p) =>
							p.Servico === tempItem.servico && p.Material === tempItem.material
					)
					.map((p) => p.Gramatura)
			),
		]
			.filter(Boolean)
			.sort();
	}, [tempItem.servico, tempItem.material, priceTable]);

	const availableSizes = useMemo(() => {
		// Tamanho
		if (!tempItem.material) return [];
		// Filtra considerando a gramatura se ela foi selecionada, senao pega todos do material
		const baseFilter = priceTable.filter(
			(p) => p.Servico === tempItem.servico && p.Material === tempItem.material
		);
		const refinedFilter = tempItem.gramatura
			? baseFilter.filter((p) => p.Gramatura === tempItem.gramatura)
			: baseFilter;

		return [...new Set(refinedFilter.map((p) => p.Papel))]
			.filter(Boolean)
			.sort();
	}, [tempItem.servico, tempItem.material, tempItem.gramatura, priceTable]);

	const availableColors = useMemo(() => {
		if (!tempItem.material) return [];
		const baseFilter = priceTable.filter(
			(p) => p.Servico === tempItem.servico && p.Material === tempItem.material
		);
		let refinedFilter = baseFilter;
		if (tempItem.gramatura)
			refinedFilter = refinedFilter.filter(
				(p) => p.Gramatura === tempItem.gramatura
			);
		if (tempItem.tamanho)
			refinedFilter = refinedFilter.filter((p) => p.Papel === tempItem.tamanho);

		return [...new Set(refinedFilter.map((p) => p.Cor))].filter(Boolean).sort();
	}, [
		tempItem.servico,
		tempItem.material,
		tempItem.gramatura,
		tempItem.tamanho,
		priceTable,
	]);

	const handleAddItem = () => {
		const pricing = Utils.calculatePrice(
			priceTable,
			tempItem.servico,
			tempItem.material,
			tempItem.cor,
			Number(tempItem.quantidade),
			tempItem.gramatura
		);

		const newItem: OrderItem = {
			id: Date.now(),
			servico: tempItem.servico,
			material: tempItem.material,
			cor: tempItem.cor,
			quantidade: Number(tempItem.quantidade),
			unitPrice: pricing.unit,
			total: pricing.total,
			ruleApplied: pricing.rule || "N/A",
			gramatura: tempItem.gramatura,
			is_double_sided: tempItem.is_double_sided,
		};
		setFormData((prev) => ({
			...prev,
			items: [...(prev.items || []), newItem],
		}));
		// Reset parcial para facilitar nova adição
		setTempItem((prev) => ({ ...prev, quantidade: 0 }));
	};

	const calculateTotalWithDiscount = () => {
		const subtotal = formData.items?.reduce((acc, i) => acc + i.total, 0) || 0;
		const discount = formData.desconto_pontual || 0;
		return subtotal * (1 - discount / 100);
	};

	const handleSave = async () => {
		const items = formData.items || [];
		const total = calculateTotalWithDiscount();
		const client = clients.find((c) => c.id == formData.cliente_id);

		const orderPayload = {
			...formData,
			cliente_nome: client?.nome || "Desconhecido",
			total: total,
			status: editingOrder ? editingOrder.status : "ABERTA",
			data: editingOrder ? editingOrder.data : new Date().toISOString(),
			items: items,
			anexos: formData.anexos || [],
		};

		try {
			if (editingOrder && editingOrder.id) {
				const res = await api.put(`/orders/${editingOrder.id}`, orderPayload);
				setOrders((prev: Order[]) =>
					prev.map((o) => (o.id === editingOrder.id ? res.data : o))
				);
			} else {
				const res = await api.post("/orders", orderPayload);
				setOrders((prev: Order[]) => [res.data, ...prev]);
			}
			setIsModalOpen(false);
			setEditingOrder(null);
			setFormData({
				cliente_id: 0,
				descricao: "",
				items: [],
				anexos: [],
				status_pagamento: "NAO_PAGO",
				desconto_pontual: 0,
			});
		} catch (err) {
			alert("Erro ao salvar ordem");
		}
	};

	// ... (handleDelete, updateStatus, handleFileUpload, filteredOrders, columns mantidos iguais) ...
	// REPETINDO AS FUNÇÕES AUXILIARES PARA NÃO QUEBRAR O COMPONENTE
	const handleDelete = async (id: number) => {
		if (confirm("Tem certeza que deseja apagar esta ordem?")) {
			try {
				await api.delete(`/orders/${id}`);
				setOrders((prev: Order[]) => prev.filter((o) => o.id !== id));
			} catch (err) {
				alert("Erro ao apagar ordem");
			}
		}
	};
	const updateStatus = async (order: Order, updates: Partial<Order>) => {
		if (updates.status === "CONCLUIDA" && order.status !== "CONCLUIDA") {
			if (!confirm("Confirmar conclusão e dar baixa no estoque?")) return;
		} else if (updates.status === "CANCELADA") {
			if (!confirm("Confirmar cancelamento da ordem?")) return;
		}
		try {
			const res = await api.put(`/orders/${order.id}`, {
				...order,
				...updates,
			});
			setOrders((prev: Order[]) =>
				prev.map((o) => (o.id === order.id ? res.data : o))
			);
			if (updates.status === "CONCLUIDA") onStockUpdate(order.items);
			setPopoverId(null);
		} catch (err) {
			alert("Erro ao atualizar status");
		}
	};
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			const newFiles = Array.from(e.target.files).map((f) => f.name);
			setFormData((prev) => ({
				...prev,
				anexos: [...(prev.anexos || []), ...newFiles],
			}));
		}
	};
	const filteredOrders = useMemo(() => {
		return orders.filter((o) => {
			if (filterStart && new Date(o.data) < new Date(filterStart)) return false;
			if (filterEnd) {
				const end = new Date(filterEnd);
				end.setHours(23, 59, 59, 999);
				if (new Date(o.data) > end) return false;
			}
			if (filterClient && o.cliente_id !== Number(filterClient)) return false;
			if (filterServices.length > 0) {
				const hasService = o.items.some((i) =>
					filterServices.includes(i.servico)
				);
				if (!hasService) return false;
			}
			return true;
		});
	}, [orders, filterStart, filterEnd, filterClient, filterServices]);
	const columns = useMemo(() => {
		return {
			ABERTA: filteredOrders.filter((o) => o.status === "ABERTA"),
			CONCLUIDA: filteredOrders.filter((o) => o.status === "CONCLUIDA"),
			CANCELADA: filteredOrders.filter((o) => o.status === "CANCELADA"),
		};
	}, [filteredOrders]);

	return (
		<div className='flex flex-col h-[calc(100vh-theme(spacing.32))] space-y-4'>
			{/* ... (Barra de Filtros e Grid Kanban mantidos iguais ao anterior) ... */}
			<div className='sticky top-0 z-40 bg-slate-50 pb-2'>
				<div className='flex flex-col md:flex-row justify-between items-start gap-4'>
					<div className='flex flex-wrap gap-2 w-full md:w-auto items-end'>
						<div className='flex items-center gap-2 bg-white border border-slate-200 rounded-[10px] p-2 w-full md:w-auto shadow-sm'>
							<Filter className='w-4 h-4 text-indigo-500' />
							<input
								type='date'
								className='text-xs outline-none bg-transparent w-full md:w-auto'
								value={filterStart}
								onChange={(e) => setFilterStart(e.target.value)}
							/>
							<span className='text-slate-300'>|</span>
							<input
								type='date'
								className='text-xs outline-none bg-transparent w-full md:w-auto'
								value={filterEnd}
								onChange={(e) => setFilterEnd(e.target.value)}
							/>
						</div>
						<div className='w-full md:w-40 z-50'>
							<MultiSelect
								options={uniqueServices}
								selected={filterServices}
								onChange={setFilterServices}
								placeholder='Serviços'
							/>
						</div>
						<select
							className='text-xs border border-slate-200 rounded-[10px] p-2 bg-white outline-none h-[42px] shadow-sm'
							value={filterClient}
							onChange={(e) => setFilterClient(e.target.value)}
						>
							<option value=''>Todos Clientes</option>{" "}
							{clients.map((c) => (
								<option key={c.id} value={c.id}>
									{c.nome}
								</option>
							))}
						</select>
						<button
							onClick={() => {
								setFilterStart("");
								setFilterEnd("");
								setFilterClient("");
								setFilterServices([]);
							}}
							className='text-xs text-red-500 font-bold px-2 h-[42px]'
						>
							X
						</button>
					</div>
					<button
						onClick={() => {
							setEditingOrder(null);
							setFormData({
								items: [],
								anexos: [],
								status_pagamento: "NAO_PAGO",
								desconto_pontual: 0,
							});
							setIsModalOpen(true);
						}}
						className='flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-[10px] hover:bg-indigo-700 transition shadow-sm font-medium w-full md:w-auto justify-center'
					>
						<Plus className='w-4 h-4' /> Nova OS
					</button>
				</div>
			</div>

			<div className='flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 min-h-0 pb-20 md:pb-0 z-0'>
				{Object.entries(columns).map(([status, list]) => (
					<div
						key={status}
						className='flex flex-col bg-slate-100 rounded-[10px] h-full overflow-hidden border border-slate-200'
					>
						<div className='p-3 bg-white border-b border-slate-200 flex justify-between items-center sticky top-0 z-10'>
							<h3 className='font-bold text-slate-700 uppercase text-xs tracking-wider'>
								{status}
							</h3>
							<span className='bg-slate-100 text-slate-600 px-2 py-0.5 rounded-[10px] text-xs font-bold'>
								{list.length}
							</span>
						</div>
						<div className='p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1'>
							{list.map((order) => (
								<Card
									key={order.id}
									className='p-4 hover:border-indigo-300 group cursor-default relative'
								>
									<div className='flex justify-between items-start mb-2'>
										<span className='font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 rounded-[5px]'>
											#{order.id}
										</span>
										<div className='flex gap-2'>
											<button
												onClick={() =>
													setPopoverId(
														popoverId === order.id ? null : order.id ?? null
													)
												}
												className='text-slate-300 hover:text-indigo-500 relative'
											>
												<MoreHorizontal className='w-4 h-4' />
												{popoverId === order.id && (
													<div className='absolute right-0 top-6 bg-white shadow-xl border border-slate-100 rounded-[10px] p-2 z-50 w-32 flex flex-col gap-1'>
														<button
															onClick={() =>
																updateStatus(order, {
																	status_pagamento: "PAGO",
																})
															}
															className='text-xs text-left px-2 py-1.5 hover:bg-emerald-50 text-emerald-700 rounded-[5px]'
														>
															Pago
														</button>
														<button
															onClick={() =>
																updateStatus(order, {
																	status_pagamento: "PARCIAL",
																})
															}
															className='text-xs text-left px-2 py-1.5 hover:bg-amber-50 text-amber-700 rounded-[5px]'
														>
															Parcial
														</button>
														<button
															onClick={() =>
																updateStatus(order, {
																	status_pagamento: "NAO_PAGO",
																})
															}
															className='text-xs text-left px-2 py-1.5 hover:bg-red-50 text-red-700 rounded-[5px]'
														>
															Não Pago
														</button>
														<div className='h-px bg-slate-100 my-1'></div>
														<button
															onClick={() => handleDelete(order.id!)}
															className='text-xs text-left px-2 py-1.5 hover:bg-red-50 text-red-600 rounded-[5px] flex items-center gap-2'
														>
															<Trash2 className='w-3 h-3' /> Apagar
														</button>
													</div>
												)}
											</button>
											<button
												onClick={() => {
													setEditingOrder(order);
													setFormData(order);
													setIsModalOpen(true);
												}}
												className='text-slate-300 hover:text-indigo-500'
											>
												<Edit2 className='w-4 h-4' />
											</button>
										</div>
									</div>
									<div className='flex justify-between items-start mb-1'>
										<h4 className='font-bold text-slate-800 text-base mb-1'>
											{order.cliente_nome}
										</h4>
										<Badge status={order.status_pagamento || "NAO_PAGO"} />
									</div>
									<p className='text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed'>
										{order.descricao || "Sem descrição detalhada."}
									</p>
									<div className='flex items-center gap-3 text-[10px] text-slate-400 mb-3 bg-slate-50 p-2 rounded-[10px]'>
										<div className='flex items-center gap-1'>
											<Clock className='w-3 h-3' />
											<span>{Utils.formatDateTime(order.data)}</span>
										</div>
										{order.anexos && order.anexos.length > 0 && (
											<div className='flex items-center gap-1 text-indigo-500 font-medium'>
												<Paperclip className='w-3 h-3' />
												<span>{order.anexos.length}</span>
											</div>
										)}
									</div>
									<div className='flex flex-col gap-2 pt-2 border-t border-slate-100'>
										<div className='flex justify-between items-center'>
											<span className='font-bold text-slate-700 text-lg'>
												{Utils.formatCurrency(order.total)}
											</span>
										</div>
									</div>
								</Card>
							))}
						</div>
					</div>
				))}
			</div>

			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={editingOrder ? "Editar OS" : "Nova Ordem"}
				size='lg'
			>
				<div className='space-y-6'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Cliente *
							</label>
							<select
								className='w-full border border-slate-200 rounded-[10px] p-2.5 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none text-sm'
								value={formData.cliente_id}
								onChange={(e) =>
									setFormData({
										...formData,
										cliente_id: Number(e.target.value),
									})
								}
							>
								<option value='0'>Selecione...</option>
								{clients.map((c) => (
									<option key={c.id} value={c.id}>
										{c.nome}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Pagamento
							</label>
							<div className='flex gap-2'>
								<button
									onClick={() =>
										setFormData({ ...formData, status_pagamento: "NAO_PAGO" })
									}
									className={`flex-1 py-2 text-xs font-bold rounded-[10px] border ${
										formData.status_pagamento === "NAO_PAGO"
											? "bg-red-50 text-red-700 border-red-200"
											: "text-slate-500 border-slate-200"
									}`}
								>
									Não Pago
								</button>
								<button
									onClick={() =>
										setFormData({ ...formData, status_pagamento: "PARCIAL" })
									}
									className={`flex-1 py-2 text-xs font-bold rounded-[10px] border ${
										formData.status_pagamento === "PARCIAL"
											? "bg-amber-50 text-amber-700 border-amber-200"
											: "text-slate-500 border-slate-200"
									}`}
								>
									Parcial
								</button>
								<button
									onClick={() =>
										setFormData({ ...formData, status_pagamento: "PAGO" })
									}
									className={`flex-1 py-2 text-xs font-bold rounded-[10px] border ${
										formData.status_pagamento === "PAGO"
											? "bg-emerald-50 text-emerald-700 border-emerald-200"
											: "text-slate-500 border-slate-200"
									}`}
								>
									Pago
								</button>
							</div>
						</div>
					</div>
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Anexos
						</label>
						<label className='relative cursor-pointer w-full bg-white border border-slate-200 border-dashed rounded-[10px] p-2 flex items-center justify-center gap-2 hover:bg-indigo-50 transition border-indigo-200'>
							<input
								type='file'
								multiple
								className='hidden'
								onChange={handleFileUpload}
							/>
							<Paperclip className='w-4 h-4 text-indigo-500' />
							<span className='text-sm text-slate-600 font-medium'>
								Adicionar arquivos
							</span>
						</label>
						{formData.anexos && formData.anexos.length > 0 && (
							<div className='mt-2 flex flex-wrap gap-2'>
								{formData.anexos.map((file, idx) => (
									<span
										key={idx}
										className='text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-[5px] flex items-center gap-1 border border-slate-200'
									>
										<FileText className='w-3 h-3' /> {file}
									</span>
								))}
							</div>
						)}
					</div>
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Descrição Detalhada
						</label>
						<textarea
							rows={4}
							className='w-full border border-slate-200 rounded-[10px] p-3 bg-slate-50 focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm'
							value={formData.descricao}
							onChange={(e) =>
								setFormData({ ...formData, descricao: e.target.value })
							}
							placeholder='Descreva todos os detalhes do serviço aqui...'
						/>
					</div>
					<div className='bg-slate-50 p-5 rounded-[10px] border border-slate-200 shadow-inner'>
						<div className='grid grid-cols-2 md:grid-cols-12 gap-3 items-end'>
							<div className='md:col-span-12 flex justify-between items-center mb-2 border-b border-slate-200 pb-2'>
								<span className='text-xs font-bold text-indigo-600 uppercase'>
									Novo Item
								</span>
							</div>

							{/* LINHA 1: Serviço e Material */}
							<div className='md:col-span-4'>
								<label className='text-[10px] font-bold text-slate-400 uppercase mb-1 block'>
									1. Serviço
								</label>
								<select
									className='w-full text-sm border border-slate-200 p-2 rounded-[10px]'
									value={tempItem.servico}
									onChange={(e) =>
										setTempItem({
											...tempItem,
											servico: e.target.value,
											material: "",
											cor: "",
											gramatura: "",
											tamanho: "",
										})
									}
								>
									<option value=''>...</option>
									{uniqueServices.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</select>
							</div>
							<div className='md:col-span-4'>
								<label className='text-[10px] font-bold text-slate-400 uppercase mb-1 block'>
									2. Material
								</label>
								<select
									className='w-full text-sm border border-slate-200 p-2 rounded-[10px]'
									value={tempItem.material}
									onChange={(e) =>
										setTempItem({
											...tempItem,
											material: e.target.value,
											cor: "",
											gramatura: "",
											tamanho: "",
										})
									}
									disabled={!tempItem.servico}
								>
									<option value=''>...</option>
									{availableMaterials.map((m) => (
										<option key={m} value={m}>
											{m}
										</option>
									))}
								</select>
							</div>
							<div className='md:col-span-4'>
								<label className='text-[10px] font-bold text-slate-400 uppercase mb-1 block'>
									3. Especificação
								</label>
								<select
									className='w-full text-sm border border-slate-200 p-2 rounded-[10px]'
									value={tempItem.gramatura || ""}
									onChange={(e) =>
										setTempItem({
											...tempItem,
											gramatura: e.target.value,
											tamanho: "",
											cor: "",
										})
									}
									disabled={!availableSpecs.length}
								>
									<option value=''>N/A</option>
									{availableSpecs.map((g) => (
										<option key={g} value={g}>
											{g}
										</option>
									))}
								</select>
							</div>

							{/* LINHA 2: Tamanho, Cor, Qtd, Checkbox e Botão */}
							<div className='md:col-span-3'>
								<label className='text-[10px] font-bold text-slate-400 uppercase mb-1 block'>
									4. Tamanho
								</label>
								<select
									className='w-full text-sm border border-slate-200 p-2 rounded-[10px]'
									value={tempItem.tamanho || ""}
									onChange={(e) =>
										setTempItem({ ...tempItem, tamanho: e.target.value })
									}
									disabled={!availableSizes.length}
								>
									<option value=''>N/A</option>
									{availableSizes.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</select>
							</div>
							<div className='md:col-span-3'>
								<label className='text-[10px] font-bold text-slate-400 uppercase mb-1 block'>
									5. Cor
								</label>
								<select
									className='w-full text-sm border border-slate-200 p-2 rounded-[10px]'
									value={tempItem.cor}
									onChange={(e) =>
										setTempItem({ ...tempItem, cor: e.target.value })
									}
									disabled={!tempItem.material}
								>
									<option value=''>...</option>
									{availableColors.map((c) => (
										<option key={c} value={c}>
											{c}
										</option>
									))}
								</select>
							</div>
							<div className='md:col-span-2'>
								<label className='text-[10px] font-bold text-slate-400 uppercase mb-1 block'>
									6. Qtd
								</label>
								<input
									type='number'
									className='w-full text-sm border border-slate-200 p-2 rounded-[10px]'
									value={tempItem.quantidade}
									onChange={(e) =>
										setTempItem({
											...tempItem,
											quantidade: Number(e.target.value),
										})
									}
								/>
							</div>
							<div className='md:col-span-2 flex items-center h-full pb-2'>
								<label className='flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600'>
									<input
										type='checkbox'
										className='w-4 h-4 rounded text-indigo-600'
										checked={tempItem.is_double_sided}
										onChange={(e) =>
											setTempItem({
												...tempItem,
												is_double_sided: e.target.checked,
											})
										}
									/>
									Frente/Verso
								</label>
							</div>
							<div className='md:col-span-2'>
								<button
									onClick={handleAddItem}
									disabled={!tempItem.quantidade}
									className='w-full bg-slate-800 text-white text-sm py-2 rounded-[10px] hover:bg-slate-900 transition h-[38px] mt-auto'
								>
									Adicionar
								</button>
							</div>
						</div>
					</div>

					{/* Lista de Itens */}
					<div className='space-y-2 max-h-48 overflow-y-auto custom-scrollbar bg-white rounded-[10px] border border-slate-100 p-1'>
						{formData.items?.length === 0 ? (
							<div className='p-8 text-center text-slate-400 text-sm'>
								Nenhum item adicionado ainda.
							</div>
						) : (
							formData.items?.map((item, idx) => (
								<div
									key={idx}
									className='flex justify-between items-center p-3 hover:bg-slate-50 transition border-b border-slate-50 last:border-0'
								>
									<div>
										<p className='font-bold text-sm text-slate-800'>
											{item.servico} - {item.material}{" "}
											{item.gramatura ? `(${item.gramatura})` : ""}
										</p>
										<div className='flex gap-2 text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide'>
											<span className='bg-slate-100 px-1.5 rounded'>
												{item.cor}
											</span>
											<span>Qtd: {item.quantidade}</span>
											{item.is_double_sided && (
												<span className='bg-indigo-50 text-indigo-600 px-1.5 rounded'>
													F/V
												</span>
											)}
										</div>
									</div>
									<div className='text-right flex items-center gap-4'>
										<p className='font-bold text-slate-700'>
											{Utils.formatCurrency(item.total)}
										</p>
										<button
											onClick={() =>
												setFormData((prev) => ({
													...prev,
													items: prev.items?.filter((_, i) => i !== idx),
												}))
											}
											className='text-slate-300 hover:text-red-500 transition'
										>
											<Trash2 className='w-4 h-4' />
										</button>
									</div>
								</div>
							))
						)}
					</div>

					{/* Rodapé do Modal com Desconto */}
					<div className='pt-5 border-t border-slate-100'>
						<div className='flex justify-between items-center mb-4'>
							<div className='flex items-center gap-3'>
								<label className='text-xs font-bold text-slate-500 uppercase'>
									Desconto Pontual (%)
								</label>
								<input
									type='number'
									className='w-20 border border-slate-200 rounded-[10px] p-2 text-sm text-center font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none'
									value={formData.desconto_pontual || 0}
									onChange={(e) =>
										setFormData({
											...formData,
											desconto_pontual: Number(e.target.value),
										})
									}
								/>
							</div>
							<div className='text-right'>
								<p className='text-xs text-slate-400 font-bold uppercase mb-1'>
									Total Final
								</p>
								<p className='text-3xl font-bold text-indigo-600 tracking-tight'>
									{Utils.formatCurrency(
										(formData.items?.reduce((acc, i) => acc + i.total, 0) ||
											0) *
											(1 - (formData.desconto_pontual || 0) / 100)
									)}
								</p>
							</div>
						</div>
						<div className='flex justify-end gap-3'>
							<button
								onClick={() => setIsModalOpen(false)}
								className='text-slate-500 hover:text-slate-700 font-medium px-4'
							>
								Cancelar
							</button>
							<button
								onClick={handleSave}
								disabled={!formData.cliente_id || formData.items?.length === 0}
								className='bg-indigo-600 text-white px-8 py-3 rounded-[10px] hover:bg-indigo-700 font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed'
							>
								Salvar Ordem
							</button>
						</div>
					</div>
				</div>
			</Modal>
		</div>
	);
};
