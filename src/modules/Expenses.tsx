import React, { useState, useMemo, useRef, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import {
	Button,
	DataTable,
	Field,
	Input,
	Select,
	TableHead,
	Textarea,
	Th,
	useConfirm,
	useToast,
} from "@/components/ui";
import { Utils } from "@/utils";
import { Expense } from "@/types";
import * as XLSX from "xlsx";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";
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
	BarChart2,
	TrendingUp,
	TrendingDown,
	Calendar,
	Percent,
	Clock,
} from "lucide-react";
import { api } from "@/services/api";
import { useLoading } from "@/components/ui/LoadingOverlay";

export const ExpensesModule = ({
	expenses = [],
	setExpenses,
	quickAction,
}: {
	expenses: Expense[];
	setExpenses: Function;
	quickAction?: { tab: string; action: string; nonce: number } | null;
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const loading = useLoading();
	const toast = useToast();
	const confirm = useConfirm();
	const [searchTerm, setSearchTerm] = useState("");
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
	const [formData, setFormData] = useState<Partial<Expense>>({});
	const [statusFilter, setStatusFilter] = useState<"ALL" | "PAGO" | "PENDENTE">(
		"ALL"
	);
	const [isSaving, setIsSaving] = useState(false);
	const [isImporting, setIsImporting] = useState(false);

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
	const [recurrence, setRecurrence] = useState<{ enabled: boolean; months: number }>({ enabled: false, months: 1 });
	const [showDashboard, setShowDashboard] = useState(false);

	const safeExpenses = Array.isArray(expenses) ? expenses : [];

	// ── Métricas do ano completo ─────────────────────────────────────────────
	const yearMetrics = useMemo(() => {
		const currentYear = String(new Date().getFullYear());
		const yearExpenses = safeExpenses.filter((e) =>
			(e.vencimento || "").slice(0, 4) === currentYear
		);
		const total = yearExpenses.reduce((acc, e) => acc + e.valor, 0);
		const paid = yearExpenses.filter((e) => e.status === "PAGO").reduce((acc, e) => acc + e.valor, 0);
		const pending = yearExpenses.filter((e) => e.status === "PENDENTE").reduce((acc, e) => acc + e.valor, 0);
		const count = yearExpenses.length;
		return { total, paid, pending, count };
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

			// Comparação direta de strings YYYY-MM-DD (evita bug UTC)
			const dateStr = (e.vencimento || "").slice(0, 10);
			if (filterStart && dateStr < filterStart) return false;
			if (filterEnd && dateStr > filterEnd) return false;

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

	// ── Métricas filtradas (aplica filtros de data/status/busca) ─────────────
	const filteredMetrics = useMemo(() => {
		const filtered = sortedAndFilteredExpenses;
		const total = filtered.reduce((acc, e) => acc + e.valor, 0);
		const paid = filtered.filter((e) => e.status === "PAGO").reduce((acc, e) => acc + e.valor, 0);
		const pending = filtered.filter((e) => e.status === "PENDENTE").reduce((acc, e) => acc + e.valor, 0);
		const count = filtered.length;
		const paidPercent = total > 0 ? (paid / total) * 100 : 0;
		return { total, paid, pending, count, paidPercent };
	}, [sortedAndFilteredExpenses]);

	// ── Dashboard: gráfico mensal baseado no período filtrado ────────────────
	const dashboardData = useMemo(() => {
		const monthlyMap = new Map<string, { paid: number; pending: number }>();
		const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
		const sDate = new Date(filterStart + "T12:00:00");
		const eDate = new Date(filterEnd + "T12:00:00");
		let curr = new Date(sDate.getFullYear(), sDate.getMonth(), 1);
		while (curr <= eDate) {
			const key = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}`;
			monthlyMap.set(key, { paid: 0, pending: 0 });
			curr.setMonth(curr.getMonth() + 1);
		}
		safeExpenses.forEach((e) => {
			const dateStr = (e.vencimento || "").slice(0, 10);
			if (dateStr < filterStart || dateStr > filterEnd) return;
			const yearMonth = dateStr.slice(0, 7);
			const entry = monthlyMap.get(yearMonth);
			if (!entry) return;
			if (e.status === "PAGO") entry.paid += e.valor;
			else entry.pending += e.valor;
		});
		const keys = Array.from(monthlyMap.keys()).sort();
		return keys.map((key) => {
			const val = monthlyMap.get(key)!;
			const [y, m] = key.split("-");
			return { name: `${monthNames[parseInt(m) - 1]}/${y.slice(2)}`, pago: val.paid, pendente: val.pending, total: val.paid + val.pending };
		});
	}, [safeExpenses, filterStart, filterEnd]);

	// ── Top despesas por descrição (período filtrado) ────────────────────────
	const topExpenses = useMemo(() => {
		const map = new Map<string, { total: number; count: number }>();
		sortedAndFilteredExpenses.forEach((e) => {
			const cur = map.get(e.produto) || { total: 0, count: 0 };
			map.set(e.produto, { total: cur.total + e.valor, count: cur.count + 1 });
		});
		return Array.from(map.entries())
			.map(([name, { total, count }]) => ({ name, value: total, count }))
			.sort((a, b) => b.value - a.value)
			.slice(0, 7);
	}, [sortedAndFilteredExpenses]);

	// ── Evolução acumulada (período filtrado) ────────────────────────────────
	const cumulativeData = useMemo(() => {
		const sorted = [...sortedAndFilteredExpenses].sort((a, b) => (a.vencimento || "").localeCompare(b.vencimento || ""));
		let accPaid = 0, accPending = 0;
		const map = new Map<string, { paid: number; pending: number }>();
		sorted.forEach((e) => {
			const month = (e.vencimento || "").slice(0, 7);
			if (e.status === "PAGO") accPaid += e.valor;
			else accPending += e.valor;
			map.set(month, { paid: accPaid, pending: accPending });
		});
		const monthNames = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
		return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([key, val]) => {
			const [y, m] = key.split("-");
			return { name: `${monthNames[parseInt(m) - 1]}/${y.slice(2)}`, pago: val.paid, pendente: val.pending, total: val.paid + val.pending };
		});
	}, [sortedAndFilteredExpenses]);

	// ── Distribuição status para PieChart ────────────────────────────────────
	const statusDistribution = useMemo(() => {
		const paid = sortedAndFilteredExpenses.filter((e) => e.status === "PAGO").reduce((acc, e) => acc + e.valor, 0);
		const pending = sortedAndFilteredExpenses.filter((e) => e.status === "PENDENTE").reduce((acc, e) => acc + e.valor, 0);
		return [
			{ name: "Pago", value: paid, color: "#10b981" },
			{ name: "Pendente", value: pending, color: "#f59e0b" },
		].filter((d) => d.value > 0);
	}, [sortedAndFilteredExpenses]);

	// ── Despesas vencidas (overdue) ─────────────────────────────────────────
	const overdueMetrics = useMemo(() => {
		const today = new Date().toISOString().slice(0, 10);
		const overdue = safeExpenses.filter((e) => e.status === "PENDENTE" && (e.vencimento || "").slice(0, 10) < today);
		return { count: overdue.length, total: overdue.reduce((acc, e) => acc + e.valor, 0) };
	}, [safeExpenses]);

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

			toast.success(`${data.length} contas importadas com sucesso.`);
			setHasChanges(true);
			if (fileInputRef.current) fileInputRef.current.value = "";
		} catch (e) {
			console.error(e);
			toast.error(
				"Erro ao importar dados. Verifique se o backend está rodando corretamente."
			);
		}
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
					toast.error("O arquivo parece estar vazio ou ilegível.");
				}
			} catch (err) {
				console.error(err);
				toast.error("Erro ao ler o arquivo Excel.");
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
	};

	const handleDownloadTemplate = () => {
		// Exporta os dados reais cadastrados — se vazio, baixa um modelo de exemplo
		const hasData = safeExpenses.length > 0;
		const rows = hasData
			? safeExpenses.map((e) => ({
					Descrição: e.produto,
					Vencimento: e.vencimento,
					Obs: e.obs || "",
					Valor: e.valor,
					Status: e.status,
			  }))
			: [
					{ Descrição: "Conta Luz", Vencimento: "2025-12-15", Obs: "Referente Dezembro", Valor: 150.5, Status: "PENDENTE" },
					{ Descrição: "Internet", Vencimento: "2025-12-20", Obs: "Vivo Fibra", Valor: 99.9, Status: "PAGO" },
			  ];

		const wb = XLSX.utils.book_new();
		const ws = XLSX.utils.json_to_sheet(rows);
		XLSX.utils.book_append_sheet(wb, ws, "Despesas");
		XLSX.writeFile(wb, hasData ? "despesas.xlsx" : "modelo_despesas.xlsx");
	};

	// --- RESTANTE DA LÓGICA (CRUD e UI) ---

	const handleSave = async () => {
		if (!formData.produto || !formData.valor) {
			toast.error("Descrição e Valor são obrigatórios.");
			return;
		}
		setIsSaving(true);
		loading.show(editingExpense ? "Salvando despesa..." : "Criando despesa...");
		try {
			if (editingExpense && editingExpense.id) {
				const res = await api.put(`/expenses/${editingExpense.id}`, formData);
				setExpenses((prev: Expense[]) =>
					prev.map((e) => (e.id === editingExpense.id ? res.data : e))
				);
			} else {
				if (recurrence.enabled && recurrence.months > 1) {
					const newExpenses: Expense[] = [];
					for (let i = 0; i < recurrence.months; i++) {
						const baseDate = new Date(formData.vencimento || new Date().toISOString().split("T")[0]);
						baseDate.setMonth(baseDate.getMonth() + i);
						const vencimento = `${baseDate.getFullYear()}-${String(baseDate.getMonth() + 1).padStart(2, "0")}-${String(baseDate.getDate()).padStart(2, "0")}`;
						const res = await api.post("/expenses", { ...formData, produto: `${formData.produto} (${i + 1}/${recurrence.months})`, vencimento });
						newExpenses.push(res.data);
					}
					setExpenses((prev: Expense[]) => [...newExpenses, ...prev]);
				} else {
					const res = await api.post("/expenses", formData);
					setExpenses((prev: Expense[]) => [res.data, ...prev]);
				}
			}
			setIsModalOpen(false);
			setEditingExpense(null);
			setFormData({});
			toast.success("Despesa salva com sucesso.");
		} catch (err) {
			toast.error("Erro ao salvar");
		} finally {
			setIsSaving(false);
			loading.hide();
		}
	};

	const handleDelete = async (id: number) => {
		const ok = await confirm({
			title: "Excluir despesa?",
			message: "Esta ação não pode ser desfeita.",
			confirmLabel: "Excluir",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/expenses/${id}`);
			setExpenses((prev: Expense[]) => prev.filter((e) => e.id !== id));
			toast.success("Despesa excluída.");
		} catch (err) {
			toast.error("Erro ao excluir.");
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
			toast.error("Erro ao atualizar status");
		}
	};

	const handleSaveChanges = () => {
		setHasChanges(false);
		toast.success("Dados sincronizados com sucesso!");
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
		setRecurrence({ enabled: false, months: 1 });
	};

	// Ação rápida vinda da gaveta de atalhos: abre o formulário em branco.
	useEffect(() => {
		if (quickAction?.tab === "expenses" && quickAction.action === "new") openModal();
	}, [quickAction?.nonce]);

	const isOverdue = (date: string) => {
		return new Date(date) < new Date(new Date().setHours(0, 0, 0, 0));
	};

	/** Seta de ordenação da coluna — some quando a coluna não é a ordenada. */
	const sortArrow = (key: keyof Expense) =>
		sortConfig?.key === key ? (
			sortConfig.direction === "asc" ? (
				<ArrowUp className='w-3 h-3 inline' />
			) : (
				<ArrowDown className='w-3 h-3 inline' />
			)
		) : null;

	return (
		<div className='space-y-4 sm:space-y-6'>
			<div className='flex flex-col gap-3 sm:gap-4'>
				<div className='flex flex-col sm:flex-row gap-2 w-full items-stretch sm:items-end'>
					<div className='flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 w-full md:w-auto shadow-sm'>
						<Filter className='w-4 h-4 text-primary-500' />
						<input
							type='date'
							className='text-xs outline-none bg-transparent text-ink-muted w-full md:w-auto'
							value={filterStart}
							onChange={(e) => setFilterStart(e.target.value)}
						/>
						<span className='text-ink-faint'>|</span>
						<input
							type='date'
							className='text-xs outline-none bg-transparent text-ink-muted w-full md:w-auto'
							value={filterEnd}
							onChange={(e) => setFilterEnd(e.target.value)}
						/>
					</div>
					<div className='relative w-full md:w-48'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-faint z-10' />
						<Input
							type='text'
							placeholder='Buscar descrição...'
							className='!pl-9 text-xs'
							value={filterDesc}
							onChange={(e) => setFilterDesc(e.target.value)}
						/>
					</div>
					<Select
						className='text-xs md:!w-auto'
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value as any)}
					>
						<option value='ALL'>Todos Status</option>
						<option value='PAGO'>Pagos</option>
						<option value='PENDENTE'>Pendentes</option>
					</Select>
				</div>
				<div className='flex gap-2 w-full sm:w-auto justify-end overflow-x-auto pb-1 sm:pb-0'>
					<Button
						variant='secondary'
						onClick={handleDownloadTemplate}
						icon={<Download className='w-4 h-4' />}
						className='whitespace-nowrap'
					>
						<span className='hidden sm:inline'>{safeExpenses.length > 0 ? "Exportar .xlsx" : "Modelo .xlsx"}</span><span className='sm:hidden'>Exportar</span>
					</Button>

					<input
						type='file'
						ref={fileInputRef}
						onChange={handleFileUpload}
						className='hidden'
						accept='.csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel'
					/>
					<Button
						variant='secondary'
						onClick={() => fileInputRef.current?.click()}
						loading={isImporting}
						icon={<Upload className='w-4 h-4' />}
						className='whitespace-nowrap'
					>
						Importar
					</Button>
					{hasChanges && (
						<Button
							onClick={handleSaveChanges}
							icon={<Save className='w-4 h-4' />}
							className='animate-in fade-in zoom-in whitespace-nowrap'
						>
							Salvar
						</Button>
					)}
					<Button
						onClick={() => openModal()}
						icon={<Plus className='w-4 h-4' />}
						className='whitespace-nowrap'
					>
						Nova Conta
					</Button>
					<Button
						variant={showDashboard ? "primary" : "secondary"}
						onClick={() => setShowDashboard(!showDashboard)}
						icon={<BarChart2 className='w-4 h-4' />}
						className='whitespace-nowrap'
					>
						{showDashboard ? "Ocultar" : "Dashboard"}
					</Button>
				</div>
			</div>

			{/* Dashboard Financeiro */}
			{showDashboard && (
				<div className="animate-in slide-in-from-left-5 duration-300 bg-white border border-slate-200/70 rounded-2xl shadow-card p-6 space-y-6">
					<div className="flex items-center justify-between">
						<h3 className="text-base font-bold text-ink flex items-center gap-2">
							<BarChart2 className="w-5 h-5 text-primary-600" /> Dashboard Financeiro
						</h3>
						<Button variant="ghost" size="sm" onClick={() => setShowDashboard(false)}>Fechar</Button>
					</div>

					{/* Linha 1: Gráfico de barras + PieChart */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
						<div className="lg:col-span-2">
							<h4 className="text-sm font-bold text-ink-muted mb-3">Despesas Mensais (Período Filtrado)</h4>
							<ResponsiveContainer width="100%" height={240}>
								<BarChart data={dashboardData} margin={{ left: -10, right: 10 }}>
									<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
									<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
									<YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
									<Tooltip formatter={(v: number) => Utils.formatCurrency(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: "12px" }} />
									<Bar dataKey="pago" name="Pago" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
									<Bar dataKey="pendente" name="Pendente" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
						<div>
							<h4 className="text-sm font-bold text-ink-muted mb-3">Distribuição por Status</h4>
							{statusDistribution.length > 0 ? (
								<>
									<ResponsiveContainer width="100%" height={180}>
										<PieChart>
											<Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
												{statusDistribution.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
											</Pie>
											<Tooltip formatter={(v: number) => Utils.formatCurrency(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: "12px" }} />
										</PieChart>
									</ResponsiveContainer>
									<div className="flex justify-center gap-4 mt-2">
										{statusDistribution.map((d) => (
											<div key={d.name} className="flex items-center gap-1.5 text-xs">
												<span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
												<span className="num font-semibold text-ink-muted">{d.name}: {Utils.formatCurrency(d.value)}</span>
											</div>
										))}
									</div>
								</>
							) : <p className="text-sm text-ink-faint text-center py-8">Sem dados no período</p>}
						</div>
					</div>

					{/* Linha 2: Evolução acumulada + Top despesas */}
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<div>
							<h4 className="text-sm font-bold text-ink-muted mb-3">Evolução Acumulada</h4>
							{cumulativeData.length > 0 ? (
								<ResponsiveContainer width="100%" height={200}>
									<AreaChart data={cumulativeData} margin={{ left: -10, right: 10 }}>
										<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
										<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
										<YAxis axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
										<Tooltip formatter={(v: number) => Utils.formatCurrency(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: "12px" }} />
										<Area type="monotone" dataKey="pago" name="Pago Acum." stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
										<Area type="monotone" dataKey="total" name="Total Acum." stroke="#6366f1" fill="#6366f1" fillOpacity={0.08} strokeWidth={2} />
									</AreaChart>
								</ResponsiveContainer>
							) : <p className="text-sm text-ink-faint text-center py-8">Sem dados</p>}
						</div>
						<div>
							<h4 className="text-sm font-bold text-ink-muted mb-3">Top Despesas (Período)</h4>
							<div className="space-y-2.5">
								{topExpenses.map((item) => {
									const maxVal = topExpenses[0]?.value || 1;
									return (
										<div key={item.name}>
											<div className="flex justify-between text-xs mb-1">
												<span className="font-semibold text-ink-muted truncate max-w-[200px]">{item.name}</span>
												<span className="num font-bold text-ink">{Utils.formatCurrency(item.value)} <span className="text-ink-faint font-normal">({item.count}x)</span></span>
											</div>
											<div className="h-2 bg-slate-100 rounded-full overflow-hidden">
												<div className="h-full bg-gradient-to-r from-primary-400 to-violet-500 rounded-full transition-all" style={{ width: `${(item.value / maxVal) * 100}%` }} />
											</div>
										</div>
									);
								})}
								{topExpenses.length === 0 && <p className="text-sm text-ink-faint text-center py-4">Sem dados</p>}
							</div>
						</div>
					</div>

					{/* Linha 3: Alerta de vencidas */}
					{overdueMetrics.count > 0 && (
						<div className="flex items-center gap-3 bg-danger-50 border border-danger-200 rounded-xl p-4">
							<AlertTriangle className="w-5 h-5 text-danger-500 flex-shrink-0" />
							<div>
								<p className="num text-sm font-bold text-danger-700">{overdueMetrics.count} despesa{overdueMetrics.count > 1 ? "s" : ""} vencida{overdueMetrics.count > 1 ? "s" : ""}</p>
								<p className="num text-xs text-danger-600">Total em atraso: {Utils.formatCurrency(overdueMetrics.total)}</p>
							</div>
						</div>
					)}
				</div>
			)}

			{/* Cards Ano Atual (1ª linha - BRANCA) */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
				<Card className="p-3 sm:p-4">
					<p className="text-2xs font-bold text-ink-faint uppercase tracking-widest">Total {new Date().getFullYear()}</p>
					<p className="num text-base sm:text-xl font-bold text-ink mt-1">{Utils.formatCurrency(yearMetrics.total)}</p>
					<p className="num text-2xs text-ink-faint mt-1">{yearMetrics.count} despesas</p>
				</Card>
				<Card className="p-3 sm:p-4">
					<p className="text-2xs font-bold text-ink-faint uppercase tracking-widest">Pago {new Date().getFullYear()}</p>
					<p className="num text-base sm:text-xl font-bold text-success-600 mt-1">{Utils.formatCurrency(yearMetrics.paid)}</p>
				</Card>
				<Card className="p-3 sm:p-4">
					<p className="text-2xs font-bold text-ink-faint uppercase tracking-widest">Pendente {new Date().getFullYear()}</p>
					<p className="num text-base sm:text-xl font-bold text-warning-600 mt-1">{Utils.formatCurrency(yearMetrics.pending)}</p>
				</Card>
				<Card className="p-3 sm:p-4">
					<p className="text-2xs font-bold text-ink-faint uppercase tracking-widest">Quitação Anual</p>
					<p className="num text-base sm:text-xl font-bold text-ink mt-1">{yearMetrics.total > 0 ? `${((yearMetrics.paid / yearMetrics.total) * 100).toFixed(0)}%` : "—"}</p>
					<p className="text-2xs text-ink-faint mt-1">do total anual</p>
				</Card>
			</div>

			{/* Cards Período Filtrado (2ª linha - COLORIDA) */}
			<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
				<div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-elevated">
					<p className="text-white/70 text-2xs font-bold uppercase tracking-widest">Total Filtrado</p>
					<div className="flex items-center gap-2 mt-1">
						<DollarSign className="w-5 h-5 text-white/80" />
						<span className="num text-xl sm:text-2xl font-bold">{Utils.formatCurrency(filteredMetrics.total)}</span>
					</div>
					<p className="num text-white/60 text-2xs mt-1">{filteredMetrics.count} despesas</p>
				</div>
				<div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-success-400 to-success-600 text-white shadow-elevated">
					<p className="text-white/70 text-2xs font-bold uppercase tracking-widest">Pago (Filtrado)</p>
					<div className="flex items-center gap-2 mt-1">
						<CheckCircle className="w-5 h-5 text-white/80" />
						<span className="num text-xl sm:text-2xl font-bold">{Utils.formatCurrency(filteredMetrics.paid)}</span>
					</div>
					<p className="num text-white/60 text-2xs mt-1">{filteredMetrics.paidPercent.toFixed(0)}% quitado</p>
				</div>
				<div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-warning-400 to-orange-500 text-white shadow-elevated">
					<p className="text-white/70 text-2xs font-bold uppercase tracking-widest">Pendente (Filtrado)</p>
					<div className="flex items-center gap-2 mt-1">
						<Clock className="w-5 h-5 text-white/80" />
						<span className="num text-xl sm:text-2xl font-bold">{Utils.formatCurrency(filteredMetrics.pending)}</span>
					</div>
					{overdueMetrics.count > 0 && <p className="num text-white/60 text-2xs mt-1">{overdueMetrics.count} vencida{overdueMetrics.count > 1 ? "s" : ""}</p>}
				</div>
			</div>

			<DataTable
				isEmpty={sortedAndFilteredExpenses.length === 0}
				emptyTitle='Nenhuma despesa encontrada.'
				emptyDescription='Ajuste o período ou os filtros para ver outras despesas.'
				emptyIcon={<Search className='w-10 h-10' />}
				maxHeight='500px'
			>
				<TableHead>
					<tr>
						<Th>
							<button
								type='button'
								onClick={() => handleSort("produto")}
								className='inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink transition-colors'
							>
								Descrição {sortArrow("produto")}
							</button>
						</Th>
						<Th>
							<button
								type='button'
								onClick={() => handleSort("vencimento")}
								className='inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink transition-colors'
							>
								Vencimento {sortArrow("vencimento")}
							</button>
						</Th>
						<Th className='hidden md:table-cell'>Obs</Th>
						<Th>
							<button
								type='button'
								onClick={() => handleSort("valor")}
								className='inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink transition-colors'
							>
								Valor {sortArrow("valor")}
							</button>
						</Th>
						<Th className='hidden sm:table-cell'>
							<button
								type='button'
								onClick={() => handleSort("status")}
								className='inline-flex items-center gap-1 uppercase tracking-wide hover:text-ink transition-colors'
							>
								Status {sortArrow("status")}
							</button>
						</Th>
						<Th align='right'>Ações</Th>
					</tr>
				</TableHead>
				<tbody className='divide-y divide-slate-100 text-left text-sm text-ink-muted'>
					{sortedAndFilteredExpenses.map((expense) => (
						<tr
							key={expense.id}
							className='hover:bg-surface-sunken transition-colors'
						>
							<td className='p-2 sm:p-4 font-medium text-ink text-xs sm:text-sm'>
								{expense.produto}
							</td>
							<td
								className={`num p-2 sm:p-4 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 ${
									expense.status === "PENDENTE" &&
									isOverdue(expense.vencimento)
										? "text-danger-600"
										: ""
								}`}
							>
								{Utils.formatDate(expense.vencimento)}
								{expense.status === "PENDENTE" &&
									isOverdue(expense.vencimento) && (
										<AlertTriangle className='w-3.5 h-3.5 sm:w-4 sm:h-4 text-danger-500 animate-pulse' />
									)}
							</td>
							<td
								className='p-2 sm:p-4 text-xs text-ink-muted max-w-[200px] truncate hidden md:table-cell'
								title={expense.obs}
							>
								{expense.obs || "-"}
							</td>
							<td className='num p-2 sm:p-4 font-bold text-ink text-xs sm:text-sm'>
								{Utils.formatCurrency(expense.valor)}
							</td>
							<td className='p-2 sm:p-4 hidden sm:table-cell'>
								<button
									onClick={() => toggleStatus(expense)}
									className='hover:opacity-80 transition-opacity'
									title={expense.status === "PAGO" ? "Marcar Pendente" : "Marcar Pago"}
								>
									<Badge status={expense.status} />
								</button>
							</td>
							<td className='p-2 sm:p-4 text-right'>
								<div className='flex justify-end gap-1 sm:gap-2'>
									<button
										onClick={() => toggleStatus(expense)}
										className='p-1.5 sm:p-2 text-ink-faint hover:text-success-600 hover:bg-success-50 rounded-xl transition-colors sm:hidden'
										title={expense.status === "PAGO" ? "Marcar Pendente" : "Marcar Pago"}
									>
										<CheckCircle className='w-4 h-4' />
									</button>
									<button
										onClick={() => openModal(expense)}
										className='p-1.5 sm:p-2 text-ink-faint hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-colors'
										title='Editar despesa'
									>
										<Edit2 className='w-4 h-4' />
									</button>
									<button
										onClick={() => handleDelete(expense.id!)}
										className='p-1.5 sm:p-2 text-ink-faint hover:text-danger-500 hover:bg-danger-50 rounded-xl transition-colors'
										title='Excluir despesa'
									>
										<Trash2 className='w-4 h-4' />
									</button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</DataTable>

			<Modal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				title={editingExpense ? "Editar Despesa" : "Nova Despesa"}
			>
				<div className='space-y-5'>
					<Field label='Descrição' required>
						<Input
							type='text'
							value={formData.produto || ""}
							onChange={(e) =>
								setFormData({ ...formData, produto: e.target.value })
							}
							placeholder='Ex: Aluguel, Fornecedor X...'
						/>
					</Field>
					<div className='grid grid-cols-2 gap-4'>
						<Field label='Vencimento'>
							<Input
								type='date'
								value={formData.vencimento || ""}
								onChange={(e) =>
									setFormData({ ...formData, vencimento: e.target.value })
								}
							/>
						</Field>
						<Field label='Valor'>
							<Input
								type='number'
								className='num'
								value={formData.valor || ""}
								onChange={(e) =>
									setFormData({ ...formData, valor: Number(e.target.value) })
								}
							/>
						</Field>
					</div>
					<Field label='Observação'>
						{/* `!` obrigatório: `.bg-white` do kit vem depois no CSS gerado. */}
						<Textarea
							rows={3}
							className='resize-none !bg-surface-sunken focus:!bg-white'
							value={formData.obs || ""}
							onChange={(e) =>
								setFormData({ ...formData, obs: e.target.value })
							}
							placeholder='Detalhes adicionais...'
						/>
					</Field>
					<Field label='Status'>
						<div className='flex gap-2'>
							<button
								onClick={() => setFormData({ ...formData, status: "PENDENTE" })}
								className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
									formData.status === "PENDENTE"
										? "bg-warning-50 text-warning-700 border-warning-200 shadow-sm"
										: "bg-white text-ink-muted border-slate-200 hover:bg-slate-50"
								}`}
							>
								Pendente
							</button>
							<button
								onClick={() => setFormData({ ...formData, status: "PAGO" })}
								className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
									formData.status === "PAGO"
										? "bg-success-50 text-success-700 border-success-200 shadow-sm"
										: "bg-white text-ink-muted border-slate-200 hover:bg-slate-50"
								}`}
							>
								Pago
							</button>
						</div>
					</Field>
					{!editingExpense && (
						<Field label='Recorrência'>
							<div className='flex items-center gap-3'>
								<button
									onClick={() => setRecurrence(prev => ({ ...prev, enabled: !prev.enabled }))}
									className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${recurrence.enabled ? "bg-primary-50 text-primary-700 border-primary-200" : "bg-white text-ink-muted border-slate-200 hover:bg-slate-50"}`}
								>
									{recurrence.enabled ? "Recorrente" : "Única"}
								</button>
								{recurrence.enabled && (
									<div className='flex items-center gap-2'>
										<Select
											value={recurrence.months}
											onChange={(e) => setRecurrence(prev => ({ ...prev, months: Number(e.target.value) }))}
											className='!w-32'
										>
											{[2,3,4,5,6,7,8,9,10,11,12].map(n => (
												<option key={n} value={n}>{n} meses</option>
											))}
										</Select>
									</div>
								)}
							</div>
						</Field>
					)}
					<div className='flex justify-end pt-4 border-t border-slate-100 gap-2'>
						<Button variant='ghost' onClick={() => setIsModalOpen(false)}>
							Cancelar
						</Button>
						<Button onClick={handleSave} loading={isSaving}>
							{!editingExpense && recurrence.enabled ? `Salvar ${recurrence.months} Despesas` : "Salvar Despesa"}
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
