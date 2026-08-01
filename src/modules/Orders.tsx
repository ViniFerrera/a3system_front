import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Utils } from "@/utils";
import { Order, Client, PriceRule } from "@/types";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
	Plus,
	Edit2,
	CheckCircle,
	Trash2,
	Clock,
	X,
	ChevronDown,
	ChevronUp,
	Search,
	Calendar,
	List,
	TrendingUp,
	TrendingDown,
	AlertCircle,
	FolderOpen,
	Minus,
	CreditCard,
	Settings,
	RefreshCcw,
	CheckCircle2,
	XCircle,
	BarChart2,
} from "lucide-react";
import { api } from "@/services/api";
import { useLoading } from "@/components/ui/LoadingOverlay";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Field";
import { DataTable, TableHead, Th } from "@/components/ui/DataTable";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { ItemGrid } from "./orders/ItemGrid";
import { PresetBar, OrderPreset } from "./orders/PresetBar";
import { PresetManagerModal } from "./orders/PresetManagerModal";
import { EditableItem, toEditableItem, createEmptyItem } from "./orders/itemOptions";

interface Machine {
	id: number;
	nome: string;
	tipo: string;
}

// COMPONENTE SEARCHABLE SELECT (MANTIDO IGUAL)
const SearchableSelect = ({
	options,
	value,
	onChange,
	placeholder = "Selecione...",
	fullClients,
	autoFocus = false,
}: {
	options: { id: number; label: string }[];
	value: number;
	onChange: (val: number) => void;
	placeholder?: string;
	fullClients?: Client[];
	/** Abre a lista já na montagem — o cursor cai direto no campo de busca. */
	autoFocus?: boolean;
}) => {
	// O campo de busca só existe enquanto a lista está aberta; para o foco
	// automático chegar nele, a lista precisa nascer aberta.
	const [isOpen, setIsOpen] = useState(autoFocus);
	const [search, setSearch] = useState("");
	const wrapperRef = useRef<HTMLDivElement>(null);

	const selectedOption = options.find((o) => o.id === value);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				wrapperRef.current &&
				!wrapperRef.current.contains(event.target as Node)
			) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const filteredOptions = useMemo(() => {
		const term = search.toLowerCase();
		if (fullClients) {
			return fullClients
				.filter(
					(c) =>
						c.nome.toLowerCase().includes(term) ||
						(c.telefone || "").includes(term)
				)
				.map((c) => ({ id: Number(c.id), label: c.nome }));
		}
		return options.filter((o) => o.label.toLowerCase().includes(term));
	}, [search, options, fullClients]);

	return (
		<div className='relative w-full' ref={wrapperRef}>
			<div
				className='w-full border border-slate-200 rounded-[10px] p-2.5 bg-white text-sm flex justify-between items-center cursor-pointer hover:border-indigo-300 transition-colors shadow-sm'
				onClick={() => setIsOpen(!isOpen)}
			>
				<span
					className={
						selectedOption ? "text-slate-800 font-medium" : "text-slate-400"
					}
				>
					{selectedOption ? selectedOption.label : placeholder}
				</span>
				<ChevronDown className='w-4 h-4 text-slate-400' />
			</div>
			{isOpen && (
				<div className='absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-[10px] shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100'>
					<div className='p-2 border-b border-slate-200/60 bg-slate-50 sticky top-0'>
						<div className='flex items-center gap-2 bg-white border border-slate-200 rounded-[6px] px-2 py-1.5'>
							<Search className='w-3.5 h-3.5 text-slate-400' />
							<input
								type='text'
								className='w-full text-xs outline-none py-0.5 text-slate-700'
								placeholder='Buscar nome ou telefone...'
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								autoFocus
							/>
						</div>
					</div>
					<div className='overflow-y-auto flex-1 custom-scrollbar'>
						{filteredOptions.length > 0 ? (
							filteredOptions.map((opt) => (
								<div
									key={opt.id}
									className={`px-3 py-2.5 text-sm cursor-pointer border-l-2 border-transparent hover:bg-indigo-50 hover:border-indigo-500 transition-all ${
										opt.id === value
											? "bg-indigo-50 text-indigo-700 font-bold border-indigo-500"
											: "text-slate-600"
									}`}
									onClick={() => {
										onChange(opt.id);
										setIsOpen(false);
										setSearch("");
									}}
								>
									{opt.label}
								</div>
							))
						) : (
							<div className='p-4 text-xs text-slate-400 text-center flex flex-col items-center gap-1'>
								<AlertCircle className='w-4 h-4' />
								Nenhum cliente encontrado.
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};

// COMPONENTES AUXILIARES VISUAIS (MANTIDOS IGUAIS)
const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
	const chartData = data.map((val, i) => ({ i, val }));
	return (
		<div className='h-[40px] w-[80px]'>
			<ResponsiveContainer width='100%' height='100%'>
				<LineChart data={chartData}>
					<Line
						type='monotone'
						dataKey='val'
						stroke={color}
						strokeWidth={2}
						dot={false}
						isAnimationActive={false}
					/>
				</LineChart>
			</ResponsiveContainer>
		</div>
	);
};

const VariationIndicator = ({
	val,
	label = "mês",
}: {
	val: number;
	label?: string;
}) => {
	const isNeutral = val === 0;
	const isPositive = val > 0;
	if (isNeutral) {
		return (
			<div className='flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-400'>
				<Minus className='w-3 h-3' />
				<span>0% {label}</span>
			</div>
		);
	}
	return (
		<div
			className={`flex items-center gap-1 mt-2 text-[10px] font-bold ${
				isPositive ? "text-emerald-600" : "text-red-500"
			}`}
		>
			{isPositive ? (
				<TrendingUp className='w-3 h-3' />
			) : (
				<TrendingDown className='w-3 h-3' />
			)}
			<span>
				{isPositive ? "+" : ""}
				{val.toFixed(0)}% {label}
			</span>
		</div>
	);
};

// Limite por arquivo. O servidor recusa acima disso; validar aqui evita
// esperar um upload de 40MB só para receber erro.
const MAX_FILE_MB = 25;
const EXT_PERMITIDAS = [
	"pdf", "jpg", "jpeg", "png", "gif", "webp", "svg", "ai", "cdr", "psd", "eps",
	"doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip", "rar",
];

export const OrderModule = ({
	clients,
	priceTable,
	orders,
	setOrders,
	onStockUpdate,
	machinery = [],
	setClients,
	newOrderSignal = 0,
}: {
	clients: Client[];
	priceTable: PriceRule[];
	orders: Order[];
	setOrders: Function;
	onStockUpdate: Function;
	machinery?: Machine[];
	setClients: Function;
	newOrderSignal?: number;
}) => {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
	const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
	const [editingOrder, setEditingOrder] = useState<Order | null>(null);
	const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
	const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
	const [machinesList, setMachinesList] = useState<Machine[]>(machinery);
	const [isRefreshing, setIsRefreshing] = useState(false);

	// OneDrive web config para montar link direto
	const [onedriveConfig, setOnedriveConfig] = useState<{ cid: string; folderPath: string } | null>(null);
	useEffect(() => {
		api.get("/onedrive-web-config").then((res) => setOnedriveConfig(res.data)).catch(() => {});
	}, []);
	const loading = useLoading();
	const toast = useToast();
	const confirm = useConfirm();

	// Configuração Taxa Débito
	const [debitTaxPercent, setDebitTaxPercent] = useState(0);

	// Novo Cliente Rápido
	const [quickClientData, setQuickClientData] = useState({
		nome: "",
		telefone: "",
		email: "",
	});

	// Filtros de Data
	const [filterStart, setFilterStart] = useState(() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
	});
	const [filterEnd, setFilterEnd] = useState(() => {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
			2,
			"0"
		)}-${String(d.getDate()).padStart(2, "0")}`;
	});

	const [filterClient, setFilterClient] = useState(0);
	const [filterServices, setFilterServices] = useState<string[]>([]);
	const [filterPaymentStatus, setFilterPaymentStatus] = useState<
		"TODOS" | "PAGO" | "NAO_PAGO" | "PARCIAL"
	>("TODOS");
	const [filterOrderStatus, setFilterOrderStatus] = useState<
		"TODOS" | "ABERTA" | "CONCLUIDA" | "CANCELADA"
	>("TODOS");
	const [filterNF, setFilterNF] = useState<"TODOS" | "COM_NF" | "SEM_NF">("TODOS");

	// Paginação
	const [currentPage, setCurrentPage] = useState(1);
	const [pageSize, setPageSize] = useState(25);

	useEffect(() => {
		api
			.get("/machinery")
			.then((res) => {
				if (Array.isArray(res.data)) setMachinesList(res.data);
			})
			.catch(console.error);

		api
			.get("/config/taxa_debito")
			.then((res) => {
				if (res.data.value) setDebitTaxPercent(Number(res.data.value));
			})
			.catch(console.error);

		api
			.get("/order-presets")
			.then((res) => {
				if (Array.isArray(res.data)) setPresets(res.data);
			})
			.catch(console.error);
	}, []);

	// Defaults de ordem nova: 99,5% das ordens são PAGO e 63,2% em PIX.
	// Aplicam-se só à criação — edição preserva o que está gravado.
	const DEFAULT_NEW_ORDER: Partial<Order> = {
		cliente_id: 0,
		descricao: "",
		items: [],
		anexos: [],
		status_pagamento: "PAGO",
		forma_pagamento: "PIX",
		taxa_extra: 0,
		desconto_pontual: 0,
		nota_fiscal: false,
	};

	// --- FORM STATE ---
	// Data em hora local (sem sufixo Z): o banco guarda hora local e
	// toISOString() faria a ordem criada após as 21h nascer com a data de amanhã.
	const [formData, setFormData] = useState<Partial<Order>>({
		...DEFAULT_NEW_ORDER,
		data: Utils.localIsoNow(),
	});

	// Trava de gravação: impede o segundo clique enquanto o POST está em voo.
	const [isSaving, setIsSaving] = useState(false);
	const [formErrors, setFormErrors] = useState<{ cliente?: string }>({});

	// Bloco Financeiro colapsável — nada some, apenas deixa de ocupar tela
	// quando está no padrão.
	const [financeOpen, setFinanceOpen] = useState(false);

	// Resumo de uma linha do que está configurado — evita expandir só para conferir.
	const financeSummary = useMemo(() => {
		const status = { NAO_PAGO: "Não pago", PARCIAL: "Parcial", PAGO: "Pago" }[
			formData.status_pagamento || "NAO_PAGO"
		];
		const forma = formData.forma_pagamento || "sem forma";
		const taxa = formData.taxa_extra
			? ` · taxa ${Utils.formatCurrency(formData.taxa_extra)}`
			: "";
		const nf = formData.nota_fiscal ? " · com NF" : "";
		return `${status} · ${forma}${taxa}${nf}`;
	}, [
		formData.status_pagamento,
		formData.forma_pagamento,
		formData.taxa_extra,
		formData.nota_fiscal,
	]);

	// Itens da ordem em edição. Fonte única da grade — substitui o antigo par
	// "tempItem + formData.items só-leitura".
	const [gridItems, setGridItems] = useState<EditableItem[]>([]);
	const [presets, setPresets] = useState<OrderPreset[]>([]);
	const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);

	// Subtotal dos itens da grade, antes de desconto e taxa.
	const gridSubtotal = useMemo(
		() => gridItems.reduce((acc, i) => acc + (i.total || 0), 0),
		[gridItems]
	);

	// --- EFEITO: Calcular Taxa ao Mudar Forma de Pagamento ---
	useEffect(() => {
		if (formData.forma_pagamento === "DEBITO" && debitTaxPercent > 0) {
			const subtotal =
				gridSubtotal * (1 - (formData.desconto_pontual || 0) / 100);
			const extra = subtotal * (debitTaxPercent / 100);
			setFormData((prev) => ({ ...prev, taxa_extra: extra }));
		} else if (
			formData.forma_pagamento !== "DEBITO" &&
			formData.taxa_extra !== 0 &&
			!editingOrder
		) {
			setFormData((prev) => ({ ...prev, taxa_extra: 0 }));
		}
	}, [
		formData.forma_pagamento,
		gridSubtotal,
		formData.desconto_pontual,
		debitTaxPercent,
	]);

	// --- FUNÇÃO DE REFRESH MANUAL (PONTO 3) ---
	const handleRefreshOrders = async () => {
		setIsRefreshing(true);
		loading.show("Atualizando ordens...");
		try {
			const res = await api.get("/orders");
			const processed = res.data.map((o: any) => ({
				...o,
				items: typeof o.items === "string" ? JSON.parse(o.items) : o.items,
				anexos: typeof o.anexos === "string" ? JSON.parse(o.anexos) : o.anexos,
			}));
			setOrders(processed);
		} catch (err) {
			console.error("Erro ao atualizar ordens:", err);
			toast.error("Não foi possível atualizar a lista.");
		} finally {
			setIsRefreshing(false);
			loading.hide();
		}
	};

	const sanitizeOrderResponse = (data: any): Order => {
		return {
			...data,
			id: Number(data.id),
			items:
				typeof data.items === "string"
					? JSON.parse(data.items)
					: data.items || [],
			anexos:
				typeof data.anexos === "string"
					? JSON.parse(data.anexos)
					: data.anexos || [],
			total: Number(data.total || 0),
			cliente_id: Number(data.cliente_id || 0),
			cliente_nome: data.cliente_nome || "Cliente",
			status: data.status || "ABERTA",
			taxa_extra: Number(data.taxa_extra || 0),
		};
	};

	const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (!e.target.files) return;
		const escolhidos = Array.from(e.target.files);
		const aceitos: File[] = [];

		escolhidos.forEach((f) => {
			const ext = f.name.split(".").pop()?.toLowerCase() || "";
			if (f.size > MAX_FILE_MB * 1024 * 1024) {
				toast.error(
					`"${f.name}" tem ${(f.size / 1024 / 1024).toFixed(
						1
					)}MB — o limite é ${MAX_FILE_MB}MB.`
				);
			} else if (!EXT_PERMITIDAS.includes(ext)) {
				toast.error(`"${f.name}": extensão .${ext} não é aceita.`);
			} else {
				aceitos.push(f);
			}
		});

		if (aceitos.length === 0) {
			e.target.value = "";
			return;
		}
		setFilesToUpload((prev) => [...prev, ...aceitos]);
		setFormData((prev) => ({
			...prev,
			anexos: [...(prev.anexos || []), ...aceitos.map((f) => f.name)],
		}));
		e.target.value = "";
	};

	const filteredOrders = useMemo(() => {
		return orders.filter((o) => {
			// Extrai YYYY-MM-DD direto da string armazenada (hora local, sem converter para UTC)
			const orderDateString = o.data ? o.data.split("T")[0] : "";
			if (filterStart && orderDateString < filterStart) return false;
			if (filterEnd && orderDateString > filterEnd) return false;
			if (filterClient !== 0 && o.cliente_id !== filterClient) return false;
			if (filterServices.length > 0) {
				const hasService = o.items.some((i) =>
					filterServices.includes(i.servico)
				);
				if (!hasService) return false;
			}
			if (filterPaymentStatus !== "TODOS") {
				const pag = o.status_pagamento || "NAO_PAGO";
				if (pag !== filterPaymentStatus) return false;
			}
			if (filterOrderStatus !== "TODOS") {
				if (o.status !== filterOrderStatus) return false;
			}
			if (filterNF !== "TODOS") {
				if (filterNF === "COM_NF" && !o.nota_fiscal) return false;
				if (filterNF === "SEM_NF" && o.nota_fiscal) return false;
			}
			return true;
		});
	}, [
		orders,
		filterStart,
		filterEnd,
		filterClient,
		filterServices,
		filterPaymentStatus,
		filterOrderStatus,
		filterNF,
	]);

	// Reset page when filters change
	useEffect(() => { setCurrentPage(1); }, [filterStart, filterEnd, filterClient, filterServices, filterPaymentStatus, filterOrderStatus, filterNF]);

	// Paginated orders
	const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
	const paginatedOrders = useMemo(() => {
		const start = (currentPage - 1) * pageSize;
		return filteredOrders.slice(start, start + pageSize);
	}, [filteredOrders, currentPage, pageSize]);

	// --- CÁLCULO DE KPIS ---
	const summary = useMemo(() => {
		const now = new Date();
		const currentMonth = now.getMonth();
		const currentYear = now.getFullYear();

		const getMonthData = (dateStr: string) => {
			const d = new Date(dateStr);
			const isThisMonth =
				d.getMonth() === currentMonth && d.getFullYear() === currentYear;
			const isLastMonth =
				currentMonth === 0
					? d.getMonth() === 11 && d.getFullYear() === currentYear - 1
					: d.getMonth() === currentMonth - 1 &&
					  d.getFullYear() === currentYear;
			return { isThisMonth, isLastMonth };
		};

		const thisMonthOrders = filteredOrders.filter(
			(o) => getMonthData(o.data).isThisMonth
		).length;
		const lastMonthOrders = filteredOrders.filter(
			(o) => getMonthData(o.data).isLastMonth
		).length;
		const variationTotal =
			lastMonthOrders === 0
				? thisMonthOrders > 0
					? 100
					: 0
				: ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100;

		const thisMonthOpen = filteredOrders.filter(
			(o) => o.status === "ABERTA" && getMonthData(o.data).isThisMonth
		).length;
		const lastMonthOpen = filteredOrders.filter(
			(o) => o.status === "ABERTA" && getMonthData(o.data).isLastMonth
		).length;
		const variationOpen =
			lastMonthOpen === 0
				? thisMonthOpen > 0
					? 100
					: 0
				: ((thisMonthOpen - lastMonthOpen) / lastMonthOpen) * 100;

		const thisMonthCompleted = filteredOrders.filter(
			(o) =>
				o.status === "CONCLUIDA" &&
				o.data_conclusao &&
				getMonthData(o.data_conclusao).isThisMonth
		).length;
		const lastMonthCompleted = filteredOrders.filter(
			(o) =>
				o.status === "CONCLUIDA" &&
				o.data_conclusao &&
				getMonthData(o.data_conclusao).isLastMonth
		).length;
		const variationCompleted =
			lastMonthCompleted === 0
				? thisMonthCompleted > 0
					? 100
					: 0
				: ((thisMonthCompleted - lastMonthCompleted) / lastMonthCompleted) *
				  100;

		const totalDurationMs = filteredOrders.reduce((acc, o) => {
			if (o.status === "CONCLUIDA" && o.data_conclusao) {
				const diff =
					new Date(o.data_conclusao).getTime() - new Date(o.data).getTime();
				return diff > 0 ? acc + diff : acc;
			}
			return acc;
		}, 0);
		const countDuration = filteredOrders.filter(
			(o) => o.status === "CONCLUIDA" && o.data_conclusao
		).length;
		const avgTimeHours =
			countDuration > 0
				? totalDurationMs / countDuration / (1000 * 60 * 60)
				: 0;
		const avgTimeDisplay =
			avgTimeHours > 24
				? `${(avgTimeHours / 24).toFixed(1)} dias`
				: `${avgTimeHours.toFixed(1)} horas`;

		const totalOrders = filteredOrders.length;
		const openOrdersSnapshot = filteredOrders.filter(
			(o) => o.status === "ABERTA"
		).length;
		const completedOrdersSnapshot = filteredOrders.filter(
			(o) => o.status === "CONCLUIDA"
		).length;

		const sparklineData = Array(7)
			.fill(0)
			.map((_, i) => {
				const d = new Date();
				d.setDate(d.getDate() - (6 - i));
				d.setHours(0, 0, 0, 0);
				return filteredOrders.filter((o) => {
					const od = new Date(o.data);
					od.setHours(0, 0, 0, 0);
					return od.getTime() === d.getTime();
				}).length;
			});

		return {
			totalOrders,
			openOrdersSnapshot,
			completedOrdersSnapshot,
			avgTimeDisplay,
			variationTotal,
			variationOpen,
			variationCompleted,
			sparklineData,
		};
	}, [filteredOrders]);

	const uniqueServices = useMemo(
		() => [...new Set(priceTable.map((p) => p.Servico))].sort(),
		[priceTable]
	);

	// Acrescenta itens de um preset ou de uma sugestão do cliente à grade.
	// Acrescenta em vez de substituir, para permitir empilhar pré-definições.
	const handleAddItems = (novos: any[]) => {
		const convertidos = novos.map((raw) => toEditableItem(raw, priceTable));
		setGridItems((prev) => [...prev, ...convertidos]);
	};

	const reloadPresets = () => {
		api
			.get("/order-presets")
			.then((res) => setPresets(Array.isArray(res.data) ? res.data : []))
			.catch(console.error);
	};

	const handleSave = async (keepOpen = false) => {
		// Segunda guarda contra duplo envio (a primeira é o botão desabilitado).
		if (isSaving) return;

		if (!formData.cliente_id) {
			setFormErrors({ cliente: "Selecione um cliente" });
			toast.error("Selecione um cliente antes de salvar a ordem.");
			return;
		}
		setFormErrors({});

		// Linha em branco (usuário clicou "Adicionar linha" e não preencheu)
		// não vira item da ordem.
		const items = gridItems
			.filter((i) => i.servico)
			.map(({ _key, ...item }) => item);
		const subtotal =
			items.reduce((acc, i) => acc + (i.total || 0), 0) *
			(1 - (formData.desconto_pontual || 0) / 100);
		// Valor Final = Subtotal + Taxa Extra
		const total = subtotal + (formData.taxa_extra || 0);

		const client = clients.find((c) => c.id == formData.cliente_id);
		const dataPayload = new FormData();
		dataPayload.append("cliente_id", String(formData.cliente_id || 0));
		dataPayload.append("cliente_nome", client?.nome || "Desconhecido");
		dataPayload.append("descricao", formData.descricao || "");
		dataPayload.append("total", String(total));
		dataPayload.append("status", editingOrder ? editingOrder.status : "ABERTA");
		dataPayload.append(
			"status_pagamento",
			formData.status_pagamento || "NAO_PAGO"
		);
		dataPayload.append("forma_pagamento", formData.forma_pagamento || "");
		dataPayload.append("taxa_extra", String(formData.taxa_extra || 0));
		dataPayload.append("nota_fiscal", String(formData.nota_fiscal || false));

		// Envia datetime completo com hora local (BRT) para evitar +3h no servidor UTC
		const dateValue = editingOrder
			? (formData.data || Utils.localIsoNow())
			: (() => {
				const datePart = formData.data ? formData.data.split("T")[0] : Utils.localIsoNow().split("T")[0];
				return `${datePart}T${Utils.localIsoNow().split("T")[1]}`;
			})();
		dataPayload.append("data", dateValue);

		dataPayload.append("items", JSON.stringify(items));
		dataPayload.append(
			"anexos",
			JSON.stringify(Array.isArray(formData.anexos) ? formData.anexos : [])
		);
		filesToUpload.forEach((file) => dataPayload.append("files", file));

		setIsSaving(true);
		loading.show(editingOrder ? "Salvando ordem..." : "Criando ordem...");
		try {
			let savedOrder: Order;
			if (editingOrder && editingOrder.id) {
				const res = await api.put(`/orders/${editingOrder.id}`, dataPayload);
				const mergedData = { ...editingOrder, ...formData, ...res.data };
				savedOrder = sanitizeOrderResponse(mergedData);
				setOrders((prev: Order[]) =>
					prev.map((o) => (o.id === editingOrder.id ? savedOrder : o))
				);
			} else {
				const res = await api.post("/orders", dataPayload);
				const mergedData = {
					...formData,
					cliente_nome: client?.nome,
					total,
					...res.data,
				};
				savedOrder = sanitizeOrderResponse(mergedData);
				setOrders((prev: Order[]) => [savedOrder, ...prev]);
			}
			toast.success(
				editingOrder
					? `Ordem #${editingOrder.id} atualizada.`
					: `Ordem #${savedOrder.id} criada.`
			);
			// Limpeza comum aos dois caminhos.
			setEditingOrder(null);
			setFilesToUpload([]);
			setFormData({
				...DEFAULT_NEW_ORDER,
				data: Utils.localIsoNow(),
			});
			if (keepOpen) {
				// Mantém o modal aberto e já pronto para a próxima ordem do balcão.
				setGridItems([createEmptyItem()]);
				setFinanceOpen(false);
			} else {
				setGridItems([]);
				setIsModalOpen(false);
			}
		} catch (err) {
			console.error(err);
			toast.error("Erro ao salvar a ordem. Nada foi gravado — tente novamente.");
		} finally {
			setIsSaving(false);
			loading.hide();
		}
	};

	const handleDelete = async (id: number) => {
		const ok = await confirm({
			title: `Apagar a ordem #${id}?`,
			message: "Esta ação não pode ser desfeita.",
			confirmLabel: "Apagar",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/orders/${id}`);
			setOrders((prev: Order[]) => prev.filter((o) => o.id !== id));
			toast.success(`Ordem #${id} apagada.`);
		} catch (err) {
			toast.error("Erro ao apagar a ordem.");
		}
	};

	const updateStatus = async (order: Order, updates: Partial<Order>) => {
		if (updates.status === "CONCLUIDA" && order.status !== "CONCLUIDA") {
			const ok = await confirm({
				title: `Concluir a ordem #${order.id}?`,
				message: "O estoque será baixado conforme os itens da ordem.",
				confirmLabel: "Concluir",
			});
			if (!ok) return;
		} else if (updates.status === "CANCELADA") {
			const ok = await confirm({
				title: `Cancelar a ordem #${order.id}?`,
				confirmLabel: "Cancelar ordem",
				cancelLabel: "Voltar",
				danger: true,
			});
			if (!ok) return;
		}
		const statusLabel = updates.status === "CONCLUIDA" ? "Concluindo" : updates.status === "CANCELADA" ? "Cancelando" : "Atualizando";
		loading.show(`${statusLabel} ordem #${order.id}...`);
		try {
			// Envia data_conclusao com hora local quando conclui
			const finalUpdates = { ...updates };
			if (updates.status === "CONCLUIDA" && order.status !== "CONCLUIDA") {
				finalUpdates.data_conclusao = Utils.localIsoNow();
			}
			const res = await api.put(`/orders/${order.id}`, {
				...order,
				...finalUpdates,
			});
			const mergedOrder = { ...order, ...finalUpdates, ...res.data };
			const updatedOrder = sanitizeOrderResponse(mergedOrder);
			setOrders((prev: Order[]) =>
				prev.map((o) => (o.id === order.id ? updatedOrder : o))
			);
			if (updates.status === "CONCLUIDA") onStockUpdate(order.items);
		} catch (err) {
			toast.error("Erro ao atualizar o status da ordem.");
		} finally {
			loading.hide();
		}
	};

	// SALVAR CONFIG DE TAXA
	const handleSaveConfig = async () => {
		try {
			await api.post("/config", {
				key: "taxa_debito",
				value: String(debitTaxPercent),
			});
			toast.success("Taxa salva com sucesso.");
			setIsConfigModalOpen(false);
		} catch (err) {
			toast.error("Erro ao salvar a configuração.");
		}
	};

	// SALVAR NOVO CLIENTE RÁPIDO
	const handleQuickClientSave = async () => {
		if (!quickClientData.nome) return toast.error("Informe o nome do cliente.");
		try {
			const res = await api.post("/clients", {
				nome: quickClientData.nome,
				telefone: quickClientData.telefone,
				email: quickClientData.email,
				tipo: "PF",
			});
			setClients((prev: Client[]) => [...prev, res.data]);
			setFormData((prev) => ({ ...prev, cliente_id: res.data.id }));
			setIsQuickClientOpen(false);
			setQuickClientData({ nome: "", telefone: "", email: "" });
		} catch (e) {
			toast.error("Erro ao criar o cliente.");
		}
	};

	const openModal = (order?: Order) => {
		if (order) {
			setEditingOrder(order);
			const rawItems =
				typeof order.items === "string"
					? JSON.parse(order.items)
					: order.items || [];
			setGridItems(rawItems.map((i: any) => toEditableItem(i, priceTable)));
			setFormData({
				...order,
				items: rawItems,
				anexos:
					typeof order.anexos === "string"
						? JSON.parse(order.anexos)
						: order.anexos || [],
				taxa_extra: order.taxa_extra || 0,
			});
			// Edição abre expandido: os valores gravados precisam ficar à vista.
			setFinanceOpen(true);
		} else {
			setEditingOrder(null);
			setFilesToUpload([]);
			// Uma linha já criada poupa um clique em toda ordem — e ordens de item
			// único são 61,9% do histórico. Linha em branco não vira item: handleSave
			// filtra por `i.servico`.
			setGridItems([createEmptyItem()]);
			setFormData({
				...DEFAULT_NEW_ORDER,
				data: Utils.localIsoNow(),
			});
			// Ordem nova nasce no padrão — o bloco não precisa ocupar tela.
			setFinanceOpen(false);
		}
		setFormErrors({});
		setIsSaving(false);
		setIsModalOpen(true);
	};

	// Fechar com dados preenchidos pede confirmação — hoje o preenchimento
	// evapora sem aviso.
	const handleCloseModal = async () => {
		const temConteudo =
			!!formData.cliente_id ||
			!!formData.descricao ||
			gridItems.some((i) => i.servico) ||
			filesToUpload.length > 0;
		if (temConteudo && !editingOrder) {
			const ok = await confirm({
				title: "Descartar esta ordem?",
				message: "O que você preencheu será perdido.",
				confirmLabel: "Descartar",
				cancelLabel: "Continuar editando",
				danger: true,
			});
			if (!ok) return;
		}
		setIsModalOpen(false);
	};

	// Atalhos válidos só enquanto o formulário está aberto E é o diálogo do
	// topo. Cliente rápido, pré-definições e taxa abrem POR CIMA do formulário
	// (isModalOpen continua true); sem esta guarda, um Ctrl+Enter digitado
	// dentro deles gravava a ordem e fechava o formulário por baixo, deixando o
	// diálogo de cima órfão. O módulo nunca desmonta, então o listener precisa
	// sair junto com o modal.
	const atalhosAtivos =
		isModalOpen && !isQuickClientOpen && !isPresetManagerOpen && !isConfigModalOpen;
	useEffect(() => {
		if (!atalhosAtivos) return;
		const onKey = (e: KeyboardEvent) => {
			if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
				e.preventDefault();
				handleSave(false);
			} else if (e.altKey && e.key.toLowerCase() === "n") {
				e.preventDefault();
				setGridItems((prev) => [...prev, createEmptyItem()]);
			}
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
		// `editingOrder` e `clients` entram porque handleSave lê os dois: sem
		// eles o listener podia gravar com o modo (criação/edição) ou o nome do
		// cliente de um render anterior.
	}, [
		atalhosAtivos,
		formData,
		gridItems,
		filesToUpload,
		isSaving,
		editingOrder,
		clients,
	]);

	// Abre o formulário quando a topbar/paleta/atalho pede "nova ordem".
	// Ignora o valor inicial 0 para não abrir sozinho no primeiro render.
	useEffect(() => {
		if (newOrderSignal > 0) openModal();
	}, [newOrderSignal]);

	const clientOptions = useMemo(
		() => [
			{ id: 0, label: "Todos Clientes" },
			...clients.map((c) => ({ id: Number(c.id), label: c.nome })),
		],
		[clients]
	);
	const clientOptionsForForm = useMemo(
		() => clients.map((c) => ({ id: Number(c.id), label: c.nome })),
		[clients]
	);

	return (
		<div className='flex flex-col space-y-4 sm:space-y-6 pb-12'>
			{/* 1. CARDS RESUMO */}
			<div className='grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4'>
				<Card className='p-3 sm:p-4 flex justify-between items-center bg-slate-50 border border-slate-100 shadow-sm relative overflow-hidden group'>
					<div className='absolute left-0 top-0 bottom-0 w-1 bg-indigo-500'></div>
					<div>
						<p className='text-[10px] sm:text-xs text-slate-500 font-medium capitalize'>
							Total de ordens
						</p>
						<h3 className='num text-xl sm:text-2xl font-bold text-slate-800 mt-1'>
							{summary.totalOrders}
						</h3>
						<VariationIndicator val={summary.variationTotal} />
					</div>
					<div className='hidden sm:block'><MiniSparkline data={summary.sparklineData} color='#6366f1' /></div>
				</Card>

				<Card className='p-3 sm:p-4 flex justify-between items-center bg-amber-50/30 border border-amber-100 shadow-sm relative overflow-hidden group'>
					<div className='absolute left-0 top-0 bottom-0 w-1 bg-amber-500'></div>
					<div>
						<p className='text-[10px] sm:text-xs text-slate-500 font-medium capitalize'>
							Ordens abertas
						</p>
						<h3 className='num text-xl sm:text-2xl font-bold text-slate-800 mt-1'>
							{summary.openOrdersSnapshot}
						</h3>
						<VariationIndicator val={summary.variationOpen} />
					</div>
					<div className='opacity-50'>
						<MiniSparkline
							data={[2, 4, 1, 5, 2, 1, summary.openOrdersSnapshot]}
							color='#f59e0b'
						/>
					</div>
				</Card>

				<Card className='p-3 sm:p-4 flex justify-between items-center bg-emerald-50/30 border border-emerald-100 shadow-sm relative overflow-hidden group'>
					<div className='absolute left-0 top-0 bottom-0 w-1 bg-emerald-500'></div>
					<div>
						<p className='text-[10px] sm:text-xs text-slate-500 font-medium capitalize'>
							Ordens concluídas
						</p>
						<h3 className='num text-xl sm:text-2xl font-bold text-slate-800 mt-1'>
							{summary.completedOrdersSnapshot}
						</h3>
						<VariationIndicator val={summary.variationCompleted} />
					</div>
					<div className='opacity-50'>
						<MiniSparkline data={[1, 2, 3, 4, 3, 5, 6]} color='#10b981' />
					</div>
				</Card>
				<Card className='p-3 sm:p-4 flex justify-between items-center bg-blue-50/30 border border-blue-100 shadow-sm relative overflow-hidden group'>
					<div className='absolute left-0 top-0 bottom-0 w-1 bg-blue-500'></div>
					<div>
						<p className='text-[10px] sm:text-xs text-slate-500 font-medium capitalize'>
							Tempo médio
						</p>
						<h3 className='num text-lg sm:text-xl font-bold text-slate-800 mt-1'>
							{summary.avgTimeDisplay}
						</h3>
						<div className='flex items-center gap-1 mt-2 text-[10px] text-blue-500'>
							<Clock className='w-3 h-3' /> Conclusão
						</div>
					</div>
					<div className='opacity-50'>
						<MiniSparkline data={[10, 12, 11, 10, 9, 8, 10]} color='#3b82f6' />
					</div>
				</Card>
			</div>

			{/* 2. FILTROS */}
			<div className='bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 sm:gap-4'>
				<div className='flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end'>
					<div className='flex items-center gap-2 border border-slate-200 rounded-[10px] p-2 bg-slate-50 w-full sm:w-auto hover:border-indigo-200 transition-colors'>
						<Calendar className='w-4 h-4 text-slate-400 flex-shrink-0' />
						<input
							type='date'
							className='bg-transparent text-xs sm:text-sm outline-none text-slate-600 min-w-0 flex-1'
							value={filterStart}
							onChange={(e) => setFilterStart(e.target.value)}
						/>
						<span className='text-slate-300'>|</span>
						<input
							type='date'
							className='bg-transparent text-xs sm:text-sm outline-none text-slate-600 min-w-0 flex-1'
							value={filterEnd}
							onChange={(e) => setFilterEnd(e.target.value)}
						/>
					</div>
					<div className='w-full sm:w-64'>
						<MultiSelect
							options={uniqueServices}
							selected={filterServices}
							onChange={setFilterServices}
							placeholder='Filtrar Serviços'
							formatLabel={Utils.displayName}
						/>
					</div>
					<div className='w-full sm:w-64'>
						<SearchableSelect
							options={clientOptions}
							value={filterClient}
							onChange={setFilterClient}
							placeholder='Filtrar por Cliente'
							fullClients={clients}
						/>
					</div>
				</div>
				<div className='flex items-center gap-2 justify-end'>
					<button
						onClick={handleRefreshOrders}
						disabled={isRefreshing}
						className={`p-2.5 rounded-[10px] transition border border-slate-200 ${
							isRefreshing
								? "bg-slate-50 text-slate-300 cursor-not-allowed"
								: "bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600"
						}`}
						title='Atualizar Lista'
					>
						<RefreshCcw
							className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}
						/>
					</button>
					<button
						onClick={() => setIsConfigModalOpen(true)}
						className='bg-slate-100 text-slate-600 hover:bg-slate-200 p-2.5 rounded-[10px] transition'
						title='Configurações (Taxas)'
					>
						<Settings className='w-4 h-4' />
					</button>
					<button
						onClick={() => openModal()}
						className='bg-indigo-600 text-white px-4 sm:px-5 py-2.5 rounded-[10px] hover:bg-indigo-700 transition font-bold text-sm flex items-center gap-2 shadow-md shadow-indigo-200'
					>
						<Plus className='w-4 h-4' /> <span className='hidden sm:inline'>Nova</span> Ordem
					</button>
				</div>
			</div>

			{/* 3. STATUS ORDEM + TABS PAGAMENTO */}
			<div className='flex gap-2 mb-2 overflow-x-auto pb-1 -mx-1 px-1'>
				{([
					{ key: "TODOS", label: "Todas", icon: <BarChart2 className="w-3.5 h-3.5" />, active: "bg-indigo-500 text-white border-indigo-500", inactive: "bg-white text-indigo-600 border-indigo-200 hover:bg-indigo-50" },
					{ key: "ABERTA", label: "Abertas", icon: <Clock className="w-3.5 h-3.5" />, active: "bg-blue-500 text-white border-blue-500", inactive: "bg-white text-blue-600 border-blue-200 hover:bg-blue-50" },
					{ key: "CONCLUIDA", label: "Concluídas", icon: <CheckCircle2 className="w-3.5 h-3.5" />, active: "bg-emerald-500 text-white border-emerald-500", inactive: "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50" },
					{ key: "CANCELADA", label: "Canceladas", icon: <XCircle className="w-3.5 h-3.5" />, active: "bg-slate-600 text-white border-slate-600", inactive: "bg-white text-slate-500 border-slate-200 hover:bg-slate-50" },
				] as const).map((btn) => {
					const count = orders.filter((o) => btn.key === "TODOS" || o.status === btn.key).length;
					return (
						<button key={btn.key} onClick={() => setFilterOrderStatus(btn.key as any)}
							className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border font-semibold text-xs transition-all duration-150 shadow-sm ${filterOrderStatus === btn.key ? btn.active + " shadow-md" : btn.inactive}`}
						>
							{btn.icon}{btn.label}
							<span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${filterOrderStatus === btn.key ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>{count}</span>
						</button>
					);
				})}
			</div>
			<div className='flex flex-col sm:flex-row justify-between items-center gap-2 border-b border-slate-200 pb-1'>
				<div className='flex gap-1 overflow-x-auto w-full sm:w-auto pb-1'>
					{[
						{ key: "TODOS", label: "Todas" },
						{
							key: "PAGO",
							label: "Pagas",
							color: "text-emerald-600 bg-emerald-50",
						},
						{
							key: "NAO_PAGO",
							label: "Não Pagas",
							color: "text-red-600 bg-red-50",
						},
						{
							key: "PARCIAL",
							label: "Parcial",
							color: "text-amber-600 bg-amber-50",
						},
					].map((tab) => (
						<button
							key={tab.key}
							onClick={() => setFilterPaymentStatus(tab.key as any)}
							className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-all ${
								filterPaymentStatus === tab.key
									? "border-b-2 border-indigo-600 text-indigo-600 bg-indigo-50/50"
									: "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
							}`}
						>
							{tab.label}
						</button>
					))}
					{/* Filtro NF */}
					<div className="ml-auto flex items-center gap-1.5">
						{[
							{ key: "TODOS", label: "NF: Todas" },
							{ key: "COM_NF", label: "Com NF" },
							{ key: "SEM_NF", label: "Sem NF" },
						].map((tab) => (
							<button
								key={tab.key}
								onClick={() => setFilterNF(tab.key as any)}
								className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
									filterNF === tab.key
										? "bg-indigo-600 text-white shadow-sm"
										: "text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200"
								}`}
							>
								{tab.label}
							</button>
						))}
					</div>
				</div>
			</div>

			{/* 4. TABELA */}
			<div className='space-y-2'>
				<DataTable
					isEmpty={paginatedOrders.length === 0}
					emptyTitle='Nenhuma ordem no período e filtros selecionados'
					// Piso de 420px: em telas curtas (celular, notebook 768px)
					// `100vh - 420px` deixava a janela da tabela com ~250px, bem
					// menos do que a lista ocupava antes, quando crescia com a
					// página. O teto por viewport continua valendo no desktop.
					maxHeight='max(420px, calc(100vh - 420px))'
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
						{paginatedOrders.map((order) => {
							const isExpanded = expandedOrderId === order.id;
							return (
								<React.Fragment key={order.id}>
									<tr
										className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
											isExpanded ? "bg-indigo-50/30" : ""
										}`}
										onClick={() =>
											setExpandedOrderId(
												isExpanded ? null : Number(order.id)
											)
										}
									>
										<td className='p-2 sm:p-4 font-mono text-xs text-slate-400'>
											<span>#{order.id}</span>
											{order.nota_fiscal && <span className='ml-1 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold'>NF</span>}
										</td>
										<td className='p-2 sm:p-4 max-w-[140px] sm:max-w-[200px]'>
											<span className='font-bold text-slate-700 text-xs sm:text-sm block break-words leading-snug'>{order.cliente_nome}</span>
											<span className='text-[10px] text-slate-400 sm:hidden block mt-0.5'>{Utils.formatDateTime(order.data)}</span>
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
															className='inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-600 whitespace-nowrap'
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
												className={`px-2 py-1 rounded-[6px] text-[10px] font-bold border uppercase tracking-wide
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
														onClick={() => updateStatus(order, { status: "CONCLUIDA" })}
														className='flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-emerald-500 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-600 shadow-sm shadow-emerald-200 transition-all'
													>
														<CheckCircle2 className='w-3.5 h-3.5' /> <span className='hidden sm:inline'>Concluir</span>
													</button>
												)}
												{order.status === "ABERTA" && (
													<button
														onClick={() => updateStatus(order, { status: "CANCELADA" })}
														className='flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-red-50 text-red-600 text-[10px] font-bold rounded-lg border border-red-200 hover:bg-red-100 transition-all'
													>
														<XCircle className='w-3.5 h-3.5' /> <span className='hidden sm:inline'>Cancelar</span>
													</button>
												)}
												{order.status === "CONCLUIDA" && (
													<button
														onClick={() => updateStatus(order, { status: "ABERTA" })}
														className='flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-all'
													>
														<Clock className='w-3.5 h-3.5' /> <span className='hidden sm:inline'>Reabrir</span>
													</button>
												)}
												{order.status === "CANCELADA" && (
													<button
														onClick={() => updateStatus(order, { status: "ABERTA" })}
														className='flex items-center gap-1 px-2 sm:px-2.5 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-lg border border-blue-200 hover:bg-blue-100 transition-all'
													>
														<Clock className='w-3.5 h-3.5' /> <span className='hidden sm:inline'>Reabrir</span>
													</button>
												)}
												<button
													onClick={() => openModal(order)}
													className='p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[6px] transition'
												>
													<Edit2 className='w-4 h-4' />
												</button>
												<button
													onClick={() => handleDelete(order.id!)}
													className='p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[6px] transition'
												>
													<Trash2 className='w-4 h-4' />
												</button>
												<button
													onClick={() => setExpandedOrderId(isExpanded ? null : Number(order.id))}
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
															<h5 className='text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2'>
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
																				<span className='text-slate-400 text-[10px] ml-1'>
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
																<div className='num flex justify-end mt-2 pt-2 border-t border-slate-100 text-[10px] text-red-500 font-bold'>
																	+ Juros/Taxas:{" "}
																	{Utils.formatCurrency(
																		order.taxa_extra || 0
																	)}
																</div>
															)}
														</div>
														<div className='bg-white p-4 rounded-[10px] border-l-4 border-amber-400 shadow-sm'>
															<h5 className='text-[10px] font-bold text-slate-500 uppercase mb-2'>
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
															<h5 className='text-[10px] font-bold text-slate-500 uppercase mb-3'>
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
																					updateStatus(order, {
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
															<h5 className='text-[10px] font-bold text-slate-500 uppercase mb-2 flex items-center gap-2'>
																<FolderOpen className='w-4 h-4 text-blue-500' />{" "}
																Arquivos
															</h5>
															<div className='mb-2 bg-slate-50 p-2 rounded border border-slate-200 text-[10px] text-slate-500 font-mono break-all'>
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
																		className='inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors'
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
								</React.Fragment>
							);
						})}
					</tbody>
				</DataTable>
				{/* Paginação + contagem de linhas — fora da casca da tabela, que
				    agora rola por conta própria. */}
				<div className='flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border border-slate-200/70 rounded-2xl shadow-card'>
					<div className='flex items-center gap-3 text-xs text-slate-500'>
						<span className='font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg border border-indigo-100'>
							{filteredOrders.length} {filteredOrders.length === 1 ? 'ordem' : 'ordens'}
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
												? 'bg-indigo-600 text-white shadow-sm'
												: 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
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

			{/* MODAL PRINCIPAL */}
			<Modal
				isOpen={isModalOpen}
				onClose={handleCloseModal}
				title={editingOrder ? "Editar Ordem" : "Nova Ordem"}
				size='xl'
				footer={
					<div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
						<div className='flex items-center gap-3'>
							<label className='text-2xs font-bold text-ink-muted uppercase'>
								Desconto (%)
							</label>
							<Input
								type='number'
								// `!w-20`: o Input do kit já traz `w-full`, e no CSS gerado
								// `.w-full` vem depois de `.w-20` — sem o `!` o campo de
								// desconto esticava e esmagava o Total Final no rodapé.
								className='!w-20 text-center font-bold'
								value={formData.desconto_pontual || 0}
								onChange={(e) =>
									setFormData({
										...formData,
										desconto_pontual: Number(e.target.value),
									})
								}
							/>
							<div className='pl-3 border-l border-slate-200'>
								<p className='text-2xs text-ink-faint font-bold uppercase'>
									Total Final
								</p>
								<p className='num text-xl font-bold text-primary-600 tracking-tight'>
									{Utils.formatCurrency(
										gridSubtotal *
											(1 - (formData.desconto_pontual || 0) / 100) +
											(formData.taxa_extra || 0)
									)}
								</p>
							</div>
						</div>
						<div className='flex items-center gap-2 justify-end'>
							<Button variant='ghost' onClick={handleCloseModal}>
								Cancelar
							</Button>
							{!editingOrder && (
								<Button
									variant='secondary'
									onClick={() => handleSave(true)}
									loading={isSaving}
								>
									Salvar e nova
								</Button>
							)}
							<Button onClick={() => handleSave(false)} loading={isSaving}>
								Salvar Ordem
							</Button>
						</div>
					</div>
				}
			>
				<div className='space-y-6'>
					<div className='grid grid-cols-1 md:grid-cols-12 gap-5'>
						<div className='md:col-span-8 flex gap-2 items-end'>
							<div className='flex-1'>
								<label className='block text-2xs font-bold text-ink-muted uppercase mb-1.5'>
									Cliente <span className='text-danger-500'>*</span>
								</label>
								<SearchableSelect
									options={clientOptionsForForm}
									value={formData.cliente_id || 0}
									onChange={(val) => {
										setFormData({ ...formData, cliente_id: val });
										setFormErrors({});
									}}
									placeholder='Busque nome ou telefone...'
									fullClients={clients}
									autoFocus={!editingOrder}
								/>
								{formErrors.cliente && (
									<p className='text-2xs text-danger-600 mt-1 font-medium'>
										{formErrors.cliente}
									</p>
								)}
							</div>
							<button
								onClick={() => setIsQuickClientOpen(true)}
								className='bg-indigo-50 text-indigo-600 p-2.5 rounded-[10px] hover:bg-indigo-100 transition'
								title='Novo Cliente Rápido'
							>
								<Plus className='w-4 h-4' />
							</button>
						</div>
						<div className='md:col-span-4'>
							<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
								Data
							</label>
							<input
								type='date'
								className='w-full border border-slate-200 rounded-[10px] p-2.5 bg-white text-sm'
								value={formData.data ? formData.data.split("T")[0] : ""}
								onChange={(e) =>
									setFormData({ ...formData, data: e.target.value })
								}
							/>
						</div>
					</div>

					<div className='bg-surface-sunken p-4 rounded-[10px] border border-slate-200'>
						<button
							type='button'
							onClick={() => setFinanceOpen((v) => !v)}
							className='w-full flex items-center gap-2 text-left'
						>
							<CreditCard className='w-4 h-4 text-ink-muted' />
							<span className='text-2xs font-bold text-ink-muted uppercase'>
								Financeiro
							</span>
							{!financeOpen && (
								<span className='text-xs text-ink-muted font-medium truncate'>
									{financeSummary}
								</span>
							)}
							<ChevronDown
								className={`w-4 h-4 text-ink-faint ml-auto transition-transform ${
									financeOpen ? "rotate-180" : ""
								}`}
							/>
						</button>

						{financeOpen && (
							<div className='mt-3'>
							<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
								<div>
									<label className='block text-xs font-bold text-slate-500 mb-1'>
										Status
									</label>
									<select
										className='w-full border border-slate-200 p-2 rounded-[8px] text-sm'
										value={formData.status_pagamento || "NAO_PAGO"}
										onChange={(e) =>
											setFormData({
												...formData,
												status_pagamento: e.target.value as any,
											})
										}
									>
										<option value='NAO_PAGO'>Não Pago</option>
										<option value='PARCIAL'>Parcial</option>
										<option value='PAGO'>Pago</option>
									</select>
								</div>
								<div>
									<label className='block text-xs font-bold text-slate-500 mb-1'>
										Forma Pagamento
									</label>
									<select
										className='w-full border border-slate-200 p-2 rounded-[8px] text-sm'
										value={formData.forma_pagamento || ""}
										onChange={(e) =>
											setFormData({
												...formData,
												forma_pagamento: e.target.value,
											})
										}
									>
										<option value=''>Selecione...</option>
										<option value='DINHEIRO'>Dinheiro</option>
										<option value='PIX'>PIX</option>
										<option value='DEBITO'>Cartão de Débito</option>
										<option value='CREDITO'>Cartão de Crédito</option>
									</select>
								</div>
								<div>
									<label className='block text-xs font-bold text-slate-500 mb-1'>
										Taxa Extra / Juros (R$)
									</label>
									<input
										type='number'
										className='w-full border border-slate-200 p-2 rounded-[8px] text-sm bg-white'
										value={formData.taxa_extra || 0}
										onChange={(e) =>
											setFormData({
												...formData,
												taxa_extra: Number(e.target.value),
											})
										}
									/>
								</div>
							</div>

							{/* Nota Fiscal */}
							<div className='mt-3'>
								<label className='block text-xs font-bold text-slate-500 mb-1.5'>
									Nota Fiscal
								</label>
								<div className='flex gap-2'>
									<button
										type='button'
										onClick={() => setFormData({ ...formData, nota_fiscal: false })}
										className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
											!formData.nota_fiscal
												? "bg-slate-100 text-slate-700 border-slate-300 shadow-sm"
												: "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
										}`}
									>
										Sem NF
									</button>
									<button
										type='button'
										onClick={() => setFormData({ ...formData, nota_fiscal: true })}
										className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-all ${
											formData.nota_fiscal
												? "bg-blue-50 text-blue-700 border-blue-300 shadow-sm"
												: "bg-white text-slate-400 border-slate-200 hover:bg-slate-50"
										}`}
									>
										Com NF
									</button>
								</div>
							</div>
							</div>
						)}
					</div>

					{/* ... Campos Descrição e Itens ... */}
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Descrição Detalhada
						</label>
						<textarea
							rows={2}
							className='w-full border border-slate-200 rounded-[10px] p-3 text-sm'
							value={formData.descricao}
							onChange={(e) =>
								setFormData({ ...formData, descricao: e.target.value })
							}
						/>
					</div>

					{/* PRÉ-DEFINIÇÕES E SUGESTÕES DO CLIENTE */}
					<PresetBar
						clienteId={formData.cliente_id || undefined}
						clienteNome={clients.find((c) => c.id == formData.cliente_id)?.nome}
						onAddItems={handleAddItems}
						onManage={() => setIsPresetManagerOpen(true)}
						presets={presets}
					/>

					{/* GRADE EDITÁVEL DE ITENS */}
					<ItemGrid
						items={gridItems}
						priceTable={priceTable}
						machines={machinesList}
						onChange={setGridItems}
					/>

				</div>
			</Modal>

			{/* MODAL CONFIGURAÇÃO TAXA */}
			<Modal
				isOpen={isConfigModalOpen}
				onClose={() => setIsConfigModalOpen(false)}
				title='Configuração de Taxas'
				size='sm'
			>
				<div className='space-y-4'>
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Taxa Cartão de Débito (%)
						</label>
						<input
							type='number'
							className='w-full border border-slate-200 p-2.5 rounded-[10px]'
							value={debitTaxPercent}
							onChange={(e) => setDebitTaxPercent(Number(e.target.value))}
						/>
						<p className='text-[10px] text-slate-400 mt-1'>
							Essa porcentagem será aplicada automaticamente ao total quando a
							forma de pagamento for "Cartão de Débito".
						</p>
					</div>
					<div className='flex justify-end pt-2'>
						<button
							onClick={handleSaveConfig}
							className='bg-indigo-600 text-white px-4 py-2 rounded-[10px] font-bold text-sm'
						>
							Salvar Configuração
						</button>
					</div>
				</div>
			</Modal>

			{/* MODAL GERENCIAR PRÉ-DEFINIÇÕES */}
			<PresetManagerModal
				isOpen={isPresetManagerOpen}
				onClose={() => setIsPresetManagerOpen(false)}
				presets={presets}
				priceTable={priceTable}
				machines={machinesList}
				onChanged={reloadPresets}
			/>

			{/* MODAL CLIENTE RÁPIDO */}
			<Modal
				isOpen={isQuickClientOpen}
				onClose={() => setIsQuickClientOpen(false)}
				title='Novo Cliente Rápido'
				size='sm'
			>
				<div className='space-y-4'>
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1'>
							Nome *
						</label>
						<input
							type='text'
							className='w-full border border-slate-200 p-2 rounded-[8px]'
							value={quickClientData.nome}
							onChange={(e) =>
								setQuickClientData({ ...quickClientData, nome: e.target.value })
							}
						/>
					</div>
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1'>
							Telefone
						</label>
						<input
							type='text'
							className='w-full border border-slate-200 p-2 rounded-[8px]'
							value={quickClientData.telefone}
							onChange={(e) =>
								setQuickClientData({
									...quickClientData,
									telefone: e.target.value,
								})
							}
						/>
					</div>
					<div>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1'>
							E-mail
						</label>
						<input
							type='email'
							className='w-full border border-slate-200 p-2 rounded-[8px]'
							value={quickClientData.email}
							onChange={(e) =>
								setQuickClientData({
									...quickClientData,
									email: e.target.value,
								})
							}
						/>
					</div>
					<div className='flex justify-end pt-2'>
						<button
							onClick={handleQuickClientSave}
							className='bg-emerald-600 text-white px-4 py-2 rounded-[10px] font-bold text-sm'
						>
							Criar Cliente
						</button>
					</div>
				</div>
			</Modal>
		</div>
	);
};
