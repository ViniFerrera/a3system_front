// Apenas o trecho de renderização do Card foi alterado para incluir o .toFixed(2)
// O restante da lógica permanece, mas como solicitado, segue o arquivo completo atualizado.

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { StockItem, PriceRule } from "@/types";
import * as XLSX from "xlsx";
import {
	Box,
	AlertTriangle,
	Plus,
	Edit2,
	Trash2,
	Search,
	Link,
	Printer,
	Layers,
	Settings,
	Download,
	Upload,
} from "lucide-react";
import { api } from "@/services/api";

interface StockItemWithToner extends StockItem {
	is_toner?: boolean;
	print_yield?: number;
	maquinas_associadas_ids?: number[];
}

interface Machine {
	id: number;
	nome: string;
}

export const StockModule = ({
	stock,
	setStock,
	priceTable,
}: {
	stock: StockItemWithToner[];
	setStock: Function;
	priceTable: PriceRule[];
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<StockItemWithToner | null>(
		null
	);
	const [machinesList, setMachinesList] = useState<Machine[]>([]);

	useEffect(() => {
		api
			.get("/machinery")
			.then((res) => setMachinesList(res.data))
			.catch(console.error);
	}, []);

	const machineOptions = useMemo(
		() => machinesList.map((m) => m.nome),
		[machinesList]
	);

	const initialFormState: Partial<StockItemWithToner> = {
		nome: "",
		unidade: "",
		saldo: 0,
		minimo: 10,
		associacao_material: "",
		associacao_especificacao: "",
		associacao_tamanho: "",
		is_toner: false,
		print_yield: 1500,
		maquinas_associadas_ids: [],
	};

	const [formData, setFormData] =
		useState<Partial<StockItemWithToner>>(initialFormState);
	const [selectedMachineNames, setSelectedMachineNames] = useState<string[]>(
		[]
	);

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

	const filteredStock = useMemo(() => {
		let filtered = stock;
		if (searchTerm) {
			const lowerTerm = searchTerm.toLowerCase();
			filtered = stock.filter((item) => {
				const nomeMatch = item.nome?.toLowerCase().includes(lowerTerm);
				const assocMatch = item.associacao_material
					?.toLowerCase()
					.includes(lowerTerm);
				return nomeMatch || assocMatch;
			});
		}
		return filtered;
	}, [stock, searchTerm]);

	const groupedStock = useMemo(() => {
		const groups: Record<string, StockItemWithToner[]> = {};
		const tonerKey = "Toners & Tintas";
		const othersKey = "Outros / Sem Categoria";

		filteredStock.forEach((item) => {
			let key = item.associacao_material;
			if (item.is_toner) {
				key = tonerKey;
			} else if (!key) {
				key = othersKey;
			}
			if (!groups[key]) groups[key] = [];
			groups[key].push(item);
		});

		const sortedKeys = Object.keys(groups).sort((a, b) => {
			if (a === tonerKey) return -1;
			if (b === tonerKey) return 1;
			if (a === othersKey) return 1;
			if (b === othersKey) return -1;
			return a.localeCompare(b);
		});

		return { groups, sortedKeys };
	}, [filteredStock]);

	const normalizeKey = (key: string) =>
		key
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.trim();

	const handleExportExcel = () => {
		const rows = stock.map((item) => ({
			Nome: item.nome || "",
			Unidade: item.unidade || "",
			Saldo: item.saldo ?? 0,
			Minimo: item.minimo ?? 0,
			Associacao_Material: item.associacao_material || "",
			Associacao_Especificacao: item.associacao_especificacao || "",
			Associacao_Tamanho: item.associacao_tamanho || "",
			Is_Toner: item.is_toner ? 1 : 0,
			Print_Yield: item.print_yield ?? 0,
		}));
		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.json_to_sheet(rows);
		XLSX.utils.book_append_sheet(wb, ws, "Estoque");
		XLSX.writeFile(wb, "estoque.xlsx");
	};

	const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (evt) => {
			try {
				const bstr = evt.target?.result;
				const workbook = XLSX.read(bstr, { type: "binary" });
				const wsname = workbook.SheetNames[0];
				const ws = workbook.Sheets[wsname];
				const rawData = XLSX.utils.sheet_to_json(ws);

				const normalizedData = rawData.map((row: any) => {
					const getValue = (possibleKeys: string[]) => {
						const rowKeys = Object.keys(row);
						const foundKey = rowKeys.find((k) =>
							possibleKeys.includes(normalizeKey(k))
						);
						return foundKey ? row[foundKey] : undefined;
					};

					return {
						nome: getValue(["nome", "name", "item"]) || "Item Importado",
						unidade: getValue(["unidade", "unid", "unit"]) || "un",
						saldo: Number(getValue(["saldo", "quantidade", "qtd", "qty"]) || 0),
						minimo: Number(getValue(["minimo", "min", "estoque minimo"]) || 10),
						associacao_material: getValue(["associacao_material", "material", "categoria"]) || "",
						associacao_especificacao: getValue(["associacao_especificacao", "especificacao", "gramatura"]) || "",
						associacao_tamanho: getValue(["associacao_tamanho", "tamanho", "papel"]) || "",
						is_toner: Number(getValue(["is_toner", "toner"]) || 0) ? 1 : 0,
						print_yield: Number(getValue(["print_yield", "rendimento", "yield"]) || 1500),
					};
				});

				if (normalizedData.length > 0) {
					const promises = normalizedData.map((item) => api.post("/stock", item));
					await Promise.all(promises);
					const res = await api.get("/stock");
					setStock(res.data);
					alert(`${normalizedData.length} itens importados com sucesso.`);
				} else {
					alert("O arquivo parece estar vazio ou ilegível.");
				}
			} catch (err) {
				console.error(err);
				alert("Erro ao importar arquivo Excel.");
			}
		};
		reader.readAsBinaryString(file);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleSave = async () => {
		if (!formData.nome || !formData.unidade) {
			alert("Nome e Unidade são obrigatórios.");
			return;
		}

		const selectedIds = machinesList
			.filter((m) => selectedMachineNames.includes(m.nome))
			.map((m) => m.id);

		const payload = {
			nome: formData.nome,
			unidade: formData.unidade,
			saldo: Number(formData.saldo),
			minimo: Number(formData.minimo),
			associacao_material: formData.associacao_material || "",
			associacao_especificacao: formData.associacao_especificacao || "",
			associacao_tamanho: formData.associacao_tamanho || "",
			is_toner: formData.is_toner ? 1 : 0,
			print_yield: Number(formData.print_yield) || 1500,
			maquinas_associadas_ids: JSON.stringify(selectedIds),
		};

		try {
			if (editingItem && editingItem.id) {
				const res = await api.put(`/stock/${editingItem.id}`, payload);
				const updatedItem = {
					...res.data,
					id: Number(res.data.id),
					maquinas_associadas_ids: selectedIds,
				};
				setStock((prev: StockItemWithToner[]) =>
					prev.map((item) => (item.id === editingItem.id ? updatedItem : item))
				);
			} else {
				const res = await api.post("/stock", payload);
				const newItem = {
					...res.data,
					id: Number(res.data.id),
					maquinas_associadas_ids: selectedIds,
				};
				setStock((prev: StockItemWithToner[]) => [...prev, newItem]);
			}
			setIsModalOpen(false);
			setEditingItem(null);
			setFormData(initialFormState);
			setSelectedMachineNames([]);
		} catch (err) {
			console.error(err);
			alert("Erro ao salvar item.");
		}
	};

	const handleDelete = async (id: number) => {
		if (!id) return;
		if (confirm("Tem certeza que deseja excluir este item?")) {
			try {
				await api.delete(`/stock/${id}`);
				setStock((prev: StockItemWithToner[]) =>
					prev.filter((item) => String(item.id) !== String(id))
				);
			} catch (err) {
				alert("Erro ao excluir item.");
			}
		}
	};

	const openModal = (item?: StockItemWithToner) => {
		if (item) {
			setEditingItem(item);
			setFormData(item);
			const names = machinesList
				.filter((m) => item.maquinas_associadas_ids?.includes(m.id))
				.map((m) => m.nome);
			setSelectedMachineNames(names);
		} else {
			setEditingItem(null);
			setFormData(initialFormState);
			setSelectedMachineNames([]);
		}
		setIsModalOpen(true);
	};

	return (
		<div className='space-y-6 pb-20'>
			<div className='flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/60 shadow-card'>
				<div>
					<h2 className='text-xl font-bold text-slate-800 flex items-center gap-2'>
						<Box className='w-5 h-5 text-indigo-600' /> Controle de Estoque
					</h2>
					<p className='text-xs text-slate-500 mt-1'>
						Gerencie papéis, insumos e toners.
					</p>
				</div>

				<div className='flex w-full md:w-auto gap-3'>
					<div className='relative group flex-1 md:w-56'>
						<Search className='absolute left-3 top-2.5 w-4 h-4 text-slate-400' />
						<input
							type='text'
							placeholder='Buscar...'
							className='w-full pl-9 pr-4 py-2 border border-slate-200 rounded-[8px] focus:ring-2 focus:ring-indigo-500 text-sm outline-none'
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
					<button
						onClick={handleExportExcel}
						className='flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-[8px] hover:bg-slate-50 transition text-sm font-medium shadow-sm'
					>
						<Download className='w-4 h-4' /> Exportar
					</button>
					<input
						type='file'
						ref={fileInputRef}
						onChange={handleImportExcel}
						className='hidden'
						accept='.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel'
					/>
					<button
						onClick={() => fileInputRef.current?.click()}
						className='flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-[8px] hover:bg-slate-900 transition text-sm font-medium shadow-sm'
					>
						<Upload className='w-4 h-4' /> Importar
					</button>
					<button
						onClick={() => openModal()}
						className='flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-[8px] hover:bg-slate-900 transition text-sm font-medium'
					>
						<Plus className='w-4 h-4' /> Novo Item
					</button>
				</div>
			</div>

			<div className='space-y-8'>
				{groupedStock.sortedKeys.map((groupKey) => {
					const items = groupedStock.groups[groupKey];
					const isTonerGroup = groupKey === "Toners & Tintas";

					return (
						<div key={groupKey} className='animate-in fade-in duration-500'>
							<div className='flex items-center gap-2 mb-3 border-b border-slate-200 pb-2'>
								{isTonerGroup ? (
									<Printer className='w-5 h-5 text-indigo-600' />
								) : (
									<Layers className='w-5 h-5 text-slate-400' />
								)}
								<h3 className='text-lg font-bold text-slate-700 capitalize'>
									{groupKey}
								</h3>
								<span className='text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold'>
									{items.length}
								</span>
							</div>

							<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
								{items.map((item) => (
									<Card
										key={item.id}
										className={`p-3 relative group hover:border-indigo-300 transition-all duration-200 bg-white flex flex-col justify-between ${
											item.saldo < item.minimo
												? "border-red-200 bg-red-50/30"
												: ""
										}`}
									>
										<div className='flex justify-between items-start mb-2'>
											<div className='pr-6'>
												<h4 className='font-bold text-slate-700 text-sm leading-tight line-clamp-2'>
													{item.nome}
												</h4>
												<div className='flex flex-wrap gap-1 mt-1.5'>
													{item.is_toner ? (
														<span className='text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100 font-medium'>
															{item.print_yield} pgs/un
														</span>
													) : (
														<>
															{item.associacao_especificacao && (
																<span className='text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded'>
																	{item.associacao_especificacao}
																</span>
															)}
															{item.associacao_tamanho && (
																<span className='text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded'>
																	{item.associacao_tamanho}
																</span>
															)}
														</>
													)}
													{item.maquinas_associadas_ids &&
														item.maquinas_associadas_ids.length > 0 && (
															<span className='text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-medium flex items-center gap-1'>
																<Settings className='w-3 h-3' />{" "}
																{item.maquinas_associadas_ids.length} Maq.
															</span>
														)}
												</div>
											</div>
											<div className='absolute top-3 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
												<button
													onClick={() => openModal(item)}
													className='p-1 text-slate-400 hover:text-indigo-600 transition'
												>
													<Edit2 className='w-3.5 h-3.5' />
												</button>
												<button
													onClick={() => handleDelete(item.id!)}
													className='p-1 text-slate-400 hover:text-red-600 transition'
												>
													<Trash2 className='w-3.5 h-3.5' />
												</button>
											</div>
										</div>

										<div className='flex items-end justify-between mt-2 pt-2 border-t border-slate-200/60 border-dashed'>
											<div className='flex flex-col'>
												<span className='text-[10px] text-slate-400 uppercase font-bold'>
													Saldo
												</span>
												<div className='flex items-baseline gap-1'>
													<span
														className={`text-xl font-bold ${
															item.saldo < item.minimo
																? "text-red-600"
																: "text-slate-800"
														}`}
													>
														{/* CORREÇÃO: DUAS CASAS DECIMAIS */}
														{Number(item.saldo).toFixed(2)}
													</span>
													<span className='text-xs text-slate-500'>
														{item.unidade}
													</span>
												</div>
											</div>
											{item.saldo < item.minimo && (
												<AlertTriangle className='w-4 h-4 text-red-500 mb-1' />
											)}
										</div>
									</Card>
								))}
							</div>
						</div>
					);
				})}

				{filteredStock.length === 0 && (
					<div className='text-center py-12 text-slate-400'>
						<Search className='w-8 h-8 mx-auto mb-2 opacity-50' />
						<p>Nenhum item encontrado.</p>
					</div>
				)}
			</div>

			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={editingItem ? "Editar Item" : "Novo Item"}
				size='md'
			>
				<div className='space-y-4'>
					<div className='bg-indigo-50 p-3 rounded-[8px] border border-indigo-100 flex items-center justify-between'>
						<div className='flex items-center gap-2'>
							<Printer className='w-4 h-4 text-indigo-600' />
							<div>
								<p className='text-xs font-bold text-indigo-900'>
									Item de Impressão (Toner)?
								</p>
								<p className='text-[10px] text-indigo-600'>
									Habilita vínculo com máquinas e rendimento.
								</p>
							</div>
						</div>
						<label className='relative inline-flex items-center cursor-pointer'>
							<input
								type='checkbox'
								className='sr-only peer'
								checked={formData.is_toner}
								onChange={(e) =>
									setFormData({
										...formData,
										is_toner: e.target.checked,
										associacao_material: e.target.checked
											? ""
											: formData.associacao_material,
									})
								}
							/>
							<div className='w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-indigo-600'></div>
						</label>
					</div>

					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1'>
							Nome *
						</label>
						<input
							type='text'
							className='w-full border border-slate-200 p-2 rounded-[8px] outline-none focus:ring-2 focus:ring-indigo-500 text-sm'
							value={formData.nome || ""}
							onChange={(e) =>
								setFormData({ ...formData, nome: e.target.value })
							}
							placeholder='Ex: Papel Sulfite A4'
						/>
					</div>

					<div className='grid grid-cols-2 gap-3'>
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1'>
								Unidade
							</label>
							<input
								type='text'
								className='w-full border border-slate-200 p-2 rounded-[8px] text-sm'
								value={formData.unidade || ""}
								onChange={(e) =>
									setFormData({ ...formData, unidade: e.target.value })
								}
								placeholder='Ex: un, cx, kg'
							/>
						</div>
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1'>
								Mínimo
							</label>
							<input
								type='number'
								className='w-full border border-slate-200 p-2 rounded-[8px] text-sm'
								value={formData.minimo || 0}
								onChange={(e) =>
									setFormData({ ...formData, minimo: Number(e.target.value) })
								}
							/>
						</div>
					</div>

					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1'>
							Saldo Atual
						</label>
						<input
							type='number'
							className='w-full border border-slate-200 p-2 rounded-[8px] text-sm bg-slate-50'
							value={formData.saldo || 0}
							onChange={(e) =>
								setFormData({ ...formData, saldo: Number(e.target.value) })
							}
						/>
					</div>

					{formData.is_toner ? (
						<div className='space-y-4 animate-in slide-in-from-top-2'>
							<div className='bg-slate-50 p-3 rounded-[8px] border border-slate-200'>
								<label className='block text-xs font-bold text-slate-600 uppercase mb-1'>
									Rendimento (Cópias/Impressões)
								</label>
								<div className='flex items-center gap-2'>
									<input
										type='number'
										className='w-full border border-slate-200 p-2 rounded-[8px] text-sm'
										value={formData.print_yield || 1500}
										onChange={(e) =>
											setFormData({
												...formData,
												print_yield: Number(e.target.value),
											})
										}
									/>
									<span className='text-xs text-slate-400 whitespace-nowrap'>
										p/ unidade
									</span>
								</div>
							</div>
							<div>
								<label className='block text-xs font-bold text-slate-500 uppercase mb-1'>
									Vincular a Máquinas
								</label>
								<MultiSelect
									options={machineOptions}
									selected={selectedMachineNames}
									onChange={setSelectedMachineNames}
									placeholder='Selecione as máquinas...'
								/>
							</div>
						</div>
					) : (
						<div className='bg-slate-50 p-3 rounded-[8px] border border-slate-200'>
							<p className='text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1'>
								<Link className='w-3 h-3' /> Vínculo com Tabela de Preços
								(Papel)
							</p>
							<div className='space-y-2'>
								<select
									className='w-full border border-slate-200 p-2 rounded-[8px] text-sm'
									value={formData.associacao_material || ""}
									onChange={(e) =>
										setFormData({
											...formData,
											associacao_material: e.target.value,
										})
									}
								>
									<option value=''>-- Material (Categoria Mãe) --</option>
									{uniqueMaterials.map((m) => (
										<option key={m} value={m}>
											{m}
										</option>
									))}
								</select>

								<div className='grid grid-cols-2 gap-2'>
									<select
										className='w-full border border-slate-200 p-2 rounded-[8px] text-sm disabled:opacity-50'
										value={formData.associacao_especificacao || ""}
										onChange={(e) =>
											setFormData({
												...formData,
												associacao_especificacao: e.target.value,
											})
										}
										disabled={!formData.associacao_material}
									>
										<option value=''>Gramatura (Qualquer)</option>
										{uniqueSpecs.map((s) => (
											<option key={s} value={s}>
												{s}
											</option>
										))}
									</select>
									<select
										className='w-full border border-slate-200 p-2 rounded-[8px] text-sm disabled:opacity-50'
										value={formData.associacao_tamanho || ""}
										onChange={(e) =>
											setFormData({
												...formData,
												associacao_tamanho: e.target.value,
											})
										}
										disabled={!formData.associacao_material}
									>
										<option value=''>Tamanho (Qualquer)</option>
										{uniqueSizes.map((s) => (
											<option key={s} value={s}>
												{s}
											</option>
										))}
									</select>
								</div>
							</div>
						</div>
					)}

					<div className='flex justify-end pt-4 border-t border-slate-200/60 gap-2'>
						<button
							onClick={() => setIsModalOpen(false)}
							className='px-4 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm'
						>
							Cancelar
						</button>
						<button
							onClick={handleSave}
							className='bg-indigo-600 text-white px-6 py-2 rounded-[8px] hover:bg-indigo-700 font-bold text-sm shadow-sm'
						>
							Salvar
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
