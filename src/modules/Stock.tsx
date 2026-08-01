// Apenas o trecho de renderização do Card foi alterado para incluir o .toFixed(2)
// O restante da lógica permanece, mas como solicitado, segue o arquivo completo atualizado.

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
	Button,
	EmptyState,
	Field,
	Input,
	Select,
	useConfirm,
	useToast,
} from "@/components/ui";
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
	quickAction,
}: {
	stock: StockItemWithToner[];
	setStock: Function;
	priceTable: PriceRule[];
	quickAction?: { tab: string; action: string; nonce: number } | null;
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const toast = useToast();
	const confirm = useConfirm();
	const [searchTerm, setSearchTerm] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<StockItemWithToner | null>(
		null
	);
	const [machinesList, setMachinesList] = useState<Machine[]>([]);
	const [isSaving, setIsSaving] = useState(false);
	const [isImporting, setIsImporting] = useState(false);

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

		setIsImporting(true);
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
					toast.success(`${normalizedData.length} itens importados com sucesso.`);
				} else {
					toast.error("O arquivo parece estar vazio ou ilegível.");
				}
			} catch (err) {
				console.error(err);
				toast.error("Erro ao importar arquivo Excel.");
			} finally {
				setIsImporting(false);
			}
		};
		// Sem isto, uma falha de leitura deixaria o botão preso em "carregando".
		reader.onerror = () => {
			setIsImporting(false);
			toast.error("Erro ao ler o arquivo.");
		};
		reader.readAsBinaryString(file);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleSave = async () => {
		if (!formData.nome || !formData.unidade) {
			toast.error("Nome e Unidade são obrigatórios.");
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

		setIsSaving(true);
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
			toast.success("Item salvo com sucesso.");
		} catch (err) {
			console.error(err);
			toast.error("Erro ao salvar item.");
		} finally {
			setIsSaving(false);
		}
	};

	const handleDelete = async (id: number) => {
		if (!id) return;
		const ok = await confirm({
			title: "Excluir item?",
			message: "Tem certeza que deseja excluir este item?",
			confirmLabel: "Excluir",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/stock/${id}`);
			setStock((prev: StockItemWithToner[]) =>
				prev.filter((item) => String(item.id) !== String(id))
			);
			toast.success("Item excluído.");
		} catch (err) {
			toast.error("Erro ao excluir item.");
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

	// Ação rápida vinda da gaveta de atalhos: abre o formulário em branco.
	useEffect(() => {
		if (quickAction?.tab === "stock" && quickAction.action === "new") openModal();
	}, [quickAction?.nonce]);

	return (
		<div className='space-y-6 pb-20'>
			<div className='flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200/60 shadow-card'>
				<div>
					<h2 className='text-lg font-bold text-ink flex items-center gap-2'>
						<Box className='w-5 h-5 text-primary-600' /> Controle de Estoque
					</h2>
					<p className='text-xs text-ink-faint mt-1'>
						Gerencie papéis, insumos e toners.
					</p>
				</div>

				<div className='flex flex-wrap w-full md:w-auto gap-3'>
					<div className='relative group flex-1 md:w-56'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint z-10' />
						<Input
							type='text'
							placeholder='Buscar...'
							className='!pl-9'
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
					</div>
					<Button
						variant='secondary'
						onClick={handleExportExcel}
						icon={<Download className='w-4 h-4' />}
					>
						Exportar
					</Button>
					<input
						type='file'
						ref={fileInputRef}
						onChange={handleImportExcel}
						className='hidden'
						accept='.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel'
					/>
					<Button
						variant='secondary'
						onClick={() => fileInputRef.current?.click()}
						loading={isImporting}
						icon={<Upload className='w-4 h-4' />}
					>
						Importar
					</Button>
					<Button onClick={() => openModal()} icon={<Plus className='w-4 h-4' />}>
						Novo Item
					</Button>
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
									<Printer className='w-5 h-5 text-primary-600' />
								) : (
									<Layers className='w-5 h-5 text-ink-faint' />
								)}
								<h3 className='text-lg font-bold text-ink capitalize'>
									{groupKey}
								</h3>
								<span className='num text-xs bg-slate-100 text-ink-muted px-2 py-0.5 rounded-full font-bold'>
									{items.length}
								</span>
							</div>

							<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
								{items.map((item) => (
									<Card
										key={item.id}
										className={`p-3 relative group hover:border-primary-300 transition-all duration-200 bg-white flex flex-col justify-between ${
											item.saldo < item.minimo
												? "border-danger-200 bg-danger-50/30"
												: ""
										}`}
									>
										<div className='flex justify-between items-start mb-2'>
											<div className='pr-6'>
												<h4 className='font-bold text-ink text-sm leading-tight line-clamp-2'>
													{item.nome}
												</h4>
												<div className='flex flex-wrap gap-1 mt-1.5'>
													{item.is_toner ? (
														<span className='num text-2xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded border border-primary-100 font-medium'>
															{item.print_yield} pgs/un
														</span>
													) : (
														<>
															{item.associacao_especificacao && (
																<span className='text-2xs bg-slate-100 text-ink-muted px-1.5 py-0.5 rounded'>
																	{item.associacao_especificacao}
																</span>
															)}
															{item.associacao_tamanho && (
																<span className='text-2xs bg-slate-100 text-ink-muted px-1.5 py-0.5 rounded'>
																	{item.associacao_tamanho}
																</span>
															)}
														</>
													)}
													{item.maquinas_associadas_ids &&
														item.maquinas_associadas_ids.length > 0 && (
															<span className='num text-2xs bg-success-50 text-success-700 px-1.5 py-0.5 rounded border border-success-100 font-medium flex items-center gap-1'>
																<Settings className='w-3 h-3' />{" "}
																{item.maquinas_associadas_ids.length} Maq.
															</span>
														)}
												</div>
											</div>
											<div className='absolute top-3 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
												<button
													onClick={() => openModal(item)}
													className='p-1 text-ink-faint hover:text-primary-600 transition'
													title='Editar item'
												>
													<Edit2 className='w-3.5 h-3.5' />
												</button>
												<button
													onClick={() => handleDelete(item.id!)}
													className='p-1 text-ink-faint hover:text-danger-600 transition'
													title='Excluir item'
												>
													<Trash2 className='w-3.5 h-3.5' />
												</button>
											</div>
										</div>

										<div className='flex items-end justify-between mt-2 pt-2 border-t border-slate-200/60 border-dashed'>
											<div className='flex flex-col'>
												<span className='text-2xs text-ink-faint uppercase font-bold'>
													Saldo
												</span>
												<div className='flex items-baseline gap-1'>
													<span
														className={`num text-xl font-bold ${
															item.saldo < item.minimo
																? "text-danger-600"
																: "text-ink"
														}`}
													>
														{/* CORREÇÃO: DUAS CASAS DECIMAIS */}
														{Number(item.saldo).toFixed(2)}
													</span>
													<span className='text-xs text-ink-muted'>
														{item.unidade}
													</span>
												</div>
											</div>
											{item.saldo < item.minimo && (
												<AlertTriangle className='w-4 h-4 text-danger-500 mb-1' />
											)}
										</div>
									</Card>
								))}
							</div>
						</div>
					);
				})}

				{filteredStock.length === 0 && (
					<Card>
						<EmptyState
							icon={<Search className='w-10 h-10' />}
							title='Nenhum item encontrado.'
							description={
								searchTerm
									? "Nenhum item corresponde à busca."
									: "Cadastre o primeiro item de estoque."
							}
						/>
					</Card>
				)}
			</div>

			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={editingItem ? "Editar Item" : "Novo Item"}
				size='md'
			>
				<div className='space-y-4'>
					<div className='bg-primary-50 p-3 rounded-[8px] border border-primary-100 flex items-center justify-between'>
						<div className='flex items-center gap-2'>
							<Printer className='w-4 h-4 text-primary-600' />
							<div>
								<p className='text-xs font-bold text-primary-900'>
									Item de Impressão (Toner)?
								</p>
								<p className='text-2xs text-primary-600'>
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
							<div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-100 rounded-full peer after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full peer-checked:after:border-white peer-checked:bg-primary-600"></div>
						</label>
					</div>

					<Field label='Nome' required>
						<Input
							type='text'
							value={formData.nome || ""}
							onChange={(e) =>
								setFormData({ ...formData, nome: e.target.value })
							}
							placeholder='Ex: Papel Sulfite A4'
						/>
					</Field>

					<div className='grid grid-cols-2 gap-3'>
						<Field label='Unidade'>
							<Input
								type='text'
								value={formData.unidade || ""}
								onChange={(e) =>
									setFormData({ ...formData, unidade: e.target.value })
								}
								placeholder='Ex: un, cx, kg'
							/>
						</Field>
						<Field label='Mínimo'>
							<Input
								type='number'
								className='num'
								value={formData.minimo || 0}
								onChange={(e) =>
									setFormData({ ...formData, minimo: Number(e.target.value) })
								}
							/>
						</Field>
					</div>

					<Field label='Saldo Atual'>
						{/* `!` obrigatório: `.bg-white` do kit vem depois no CSS gerado. */}
						<Input
							type='number'
							className='num !bg-surface-sunken'
							value={formData.saldo || 0}
							onChange={(e) =>
								setFormData({ ...formData, saldo: Number(e.target.value) })
							}
						/>
					</Field>

					{formData.is_toner ? (
						<div className='space-y-4 animate-in slide-in-from-top-2'>
							<div className='bg-surface-sunken p-3 rounded-[8px] border border-slate-200'>
								<Field label='Rendimento (Cópias/Impressões)'>
									<div className='flex items-center gap-2'>
										<Input
											type='number'
											className='num'
											value={formData.print_yield || 1500}
											onChange={(e) =>
												setFormData({
													...formData,
													print_yield: Number(e.target.value),
												})
											}
										/>
										<span className='text-xs text-ink-faint whitespace-nowrap'>
											p/ unidade
										</span>
									</div>
								</Field>
							</div>
							<Field label='Vincular a Máquinas'>
								<MultiSelect
									options={machineOptions}
									selected={selectedMachineNames}
									onChange={setSelectedMachineNames}
									placeholder='Selecione as máquinas...'
								/>
							</Field>
						</div>
					) : (
						<div className='bg-surface-sunken p-3 rounded-[8px] border border-slate-200'>
							<p className='text-2xs font-bold text-ink-muted uppercase tracking-wide mb-2 flex items-center gap-1'>
								<Link className='w-3 h-3' /> Vínculo com Tabela de Preços
								(Papel)
							</p>
							<div className='space-y-2'>
								<Select
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
								</Select>

								<div className='grid grid-cols-2 gap-2'>
									<Select
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
									</Select>
									<Select
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
									</Select>
								</div>
							</div>
						</div>
					)}

					<div className='flex justify-end pt-4 border-t border-slate-200/60 gap-2'>
						<Button variant='ghost' onClick={() => setIsModalOpen(false)}>
							Cancelar
						</Button>
						<Button onClick={handleSave} loading={isSaving}>
							Salvar
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
