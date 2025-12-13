import React, { useState, useMemo, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Utils } from "@/utils";
import { Expense } from "@/types";
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
	const [dateFilter, setDateFilter] = useState("");
	const [filterStart, setFilterStart] = useState("");
	const [filterEnd, setFilterEnd] = useState("");
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
			if (filterStart && new Date(e.vencimento) < new Date(filterStart))
				return false;
			if (filterEnd && new Date(e.vencimento) > new Date(filterEnd))
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
	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = async (evt) => {
				const text = evt.target?.result as string;
				const parsed = Utils.parseExpensesCSV(text);
				try {
					await api.post("/expenses/bulk", parsed);
					setExpenses((prev: Expense[]) => [...prev, ...parsed]);
					alert(`${parsed.length} contas importadas.`);
					setHasChanges(true);
				} catch (e) {
					alert("Erro ao importar");
				}
			};
			reader.readAsText(file);
		}
	};
	const handleSave = async () => {
		if (!formData.produto || !formData.valor) {
			alert("Obrigatório.");
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
		if (confirm("Excluir?")) {
			await api.delete(`/expenses/${id}`);
			setExpenses((prev: Expense[]) => prev.filter((e) => e.id !== id));
		}
	};
	const toggleStatus = async (expense: Expense) => {
		const newStatus = expense.status === "PAGO" ? "PENDENTE" : "PAGO";
		try {
			setExpenses((prev: Expense[]) =>
				prev.map((e) => (e.id === expense.id ? { ...e, status: newStatus } : e))
			);
			await api.put(`/expenses/${expense.id}`, {
				...expense,
				status: newStatus,
			});
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
			});
		}
		setIsModalOpen(true);
	};
	const isOverdue = (date: string) => {
		return new Date(date) < new Date(new Date().setHours(0, 0, 0, 0));
	};
	return (
		<div className='space-y-6'>
			{" "}
			<div className='flex flex-col md:flex-row justify-between items-center gap-4'>
				{" "}
				<div className='flex flex-col md:flex-row gap-2 w-full md:w-auto items-end'>
					{" "}
					<div className='flex items-center gap-2 bg-white border border-slate-200 rounded-[10px] p-2 w-full md:w-auto'>
						{" "}
						<Filter className='w-4 h-4 text-indigo-500' />{" "}
						<input
							type='date'
							className='text-xs outline-none bg-transparent w-full md:w-auto'
							value={filterStart}
							onChange={(e) => setFilterStart(e.target.value)}
						/>{" "}
						<span className='text-slate-300'>|</span>{" "}
						<input
							type='date'
							className='text-xs outline-none bg-transparent w-full md:w-auto'
							value={filterEnd}
							onChange={(e) => setFilterEnd(e.target.value)}
						/>{" "}
					</div>{" "}
					<div className='relative w-full md:w-auto'>
						{" "}
						<Search className='absolute left-2 top-2.5 w-3 h-3 text-slate-400' />{" "}
						<input
							type='text'
							placeholder='Buscar descrição...'
							className='w-full md:w-48 pl-7 pr-2 py-2 border border-slate-200 rounded-[10px] text-xs outline-none focus:ring-1 focus:ring-indigo-500'
							value={filterDesc}
							onChange={(e) => setFilterDesc(e.target.value)}
						/>{" "}
					</div>{" "}
					<select
						className='text-xs border border-slate-200 rounded-[10px] p-2 bg-white outline-none w-full md:w-auto h-[34px]'
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value as any)}
					>
						{" "}
						<option value='ALL'>Todos Status</option>{" "}
						<option value='PAGO'>Pagos</option>{" "}
						<option value='PENDENTE'>Pendentes</option>{" "}
					</select>{" "}
				</div>{" "}
				<div className='flex gap-2 w-full md:w-auto justify-end'>
					{" "}
					<input
						type='file'
						ref={fileInputRef}
						onChange={handleFileUpload}
						className='hidden'
						accept='.csv'
					/>{" "}
					<button
						onClick={() => fileInputRef.current?.click()}
						className='flex items-center gap-2 bg-white text-slate-700 border border-slate-200 px-4 py-2 rounded-[10px] hover:bg-slate-50 transition shadow-sm text-sm font-medium'
					>
						{" "}
						<Upload className='w-4 h-4' /> Importar{" "}
					</button>{" "}
					{hasChanges && (
						<button
							onClick={handleSaveChanges}
							className='flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-[10px] hover:bg-green-700 transition shadow-sm text-sm font-bold animate-in fade-in zoom-in'
						>
							{" "}
							<Save className='w-4 h-4' /> Salvar Alterações{" "}
						</button>
					)}{" "}
					<button
						onClick={() => openModal()}
						className='flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-[10px] hover:bg-indigo-700 transition shadow-sm font-medium'
					>
						{" "}
						<Plus className='w-4 h-4' /> Nova Conta{" "}
					</button>{" "}
				</div>{" "}
			</div>{" "}
			<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
				{" "}
				<Card className='p-5 border-l-[4px] border-indigo-600 bg-indigo-50/50'>
					{" "}
					<p className='text-xs font-bold text-slate-500 uppercase tracking-wider mb-1'>
						Total Filtrado
					</p>{" "}
					<div className='flex items-center gap-2'>
						<DollarSign className='w-5 h-5 text-indigo-600' />
						<span className='text-2xl font-bold text-slate-800'>
							{Utils.formatCurrency(
								sortedAndFilteredExpenses.reduce((acc, e) => acc + e.valor, 0)
							)}
						</span>
					</div>{" "}
				</Card>{" "}
				<Card className='p-5 border-l-[4px] border-emerald-500 bg-emerald-50/50'>
					{" "}
					<p className='text-xs font-bold text-slate-500 uppercase tracking-wider mb-1'>
						Total Pago
					</p>{" "}
					<div className='flex items-center gap-2'>
						<CheckCircle className='w-5 h-5 text-emerald-600' />
						<span className='text-2xl font-bold text-slate-800'>
							{Utils.formatCurrency(metrics.paid)}
						</span>
					</div>{" "}
				</Card>{" "}
				<Card className='p-5 border-l-[4px] border-orange-500 bg-orange-50/50'>
					{" "}
					<p className='text-xs font-bold text-slate-500 uppercase tracking-wider mb-1'>
						Pendente
					</p>{" "}
					<div className='flex items-center gap-2'>
						<Circle className='w-5 h-5 text-orange-600' />
						<span className='text-2xl font-bold text-slate-800'>
							{Utils.formatCurrency(metrics.pending)}
						</span>
					</div>{" "}
				</Card>{" "}
			</div>{" "}
			<Card className='overflow-hidden'>
				{" "}
				<div className='overflow-x-auto max-h-[500px] custom-scrollbar'>
					{" "}
					<table className='w-full text-left text-sm text-slate-600 min-w-[600px]'>
						{" "}
						<thead className='bg-slate-50 font-semibold border-b'>
							{" "}
							<tr>
								{" "}
								<th
									className='p-4 cursor-pointer hover:bg-slate-100'
									onClick={() => handleSort("produto")}
								>
									Descrição{" "}
									{sortConfig?.key === "produto" &&
										(sortConfig.direction === "asc" ? (
											<ArrowUp className='w-3 h-3' />
										) : (
											<ArrowDown className='w-3 h-3' />
										))}
								</th>{" "}
								<th
									className='p-4 cursor-pointer hover:bg-slate-100'
									onClick={() => handleSort("vencimento")}
								>
									Vencimento{" "}
									{sortConfig?.key === "vencimento" &&
										(sortConfig.direction === "asc" ? (
											<ArrowUp className='w-3 h-3' />
										) : (
											<ArrowDown className='w-3 h-3' />
										))}
								</th>{" "}
								<th
									className='p-4 cursor-pointer hover:bg-slate-100'
									onClick={() => handleSort("valor")}
								>
									Valor{" "}
									{sortConfig?.key === "valor" &&
										(sortConfig.direction === "asc" ? (
											<ArrowUp className='w-3 h-3' />
										) : (
											<ArrowDown className='w-3 h-3' />
										))}
								</th>{" "}
								<th
									className='p-4 cursor-pointer hover:bg-slate-100'
									onClick={() => handleSort("status")}
								>
									Status{" "}
									{sortConfig?.key === "status" &&
										(sortConfig.direction === "asc" ? (
											<ArrowUp className='w-3 h-3' />
										) : (
											<ArrowDown className='w-3 h-3' />
										))}
								</th>{" "}
								<th className='p-4 text-right'>Ações</th>{" "}
							</tr>{" "}
						</thead>{" "}
						<tbody>
							{" "}
							{sortedAndFilteredExpenses.map((expense) => (
								<tr key={expense.id} className='hover:bg-slate-50'>
									{" "}
									<td className='p-4'>{expense.produto}</td>{" "}
									<td
										className={`p-4 font-medium flex items-center gap-2 ${
											expense.status === "PENDENTE" &&
											isOverdue(expense.vencimento)
												? "text-red-600"
												: ""
										}`}
									>
										{" "}
										{Utils.formatDate(expense.vencimento)}{" "}
										{expense.status === "PENDENTE" &&
											isOverdue(expense.vencimento) && (
												<AlertTriangle className='w-4 h-4 text-red-500 animate-pulse' />
											)}{" "}
									</td>{" "}
									<td className='p-4 font-bold'>
										{Utils.formatCurrency(expense.valor)}
									</td>{" "}
									<td className='p-4'>
										<button onClick={() => toggleStatus(expense)}>
											<Badge status={expense.status} />
										</button>
									</td>{" "}
									<td className='p-4 text-right flex justify-end gap-2'>
										{" "}
										<button
											onClick={() => openModal(expense)}
											className='p-2 text-slate-400 hover:text-indigo-600'
										>
											<Edit2 className='w-4 h-4' />
										</button>{" "}
										<button
											onClick={() => handleDelete(expense.id!)}
											className='p-2 text-slate-400 hover:text-red-500'
										>
											<Trash2 className='w-4 h-4' />
										</button>{" "}
									</td>{" "}
								</tr>
							))}{" "}
						</tbody>{" "}
					</table>{" "}
				</div>{" "}
			</Card>{" "}
			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={editingExpense ? "Editar Despesa" : "Nova Despesa"}
			>
				{" "}
				<div className='space-y-5'>
					{" "}
					<div>
						{" "}
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Descrição *
						</label>{" "}
						<input
							type='text'
							className='w-full border p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
							value={formData.produto || ""}
							onChange={(e) =>
								setFormData({ ...formData, produto: e.target.value })
							}
						/>{" "}
					</div>{" "}
					<div className='grid grid-cols-2 gap-4'>
						{" "}
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Vencimento
							</label>
							<input
								type='date'
								className='w-full border p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none'
								value={formData.vencimento || ""}
								onChange={(e) =>
									setFormData({ ...formData, vencimento: e.target.value })
								}
							/>
						</div>{" "}
						<div>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Valor
							</label>
							<input
								type='number'
								className='w-full border p-2.5 rounded-[10px]'
								value={formData.valor || ""}
								onChange={(e) =>
									setFormData({ ...formData, valor: Number(e.target.value) })
								}
							/>
						</div>{" "}
					</div>{" "}
					<div>
						{" "}
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Observação
						</label>{" "}
						<textarea
							rows={3}
							className='w-full border border-slate-200 p-2.5 rounded-[10px] focus:ring-2 focus:ring-indigo-500 outline-none resize-none'
							value={formData.obs || ""}
							onChange={(e) =>
								setFormData({ ...formData, obs: e.target.value })
							}
						/>{" "}
					</div>{" "}
					<div>
						{" "}
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Status
						</label>{" "}
						<div className='flex gap-2'>
							{" "}
							<button
								onClick={() => setFormData({ ...formData, status: "PENDENTE" })}
								className={`flex-1 py-2 rounded-[10px] border ${
									formData.status === "PENDENTE"
										? "bg-orange-50 text-orange-700 border-orange-200"
										: ""
								}`}
							>
								Pendente
							</button>{" "}
							<button
								onClick={() => setFormData({ ...formData, status: "PAGO" })}
								className={`flex-1 py-2 rounded-[10px] border ${
									formData.status === "PAGO"
										? "bg-emerald-50 text-emerald-700 border-emerald-200"
										: ""
								}`}
							>
								Pago
							</button>{" "}
						</div>{" "}
					</div>{" "}
					<div className='flex justify-end pt-4'>
						<button
							onClick={handleSave}
							className='bg-indigo-600 text-white px-6 py-2 rounded-[10px]'
						>
							Salvar
						</button>
					</div>{" "}
				</div>{" "}
			</Modal>{" "}
		</div>
	);
};
