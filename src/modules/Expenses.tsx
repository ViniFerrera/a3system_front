import React, { useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Utils } from "@/utils";
import { Expense } from "@/types";
import * as XLSX from "xlsx";
import {
	Plus,
	Search,
	Edit2,
	Trash2,
	CheckCircle,
	Circle,
	Upload,
	Download,
	DollarSign,
	Filter,
	ArrowUp,
	ArrowDown,
	Save,
	AlertTriangle,
} from "lucide-react";
import { api } from "@/services/api";

export const ExpensesModule = ({
	expenses = [],
	setExpenses,
}: {
	expenses: Expense[];
	setExpenses: Function;
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [searchTerm, setSearchTerm] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
	const [formData, setFormData] = useState<Partial<Expense>>({});
	const [statusFilter, setStatusFilter] = useState<"ALL" | "PAGO" | "PENDENTE">(
		"ALL"
	);

	// --- AJUSTE DE DATA PADRÃO (Início do Mês e Hoje) ---
	const [filterStart, setFilterStart] = useState(() => {
		const d = new Date();
		// Retorna YYYY-MM-01 (Mês atual, dia 1)
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
	});

	const [filterEnd, setFilterEnd] = useState(() => {
		const d = new Date();
		// Retorna YYYY-MM-DD (Hoje)
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
			2,
			"0"
		)}-${String(d.getDate()).padStart(2, "0")}`;
	});
	// ----------------------------------------------------

	const [filterDesc, setFilterDesc] = useState("");
	const [sortConfig, setSortConfig] = useState<{
		key: keyof Expense;
		direction: "asc" | "desc";
	} | null>(null);
	const [hasChanges, setHasChanges] = useState(false);

	const safeExpenses = Array.isArray(expenses) ? expenses : [];

	const metrics = useMemo(() => {
		const total = safeExpenses.reduce((acc, e) => acc + e.valor, 0);
		const paid = safeExpenses
			.filter((e) => e.status === "PAGO")
			.reduce((acc, e) => acc + e.valor, 0);
		const pending = safeExpenses
			.filter((e) => e.status === "PENDENTE")
			.reduce((acc, e) => acc + e.valor, 0);
		return { total, paid, pending };
	}, [safeExpenses]);

	const handleSort = (key: keyof Expense) => {
		let direction: "asc" | "desc" = "asc";
		if (
			sortConfig &&
			sortConfig.key === key &&
			sortConfig.direction === "asc"
		) {
			direction = "desc";
		}
		setSortConfig({ key, direction });
	};

	const sortedAndFilteredExpenses = useMemo(() => {
		let filtered = safeExpenses.filter((e) => {
			const matchesSearch = e.produto
				.toLowerCase()
				.includes(searchTerm.toLowerCase());
			const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;

			// Lógica de filtro de data
			if (filterStart && new Date(e.vencimento) < new Date(filterStart))
				return false;

			// Ajuste: O filtro de fim deve considerar até o final do dia (23:59:59)
			// ou simplesmente comparar string YYYY-MM-DD se a data no banco for só data.
			if (
				filterEnd &&
				new Date(e.vencimento) > new Date(filterEnd + "T23:59:59")
			)
				return false;

			return matchesSearch && matchesStatus;
		});
		if (sortConfig) {
			filtered.sort((a, b) => {
				const valA = a[sortConfig.key];
				const valB = b[sortConfig.key];
				if (valA === undefined || valB === undefined) return 0;
				if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
				if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
				return 0;
			});
		}
		return filtered;
	}, [
		safeExpenses,
		searchTerm,
		statusFilter,
		filterStart,
		filterEnd,
		sortConfig,
	]);

	// --- FUNÇÕES AUXILIARES DE IMPORTAÇÃO ---

	const normalizeKey = (key: string) =>
		key
			.normalize("NFD")
			.replace(/[\u0300-\u036f]/g, "")
			.toLowerCase()
			.trim();

	const processDate = (value: any): string => {
		if (!value) return new Date().toISOString().split("T")[0];
		if (typeof value === "number") {
			const date = new Date(Math.round((value - 25569) * 86400 * 1000));
			date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
			return date.toISOString().split("T")[0];
		}
		if (typeof value === "string") {
			if (value.includes("/")) {
				const parts = value.split("/");
				if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
			}
		}
		return String(value);
	};

	const sendDataToApi = async (data: any[]) => {
		try {
			const promises = data.map((item) => api.post("/expenses", item));
			await Promise.all(promises);

			const res = await api.get("/expenses");
			setExpenses(res.data);

			alert(`${data.length} contas importadas com sucesso.`);
			setHasChanges(true);
			if (fileInputRef.current) fileInputRef.current.value = "";
		} catch (e) {
			console.error(e);
			alert(
				"Erro ao importar dados. Verifique se o backend está rodando corretamente."
			);
		}
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
						produto:
							getValue(["descricao", "desc", "produto", "item", "nome"]) ||
							"Despesa Importada",
						vencimento: processDate(
							getValue(["vencimento", "data", "dt", "data vencimento"])
						),
						obs: getValue(["obs", "observacao", "detalhes", "nota"]) || "",
						valor: Number(getValue(["valor", "preco", "custo", "total"]) || 0),
						status:
							getValue(["status", "situacao"])
								?.toString()
								.toUpperCase()
								.trim() === "PAGO"
								? "PAGO"
								: "PENDENTE",
					};
				});

				if (normalizedData.length > 0) {
					await sendDataToApi(normalizedData);
				} else {
					alert("O arquivo parece estar vazio ou ilegível.");
				}
			} catch (err) {
				console.error(err);
				alert("Erro ao ler o arquivo Excel.");
			}
		};
		reader.readAsBinaryString(file);
	};

	const handleDownloadTemplate = () => {
		const templateData = [
			["Descrição", "Vencimento", "Obs", "Valor", "Status"],
			["Conta Luz", "15/12/2025", "Referente Dezembro", 150.5, "PENDENTE"],
			["Internet", "20/12/2025", "Vivo Fibra", 99.9, "PAGO"],
		];
		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.aoa_to_sheet(templateData);
		XLSX.utils.book_append_sheet(wb, ws, "Modelo");
		XLSX.writeFile(wb, "modelo_despesas.xlsx");
	};

	// --- RESTANTE DA LÓGICA (CRUD e UI) ---

	const handleSave = async () => {
		if (!formData.produto || !formData.valor) {
			alert("Descrição e Valor são obrigatórios.");
			return;
		}
		try {
			if (editingExpense && editingExpense.id) {
				const res = await api.put(`/expenses/${editingExpense.id}`, formData);
				setExpenses((prev: Expense[]) =>
					prev.map((e) => (e.id === editingExpense.id ? res.data : e))
				);
			} else {
				const res = await api.post("/expenses", formData);
				setExpenses((prev: Expense[]) => [res.data, ...prev]);
			}
			setIsModalOpen(false);
			setEditingExpense(null);
			setFormData({});
		} catch (err) {
			alert("Erro ao salvar");
		}
	};

	const handleDelete = async (id: number) => {
		if (confirm("Excluir esta despesa?")) {
			try {
				await api.delete(`/expenses/${id}`);
				setExpenses((prev: Expense[]) => prev.filter((e) => e.id !== id));
			} catch (err) {
				alert("Erro ao excluir.");
			}
		}
	};

	const toggleStatus = async (expense: Expense) => {
		const newStatus = expense.status === "PAGO" ? "PENDENTE" : "PAGO";
		try {
			const updated = { ...expense, status: newStatus };
			setExpenses((prev: Expense[]) =>
				prev.map((e) => (e.id === expense.id ? updated : e))
			);
			await api.put(`/expenses/${expense.id}`, updated);
		} catch (err) {
			alert("Erro ao atualizar status");
		}
	};

	const handleSaveChanges = () => {
		setHasChanges(false);
		alert("Dados sincronizados com sucesso!");
	};

	const openModal = (expense?: Expense) => {
		if (expense) {
			setEditingExpense(expense);
			setFormData(expense);
		} else {
			setEditingExpense(null);
			setFormData({
				status: "PENDENTE",
				vencimento: new Date().toISOString().split("T")[0],
				obs: "",
			});
		}
		setIsModalOpen(true);
	};

	const isOverdue = (date: string) => {
		return new Date(date) < new Date(new Date().setHours(0, 0, 0, 0));
	};

	return (
		<div className='space-y-6'>
			<div className='flex flex-col md:flex-row justify-between items-center gap-4'>
				<div className='flex flex-col md:flex-row gap-2 w-full md:w-auto items-end'>
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
					<div className='relative w-full md:w-auto'>
						<Search className='absolute left-2 top-2.5 w-3 h-3 text-slate-400' />
						<input
							type='text'
							placeholder='Buscar descrição...'
							className='w-full md:w-48 pl-7 pr-2 py-2 border border-slate-200 rounded-[10px] text-xs outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm'
							value={filterDesc}
							onChange={(e) => setFilterDesc(e.target.value)}
						/>
					</div>
					<select
						className='text-xs border border-slate-200 rounded-[10px] p-2 bg-white outline-none w-full md:w-auto h-[34px] shadow-sm'
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value as any)}
					>
						<option value='ALL'>Todos Status</option>
						<option value='PAGO'>Pagos</option>
						<option value='PENDENTE'>Pendentes</option>
					</select>
				</div>
				<div className='flex gap-2 w-full md:w-auto justify-end'>
					<button
						onClick={handleDownloadTemplate}
						className='flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-[10px] hover:bg-slate-50 transition shadow-sm text-sm font-medium'
					>
						<Download className='w-4 h-4' /> Modelo .xlsx
					</button>

					<input
						type='file'
						ref={fileInputRef}
						onChange={handleFileUpload}
						className='hidden'
						accept='.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel'
					/>
					<button
						onClick={() => fileInputRef.current?.click()}
						className='flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-[10px] hover:bg-slate-900 transition shadow-sm text-sm font-medium'
					>
						<Upload className='w-4 h-4' /> Importar
					</button>
					{hasChanges && (
						<button
							onClick={handleSaveChanges}
							className='flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-[10px] hover:bg-green-700 transition shadow-sm text-sm font-bold animate-in fade-in zoom-in'
						>
							<Save className='w-4 h-4' /> Salvar
						</button>
					)}
					<button
						onClick={() => openModal()}
						className='flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-[10px] hover:bg-indigo-700 transition shadow-sm font-medium'
					>
						<Plus className='w-4 h-4' /> Nova Conta
					</button>
				</div>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
				<Card className='p-5 border-l-[4px] border-indigo-600 bg-indigo-50/50'>
					<p className='text-xs font-bold text-slate-500 uppercase tracking-wider mb-1'>
						Total Filtrado
					</p>
					<div className='flex items-center gap-2'>
						<DollarSign className='w-5 h-5 text-indigo-600' />
						<span className='text-2xl font-bold text-slate-800'>
							{Utils.formatCurrency(
								sortedAndFilteredExpenses.reduce((acc, e) => acc + e.valor, 0)
							)}
						</span>
					</div>
				</Card>
				<Card className='p-5 border-l-[4px] border-emerald-500 bg-emerald-50/50'>
					<p className='text-xs font-bold text-slate-500 uppercase tracking-wider mb-1'>
						Total Pago
					</p>
					<div className='flex items-center gap-2'>
						<CheckCircle className='w-5 h-5 text-emerald-600' />
						<span className='text-2xl font-bold text-slate-800'>
							{Utils.formatCurrency(metrics.paid)}
						</span>
					</div>
				</Card>
				<Card className='p-5 border-l-[4px] border-orange-500 bg-orange-50/50'>
					<p className='text-xs font-bold text-slate-500 uppercase tracking-wider mb-1'>
						Pendente
					</p>
					<div className='flex items-center gap-2'>
						<Circle className='w-5 h-5 text-orange-600' />
						<span className='text-2xl font-bold text-slate-800'>
							{Utils.formatCurrency(metrics.pending)}
						</span>
					</div>
				</Card>
			</div>

			<Card className='overflow-hidden'>
				<div className='overflow-x-auto max-h-[500px] custom-scrollbar'>
					<table className='w-full text-left text-sm text-slate-600 min-w-[600px]'>
						<thead className='bg-slate-50 font-semibold border-b border-slate-200 sticky top-0 z-10'>
							<tr>
								<th
									className='p-4 cursor-pointer hover:bg-slate-100'
									onClick={() => handleSort("produto")}
								>
									Descrição{" "}
									{sortConfig?.key === "produto" &&
										(sortConfig.direction === "asc" ? (
											<ArrowUp className='w-3 h-3 inline' />
										) : (
											<ArrowDown className='w-3 h-3 inline' />
										))}
								</th>
								<th
									className='p-4 cursor-pointer hover:bg-slate-100'
									onClick={() => handleSort("vencimento")}
								>
									Vencimento{" "}
									{sortConfig?.key === "vencimento" &&
										(sortConfig.direction === "asc" ? (
											<ArrowUp className='w-3 h-3 inline' />
										) : (
											<ArrowDown className='w-3 h-3 inline' />
										))}
								</th>
								<th className='p-4'>Obs</th>
								<th
									className='p-4 cursor-pointer hover:bg-slate-100'
									onClick={() => handleSort("valor")}
								>
									Valor{" "}
									{sortConfig?.key === "valor" &&
										(sortConfig.direction === "asc" ? (
											<ArrowUp className='w-3 h-3 inline' />
										) : (
											<ArrowDown className='w-3 h-3 inline' />
										))}
								</th>
								<th
									className='p-4 cursor-pointer hover:bg-slate-100'
									onClick={() => handleSort("status")}
								>
									Status{" "}
									{sortConfig?.key === "status" &&
										(sortConfig.direction === "asc" ? (
											<ArrowUp className='w-3 h-3 inline' />
										) : (
											<ArrowDown className='w-3 h-3 inline' />
										))}
								</th>
								<th className='p-4 text-right'>Ações</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-slate-100'>
							{sortedAndFilteredExpenses.map((expense) => (
								<tr
									key={expense.id}
									className='hover:bg-slate-50 transition-colors'
								>
									<td className='p-4 font-medium text-slate-800'>
										{expense.produto}
									</td>
									<td
										className={`p-4 font-medium flex items-center gap-2 ${
											expense.status === "PENDENTE" &&
											isOverdue(expense.vencimento)
												? "text-red-600"
												: ""
										}`}
									>
										{Utils.formatDate(expense.vencimento)}
										{expense.status === "PENDENTE" &&
											isOverdue(expense.vencimento) && (
												<AlertTriangle className='w-4 h-4 text-red-500 animate-pulse' />
											)}
									</td>
									<td
										className='p-4 text-xs text-slate-500 max-w-[200px] truncate'
										title={expense.obs}
									>
										{expense.obs || "-"}
									</td>
									<td className='p-4 font-bold text-slate-700'>
										{Utils.formatCurrency(expense.valor)}
									</td>
									<td className='p-4'>
										<button
											onClick={() => toggleStatus(expense)}
											className='hover:opacity-80 transition-opacity'
										>
											<Badge status={expense.status} />
										</button>
									</td>
									<td className='p-4 text-right flex justify-end gap-2'>
										<button
											onClick={() => openModal(expense)}
											className='p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[10px] transition-colors'
										>
											<Edit2 className='w-4 h-4' />
										</button>
										<button
											onClick={() => handleDelete(expense.id!)}
											className='p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-[10px] transition-colors'
										>
											<Trash2 className='w-4 h-4' />
										</button>
									</td>
								</tr>
							))}
							{sortedAndFilteredExpenses.length === 0 && (
								<tr>
									<td
										colSpan={6}
										className='p-8 text-center text-slate-400 text-sm'
									>
										Nenhuma despesa encontrada.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
			</Card>

			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={editingExpense ? "Editar Despesa" : "Nova Despesa"}
			>
				<div className='space-y-5'>
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Descrição *
						</label>
						<input
							type='text'
							className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'
							value={formData.produto || ""}
							onChange={(e) =>
								setFormData({ ...formData, produto: e.target.value })
							}
							placeholder='Ex: Aluguel, Fornecedor X...'
						/>
					</div>
					<div className='grid grid-cols-2 gap-4'>
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Vencimento
							</label>
							<input
								type='date'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'
								value={formData.vencimento || ""}
								onChange={(e) =>
									setFormData({ ...formData, vencimento: e.target.value })
								}
							/>
						</div>
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Valor
							</label>
							<input
								type='number'
								className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'
								value={formData.valor || ""}
								onChange={(e) =>
									setFormData({ ...formData, valor: Number(e.target.value) })
								}
							/>
						</div>
					</div>
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Observação
						</label>
						<textarea
							rows={3}
							className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-shadow bg-slate-50 focus:bg-white'
							value={formData.obs || ""}
							onChange={(e) =>
								setFormData({ ...formData, obs: e.target.value })
							}
							placeholder='Detalhes adicionais...'
						/>
					</div>
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Status
						</label>
						<div className='flex gap-2'>
							<button
								onClick={() => setFormData({ ...formData, status: "PENDENTE" })}
								className={`flex-1 py-2 rounded-[10px] border text-sm font-bold transition-all ${
									formData.status === "PENDENTE"
										? "bg-orange-50 text-orange-700 border-orange-200 shadow-sm"
										: "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
								}`}
							>
								Pendente
							</button>
							<button
								onClick={() => setFormData({ ...formData, status: "PAGO" })}
								className={`flex-1 py-2 rounded-[10px] border text-sm font-bold transition-all ${
									formData.status === "PAGO"
										? "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm"
										: "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
								}`}
							>
								Pago
							</button>
						</div>
					</div>
					<div className='flex justify-end pt-4 border-t border-slate-100 gap-2'>
						<button
							onClick={() => setIsModalOpen(false)}
							className='px-4 py-2.5 text-slate-500 hover:text-slate-700 font-medium text-sm transition'
						>
							Cancelar
						</button>
						<button
							onClick={handleSave}
							className='bg-indigo-600 text-white px-6 py-2.5 rounded-[10px] hover:bg-indigo-700 font-bold shadow-md transition-all text-sm'
						>
							Salvar Despesa
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
