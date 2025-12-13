import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { StockItem, PriceRule } from "@/types";
import { Box, AlertTriangle, Plus, Edit2, Trash2 } from "lucide-react";
import { api } from "@/services/api";
export const StockModule = ({
	stock,
	setStock,
	priceTable,
}: {
	stock: StockItem[];
	setStock: Function;
	priceTable: PriceRule[];
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<StockItem | null>(null);
	const [formData, setFormData] = useState<Partial<StockItem>>({});
	const uniqueMaterials = useMemo(() => {
		const mats = new Set<string>();
		if (priceTable) priceTable.forEach((p) => mats.add(p.Material));
		return Array.from(mats).sort();
	}, [priceTable]);
	const uniqueSpecs = useMemo(() => {
		const specs = new Set<string>();
		if (priceTable)
			priceTable.forEach((p) => {
				if (p.Gramatura) specs.add(p.Gramatura);
			});
		return Array.from(specs).sort();
	}, [priceTable]);
	const uniqueSizes = useMemo(() => {
		const sizes = new Set<string>();
		if (priceTable)
			priceTable.forEach((p) => {
				if (p.Papel) sizes.add(p.Papel);
			});
		return Array.from(sizes).sort();
	}, [priceTable]);
	const handleSave = async () => {
		if (!formData.nome || !formData.unidade) {
			alert("Nome e Unidade são obrigatórios.");
			return;
		}
		try {
			if (editingItem) {
				const res = await api.put(`/stock/${editingItem.id}`, formData);
				setStock((prev: StockItem[]) =>
					prev.map((item) => (item.id === editingItem.id ? res.data : item))
				);
			} else {
				const res = await api.post("/stock", formData);
				setStock((prev: StockItem[]) => [...prev, res.data]);
			}
			setIsModalOpen(false);
			setEditingItem(null);
			setFormData({});
		} catch (err) {
			alert("Erro ao salvar item de estoque");
		}
	};
	const handleDelete = async (id: number) => {
		if (confirm("Excluir este item?")) {
			try {
				await api.delete(`/stock/${id}`);
				setStock((prev: StockItem[]) => prev.filter((item) => item.id !== id));
			} catch (err) {
				alert("Erro ao excluir item");
			}
		}
	};
	const openModal = (item?: StockItem) => {
		if (item) {
			setEditingItem(item);
			setFormData(item);
		} else {
			setEditingItem(null);
			setFormData({
				saldo: 0,
				minimo: 10,
				associacao_material: "",
				associacao_especificacao: "",
				associacao_tamanho: "",
			});
		}
		setIsModalOpen(true);
	};
	return (
		<div className='space-y-6'>
			{" "}
			<div className='flex justify-between items-center'>
				{" "}
				<h2 className='text-2xl font-bold text-slate-800'>
					Controle de Estoque
				</h2>{" "}
				<button
					onClick={() => openModal()}
					className='flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-[10px] hover:bg-indigo-700 transition shadow-sm font-medium'
				>
					{" "}
					<Plus className='w-4 h-4' /> Novo Item{" "}
				</button>{" "}
			</div>{" "}
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
				{" "}
				{stock.map((item) => (
					<Card
						key={item.id}
						className='p-6 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300'
					>
						{" "}
						<div
							className={`absolute top-0 left-0 w-1.5 h-full ${
								item.saldo < item.minimo ? "bg-red-500" : "bg-emerald-500"
							}`}
						></div>{" "}
						<div className='flex justify-between items-start pl-2 mb-4'>
							{" "}
							<div>
								{" "}
								<h4 className='font-bold text-slate-700 text-lg'>
									{item.nome}
								</h4>{" "}
								<p className='text-xs font-medium text-slate-400 mt-1 uppercase tracking-wide'>
									Mínimo: {item.minimo} {item.unidade}
								</p>{" "}
							</div>{" "}
							<div
								className={`p-2 rounded-[10px] ${
									item.saldo < item.minimo
										? "bg-red-50 text-red-500"
										: "bg-slate-50 text-slate-400"
								}`}
							>
								<Box className='w-6 h-6' />
							</div>{" "}
						</div>{" "}
						<div className='flex justify-between items-end pl-2'>
							{" "}
							<div>
								{" "}
								<span
									className={`text-4xl font-bold tracking-tight ${
										item.saldo < item.minimo ? "text-red-600" : "text-slate-800"
									}`}
								>
									{item.saldo}
								</span>{" "}
								<span className='text-sm text-slate-500 ml-1.5 font-medium'>
									{item.unidade}
								</span>{" "}
							</div>{" "}
							<div className='flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity'>
								{" "}
								<button
									onClick={() => openModal(item)}
									className='p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[10px]'
								>
									<Edit2 className='w-4 h-4' />
								</button>{" "}
								<button
									onClick={() => handleDelete(item.id!)}
									className='p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[10px]'
								>
									<Trash2 className='w-4 h-4' />
								</button>{" "}
							</div>{" "}
						</div>{" "}
						{item.saldo < item.minimo && (
							<div className='mt-4 ml-2 text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-[10px] inline-flex items-center gap-2'>
								{" "}
								<AlertTriangle className='w-3.5 h-3.5' /> Nível Crítico{" "}
							</div>
						)}{" "}
						<div className='mt-3 pl-2 pt-3 border-t border-slate-100 text-[10px] text-slate-400'>
							{" "}
							<span className='font-bold uppercase tracking-wider block mb-1'>
								Associação de Baixa
							</span>{" "}
							{item.associacao_material ? (
								<div className='flex flex-wrap gap-1'>
									{" "}
									<span className='bg-slate-100 px-1.5 py-0.5 rounded'>
										{item.associacao_material}
									</span>{" "}
									{item.associacao_especificacao && (
										<span className='bg-slate-100 px-1.5 py-0.5 rounded'>
											{item.associacao_especificacao}
										</span>
									)}{" "}
									{item.associacao_tamanho && (
										<span className='bg-slate-100 px-1.5 py-0.5 rounded'>
											{item.associacao_tamanho}
										</span>
									)}{" "}
								</div>
							) : (
								<span>Nenhuma</span>
							)}{" "}
						</div>{" "}
					</Card>
				))}{" "}
			</div>{" "}
			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={editingItem ? "Editar Item" : "Novo Item"}
				size='md'
			>
				{" "}
				<div className='space-y-5'>
					{" "}
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Nome *
						</label>
						<input
							type='text'
							className='w-full border border-slate-200 p-2.5 rounded-[10px] outline-none focus:ring-2 focus:ring-indigo-500'
							value={formData.nome || ""}
							onChange={(e) =>
								setFormData({ ...formData, nome: e.target.value })
							}
						/>
					</div>{" "}
					<div className='grid grid-cols-2 gap-4'>
						{" "}
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Unidade
							</label>
							<input
								type='text'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] outline-none focus:ring-2 focus:ring-indigo-500'
								value={formData.unidade || ""}
								onChange={(e) =>
									setFormData({ ...formData, unidade: e.target.value })
								}
								placeholder='Ex: fls'
							/>
						</div>{" "}
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Mínimo
							</label>
							<input
								type='number'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] outline-none focus:ring-2 focus:ring-indigo-500'
								value={formData.minimo || 0}
								onChange={(e) =>
									setFormData({ ...formData, minimo: Number(e.target.value) })
								}
							/>
						</div>{" "}
					</div>{" "}
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Saldo
						</label>
						<input
							type='number'
							className='w-full border border-slate-200 p-2.5 rounded-[10px] outline-none focus:ring-2 focus:ring-indigo-500'
							value={formData.saldo || 0}
							onChange={(e) =>
								setFormData({ ...formData, saldo: Number(e.target.value) })
							}
						/>
					</div>{" "}
					<div className='bg-slate-50 p-4 rounded-[10px] border border-slate-200'>
						{" "}
						<p className='text-xs font-bold text-slate-500 uppercase mb-3 border-b border-slate-200 pb-2'>
							Associação Automática de Baixa
						</p>{" "}
						<div className='space-y-3'>
							{" "}
							<div>
								{" "}
								<label className='block text-[10px] font-bold text-slate-400 uppercase mb-1'>
									Material
								</label>{" "}
								<select
									className='w-full border border-slate-200 p-2 rounded-[10px] outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm'
									value={formData.associacao_material || ""}
									onChange={(e) =>
										setFormData({
											...formData,
											associacao_material: e.target.value,
										})
									}
								>
									{" "}
									<option value=''>Selecione...</option>{" "}
									{uniqueMaterials.map((m) => (
										<option key={m} value={m}>
											{m}
										</option>
									))}{" "}
								</select>{" "}
							</div>{" "}
							<div className='grid grid-cols-2 gap-3'>
								{" "}
								<div>
									{" "}
									<label className='block text-[10px] font-bold text-slate-400 uppercase mb-1'>
										Especificação (Gramatura)
									</label>{" "}
									<select
										className='w-full border border-slate-200 p-2 rounded-[10px] outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm'
										value={formData.associacao_especificacao || ""}
										onChange={(e) =>
											setFormData({
												...formData,
												associacao_especificacao: e.target.value,
											})
										}
									>
										{" "}
										<option value=''>Qualquer</option>{" "}
										{uniqueSpecs.map((s) => (
											<option key={s} value={s}>
												{s}
											</option>
										))}{" "}
									</select>{" "}
								</div>{" "}
								<div>
									{" "}
									<label className='block text-[10px] font-bold text-slate-400 uppercase mb-1'>
										Tamanho (Papel)
									</label>{" "}
									<select
										className='w-full border border-slate-200 p-2 rounded-[10px] outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-sm'
										value={formData.associacao_tamanho || ""}
										onChange={(e) =>
											setFormData({
												...formData,
												associacao_tamanho: e.target.value,
											})
										}
									>
										{" "}
										<option value=''>Qualquer</option>{" "}
										{uniqueSizes.map((s) => (
											<option key={s} value={s}>
												{s}
											</option>
										))}{" "}
									</select>{" "}
								</div>{" "}
							</div>{" "}
						</div>{" "}
					</div>{" "}
					<div className='flex justify-end pt-4 border-t border-slate-100'>
						<button
							onClick={handleSave}
							className='bg-indigo-600 text-white px-6 py-2.5 rounded-[10px] hover:bg-indigo-700 font-bold shadow-md'
						>
							Salvar Item
						</button>
					</div>{" "}
				</div>{" "}
			</Modal>{" "}
		</div>
	);
};
