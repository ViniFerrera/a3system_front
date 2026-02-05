import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { Utils } from "@/utils";
import { StockItem } from "@/types";
import {
	Plus,
	Edit2,
	Trash2,
	Settings,
	Wrench,
	AlertTriangle,
	CheckCircle2,
	Power,
	Image as ImageIcon,
	Calendar,
	Box,
} from "lucide-react";
import { api } from "@/services/api";

// Definição da Interface
export interface Machine {
	id?: number;
	nome: string;
	subtitulo?: string;
	tipo: string;
	status: "ATIVO" | "MANUTENCAO" | "INATIVO";
	descricao?: string;
	imagem_url?: string;
	ultima_manutencao?: string;
	proxima_manutencao?: string;
	estoque_associado_ids?: number[];
}

export const MachineryModule = ({
	machinery = [],
	setMachinery,
	stock = [],
}: {
	machinery: Machine[];
	setMachinery: Function;
	stock: StockItem[];
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

	const [formData, setFormData] = useState<Partial<Machine>>({
		status: "ATIVO",
		estoque_associado_ids: [],
	});

	const [selectedStockNames, setSelectedStockNames] = useState<string[]>([]);

	// Proteção: Garante que stock é array antes de mapear
	const stockOptions = useMemo(() => {
		if (!Array.isArray(stock)) return [];
		return stock
			.map((s) => s.nome || "")
			.filter(Boolean)
			.sort();
	}, [stock]);

	// Helpers de Visualização (Status e Cores)
	const getStatusInfo = (status: string) => {
		switch (status) {
			case "ATIVO":
				return {
					color: "text-emerald-600 bg-emerald-50 border-emerald-200",
					icon: CheckCircle2,
					label: "Operando",
				};
			case "MANUTENCAO":
				return {
					color: "text-amber-600 bg-amber-50 border-amber-200",
					icon: Wrench,
					label: "Manutenção",
				};
			case "INATIVO":
				return {
					color: "text-slate-500 bg-slate-100 border-slate-200",
					icon: Power,
					label: "Parada",
				};
			default:
				return {
					color: "text-slate-500 bg-slate-50",
					icon: Settings,
					label: status || "Desconhecido",
				};
		}
	};

	const openModal = (machine?: Machine) => {
		if (machine) {
			setEditingMachine(machine);
			setFormData(machine);

			// Recupera os nomes dos itens de estoque baseados nos IDs salvos
			const safeStock = Array.isArray(stock) ? stock : [];
			const relatedStockNames = safeStock
				.filter((s) => machine.estoque_associado_ids?.includes(s.id || 0))
				.map((s) => s.nome);
			setSelectedStockNames(relatedStockNames);
		} else {
			setEditingMachine(null);
			setFormData({ status: "ATIVO", estoque_associado_ids: [] });
			setSelectedStockNames([]);
		}
		setIsModalOpen(true);
	};

	const handleSave = async () => {
		if (!formData.nome || !formData.tipo) {
			alert("Nome e Tipo são obrigatórios.");
			return;
		}

		// Converte nomes selecionados de volta para IDs
		const safeStock = Array.isArray(stock) ? stock : [];
		const selectedIds = safeStock
			.filter((s) => selectedStockNames.includes(s.nome))
			.map((s) => s.id || 0);

		const payload = { ...formData, estoque_associado_ids: selectedIds };

		try {
			if (editingMachine && editingMachine.id) {
				const res = await api.put(`/machinery/${editingMachine.id}`, payload);
				setMachinery((prev: Machine[]) =>
					prev.map((m) => (m.id === editingMachine.id ? res.data : m))
				);
			} else {
				const res = await api.post("/machinery", payload);
				setMachinery((prev: Machine[]) => [res.data, ...prev]);
			}
			setIsModalOpen(false);
			setEditingMachine(null);
			setEditingMachine(null);
		} catch (err) {
			console.error(err);
			alert("Erro ao salvar maquinário (verifique o console).");
		}
	};

	const handleDelete = async (id: number) => {
		if (confirm("Tem certeza que deseja remover este maquinário?")) {
			try {
				await api.delete(`/machinery/${id}`);
				setMachinery((prev: Machine[]) => prev.filter((m) => m.id !== id));
			} catch (err) {
				alert("Erro ao excluir maquinário");
			}
		}
	};

	// --- Helper para Renderizar Barra de Progresso do Estoque ---
	const renderStockBar = (item: StockItem) => {
		const saldo = item.saldo || 0;
		const min = item.minimo || 0;

		// Lógica de Cores solicitada:
		// Vermelho: Bateu limite ou abaixo
		// Amarelo: 10% do limite (entre min e min * 1.1)
		// Verde: Estoque bom
		let colorClass = "bg-emerald-500";
		let bgClass = "bg-emerald-50 text-emerald-700";

		if (saldo <= min) {
			colorClass = "bg-red-500";
			bgClass = "bg-red-50 text-red-700";
		} else if (saldo <= min * 1.1) {
			colorClass = "bg-amber-500";
			bgClass = "bg-amber-50 text-amber-700";
		}

		// Cálculo da % para a barra visual
		// Como não temos "máximo", assumimos que o dobro do mínimo é um estoque "confortável/cheio" para a barra
		const safeCap = Math.max(min * 2, 1);
		const percentage = Math.min((saldo / safeCap) * 100, 100);

		return (
			<div
				key={item.id}
				className={`p-2 rounded-[8px] border border-slate-100 mb-1.5 last:mb-0 text-xs ${bgClass}`}
			>
				<div className='flex justify-between items-center mb-1'>
					<span className='font-bold truncate max-w-[120px]' title={item.nome}>
						{item.nome}
					</span>
					<div className='text-[10px] font-mono'>
						<span className='font-bold'>{saldo}</span>
						<span className='text-slate-400 mx-0.5'>/</span>
						<span className='text-slate-500'>{min}</span>
						<span className='text-slate-400 ml-0.5'>{item.unidade}</span>
					</div>
				</div>
				<div className='h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden'>
					<div
						className={`h-full rounded-full ${colorClass} transition-all duration-500`}
						style={{ width: `${percentage}%` }}
					/>
				</div>
			</div>
		);
	};

	const safeMachinery = Array.isArray(machinery) ? machinery : [];

	return (
		<div className='space-y-6 animate-in fade-in duration-500 pb-20 md:pb-0'>
			{/* Header */}
			<div className='flex flex-col md:flex-row justify-between items-center gap-4'>
				<div>
					<h2 className='text-2xl font-bold text-slate-800 flex items-center gap-2'>
						<Settings className='w-6 h-6 text-indigo-600' />
						Maquinário & Equipamentos
					</h2>
					<p className='text-sm text-slate-500 mt-1'>
						Gerencie seus ativos e monitore os níveis de insumos.
					</p>
				</div>
				<button
					onClick={() => openModal()}
					className='flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-[10px] hover:bg-indigo-700 transition shadow-sm font-medium w-full md:w-auto justify-center'
				>
					<Plus className='w-4 h-4' /> Novo Maquinário
				</button>
			</div>

			{/* Grid de Maquinas - AJUSTADO PARA MAX 3 COLUNAS */}
			{safeMachinery.length === 0 ? (
				<div className='text-center py-20 bg-slate-50 rounded-[10px] border border-slate-200 border-dashed'>
					<Settings className='w-12 h-12 text-slate-300 mx-auto mb-3' />
					<p className='text-slate-500 font-medium'>
						Nenhum maquinário cadastrado ainda.
					</p>
					<button
						onClick={() => openModal()}
						className='text-indigo-600 text-sm font-bold mt-2 hover:underline'
					>
						Cadastrar o primeiro item
					</button>
				</div>
			) : (
				// Ajuste 1: Removido xl:grid-cols-4 para manter cards mais largos (Max 3 colunas)
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					{safeMachinery.map((machine) => {
						const statusInfo = getStatusInfo(machine.status);
						const StatusIcon = statusInfo.icon;

						const safeStock = Array.isArray(stock) ? stock : [];
						const linkedStockItems = safeStock.filter((s) =>
							machine.estoque_associado_ids?.includes(s.id || 0)
						);

						return (
							<Card
								key={machine.id}
								className='group hover:-translate-y-1 transition-all duration-300 overflow-hidden border-slate-200 flex flex-col'
							>
								{/* Imagem / Placeholder */}
								<div className='h-48 bg-slate-100 relative border-b border-slate-100 flex items-center justify-center overflow-hidden'>
									{machine.imagem_url ? (
										<img
											src={machine.imagem_url}
											alt={machine.nome}
											className='w-full h-full object-cover'
										/>
									) : (
										<ImageIcon className='w-12 h-12 text-slate-300' />
									)}

									{/* Badge de Status Absolute */}
									<div
										className={`absolute top-3 left-3 px-2.5 py-1 rounded-[8px] text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 border shadow-sm ${statusInfo.color}`}
									>
										<StatusIcon className='w-3 h-3' />
										{statusInfo.label}
									</div>

									{/* Ações (Edit/Delete) - Top Right */}
									<div className='absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
										<button
											onClick={() => openModal(machine)}
											className='p-2 bg-white/90 text-slate-600 hover:text-indigo-600 rounded-[8px] shadow-sm hover:shadow-md transition-all backdrop-blur-sm'
										>
											<Edit2 className='w-3.5 h-3.5' />
										</button>
										<button
											onClick={() => handleDelete(machine.id!)}
											className='p-2 bg-white/90 text-slate-600 hover:text-red-600 rounded-[8px] shadow-sm hover:shadow-md transition-all backdrop-blur-sm'
										>
											<Trash2 className='w-3.5 h-3.5' />
										</button>
									</div>
								</div>

								{/* Conteúdo do Card */}
								<div className='p-5 flex-1 flex flex-col'>
									<div className='mb-3'>
										<h3 className='font-bold text-slate-800 text-xl leading-tight'>
											{machine.nome}
										</h3>
										<p className='text-xs font-medium text-indigo-500 uppercase tracking-wider mt-1'>
											{machine.subtitulo || machine.tipo}
										</p>
									</div>

									<p className='text-sm text-slate-500 line-clamp-2 mb-4'>
										{machine.descricao || "Sem descrição definida."}
									</p>

									{/* Dados de Manutenção */}
									<div className='grid grid-cols-2 gap-2 mb-4'>
										<div className='bg-slate-50 p-2 rounded-[8px] border border-slate-100'>
											<span className='text-[10px] text-slate-400 block uppercase font-bold'>
												Última Rev.
											</span>
											<div className='flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-600'>
												<Calendar className='w-3 h-3' />
												{machine.ultima_manutencao
													? Utils.formatDate(machine.ultima_manutencao)
													: "-"}
											</div>
										</div>
										<div className='bg-slate-50 p-2 rounded-[8px] border border-slate-100'>
											<span className='text-[10px] text-slate-400 block uppercase font-bold'>
												Próxima
											</span>
											<div className='flex items-center gap-1.5 mt-0.5 text-xs font-semibold text-slate-600'>
												<AlertTriangle className='w-3 h-3 text-amber-500' />
												{machine.proxima_manutencao
													? Utils.formatDate(machine.proxima_manutencao)
													: "-"}
											</div>
										</div>
									</div>

									{/* Ajuste 2, 3 e 4: Insumos Vinculados com Barra de Progresso */}
									<div className='pt-3 border-t border-slate-100 mt-auto'>
										<p className='text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-1'>
											<Box className='w-3 h-3' /> Estoque de Insumos
										</p>
										<div className='space-y-1'>
											{linkedStockItems.length > 0 ? (
												// Mostra os 3 primeiros e um contador se houver mais
												<>
													{linkedStockItems
														.slice(0, 3)
														.map((item) => renderStockBar(item))}
													{linkedStockItems.length > 3 && (
														<div className='text-center text-[10px] text-slate-400 font-medium py-1 bg-slate-50 rounded mt-1'>
															+ {linkedStockItems.length - 3} outros itens
														</div>
													)}
												</>
											) : (
												<span className='text-xs text-slate-400 italic block py-2 bg-slate-50 rounded text-center'>
													Nenhum insumo vinculado.
												</span>
											)}
										</div>
									</div>
								</div>
							</Card>
						);
					})}
				</div>
			)}

			{/* Modal de Formulário */}
			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={editingMachine ? "Editar Maquinário" : "Nova Máquina"}
				size='lg'
			>
				<div className='space-y-5'>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
						<div className='md:col-span-2'>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Nome do Equipamento *
							</label>
							<input
								type='text'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
								placeholder='Ex: Impressora Offset Heidelberg'
								value={formData.nome || ""}
								onChange={(e) =>
									setFormData({ ...formData, nome: e.target.value })
								}
							/>
						</div>

						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Tipo / Categoria *
							</label>
							<input
								type='text'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
								placeholder='Ex: Impressão Digital'
								value={formData.tipo || ""}
								onChange={(e) =>
									setFormData({ ...formData, tipo: e.target.value })
								}
							/>
						</div>

						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Subtítulo (Opcional)
							</label>
							<input
								type='text'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
								placeholder='Ex: Setor A - Térreo'
								value={formData.subtitulo || ""}
								onChange={(e) =>
									setFormData({ ...formData, subtitulo: e.target.value })
								}
							/>
						</div>
					</div>

					{/* Status Selection */}
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Status Operacional
						</label>
						<div className='flex gap-3'>
							{["ATIVO", "MANUTENCAO", "INATIVO"].map((status) => {
								const info = getStatusInfo(status);
								const isSelected = formData.status === status;
								return (
									<button
										key={status}
										onClick={() =>
											setFormData({ ...formData, status: status as any })
										}
										className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[10px] border transition-all text-xs font-bold uppercase ${
											isSelected
												? `${info.color} ring-2 ring-offset-1 ring-indigo-200 shadow-sm`
												: "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
										}`}
									>
										<info.icon className='w-4 h-4' />
										{info.label}
									</button>
								);
							})}
						</div>
					</div>

					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							URL da Imagem
						</label>
						<div className='flex gap-2'>
							<div className='flex-1 relative'>
								<ImageIcon className='absolute left-3 top-3 w-4 h-4 text-slate-400' />
								<input
									type='text'
									className='w-full pl-9 border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
									placeholder='https://...'
									value={formData.imagem_url || ""}
									onChange={(e) =>
										setFormData({ ...formData, imagem_url: e.target.value })
									}
								/>
							</div>
						</div>
					</div>

					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Insumos de Estoque Vinculados
						</label>
						<p className='text-[10px] text-slate-400 mb-2'>
							Selecione quais materiais do estoque esta máquina consome.
						</p>
						<MultiSelect
							options={stockOptions}
							selected={selectedStockNames}
							onChange={setSelectedStockNames}
							placeholder='Selecione materiais...'
						/>
					</div>

					<div className='grid grid-cols-2 gap-5'>
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Última Manutenção
							</label>
							<input
								type='date'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
								value={formData.ultima_manutencao || ""}
								onChange={(e) =>
									setFormData({
										...formData,
										ultima_manutencao: e.target.value,
									})
								}
							/>
						</div>
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Próxima Manutenção
							</label>
							<input
								type='date'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
								value={formData.proxima_manutencao || ""}
								onChange={(e) =>
									setFormData({
										...formData,
										proxima_manutencao: e.target.value,
									})
								}
							/>
						</div>
					</div>

					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Descrição Técnica
						</label>
						<textarea
							rows={3}
							className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-slate-50 focus:bg-white'
							placeholder='Especificações técnicas, número de série, observações...'
							value={formData.descricao || ""}
							onChange={(e) =>
								setFormData({ ...formData, descricao: e.target.value })
							}
						/>
					</div>

					<div className='flex justify-end pt-4 border-t border-slate-100 gap-3'>
						<button
							onClick={() => setIsModalOpen(false)}
							className='text-slate-500 hover:text-slate-700 font-medium px-4 text-sm'
						>
							Cancelar
						</button>
						<button
							onClick={handleSave}
							className='bg-indigo-600 text-white px-6 py-2.5 rounded-[10px] hover:bg-indigo-700 font-bold shadow-md text-sm flex items-center gap-2'
						>
							<Settings className='w-4 h-4' /> Salvar Máquina
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
