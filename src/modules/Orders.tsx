import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Utils } from "@/utils";
import { Order, Client, PriceRule, OrderItem } from "@/types";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
	Plus,
	Edit2,
	CheckCircle,
	Trash2,
	Paperclip,
	Clock,
	Check,
	X,
	FileText,
	Printer,
	ChevronDown,
	ChevronUp,
	Search,
	Calendar,
	List,
	TrendingUp,
	TrendingDown,
	AlertCircle,
	FolderOpen,
	Eraser,
	Minus,
	CreditCard,
	Settings,
	Save,
	RefreshCcw,
	CheckCircle2,
	XCircle,
	BarChart2,
} from "lucide-react";
import { api } from "@/services/api";
import { useLoading } from "@/components/ui/LoadingOverlay";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface Machine {
	id: number;
	nome: string;
	tipo: string;
}

interface OrderItemWithMachine extends OrderItem {
	maquina_id?: number;
	maquina_nome?: string;
}

// COMPONENTE SEARCHABLE SELECT (MANTIDO IGUAL)
const SearchableSelect = ({
	options,
	value,
	onChange,
	placeholder = "Selecione...",
	fullClients,
}: {
	options: { id: number; label: string }[];
	value: number;
	onChange: (val: number) => void;
	placeholder?: string;
	fullClients?: Client[];
}) => {
	const [isOpen, setIsOpen] = useState(false);
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

export const OrderModule = ({
	clients,
	priceTable,
	orders,
	setOrders,
	onStockUpdate,
	machinery = [],
	setClients,
}: {
	clients: Client[];
	priceTable: PriceRule[];
	orders: Order[];
	setOrders: Function;
	onStockUpdate: Function;
	machinery?: Machine[];
	setClients: Function;
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
	}, []);

	// --- FORM STATE ---
	const [formData, setFormData] = useState<Partial<Order>>({
		cliente_id: 0,
		descricao: "",
		items: [],
		anexos: [],
		status_pagamento: "NAO_PAGO",
		forma_pagamento: "",
		taxa_extra: 0,
		desconto_pontual: 0,
		data: new Date().toISOString(),
	});

	const [tempItem, setTempItem] = useState({
		servico: "",
		material: "",
		cor: "",
		quantidade: 0,
		gramatura: "",
		tamanho: "",
		is_double_sided: false,
		maquina_id: 0,
	});

	// --- EFEITO: Calcular Taxa ao Mudar Forma de Pagamento ---
	useEffect(() => {
		if (formData.forma_pagamento === "DEBITO" && debitTaxPercent > 0) {
			const subtotal =
				(formData.items?.reduce((acc, i) => acc + i.total, 0) || 0) *
				(1 - (formData.desconto_pontual || 0) / 100);
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
		formData.items,
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
			alert("Não foi possível atualizar a lista.");
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
		if (e.target.files) {
			const files = Array.from(e.target.files);
			setFilesToUpload((prev) => [...prev, ...files]);
			const newFileNames = files.map((f) => f.name);
			setFormData((prev) => ({
				...prev,
				anexos: [...(prev.anexos || []), ...newFileNames],
			}));
		}
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
	]);

	// Reset page when filters change
	useEffect(() => { setCurrentPage(1); }, [filterStart, filterEnd, filterClient, filterServices, filterPaymentStatus, filterOrderStatus]);

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
		if (!tempItem.material) return [];
		return [
			...new Set(
				priceTable
					.filter(
						(p) =>
							p.Servico === tempItem.servico && p.Material === tempItem.material
					)
					.map((p) => p.Gramatura || "")
			),
		]
			.filter((g) => g !== "")
			.sort();
	}, [tempItem.servico, tempItem.material, priceTable]);
	const availableSizes = useMemo(() => {
		if (!tempItem.material) return [];
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

	const isHyphen = (val: string) =>
		val === "-" || val === " - " || val.trim() === "-";
	const shouldHideField = (options: string[]) =>
		options.length === 1 && isHyphen(options[0]);

	useEffect(() => {
		if (availableMaterials.length === 1 && isHyphen(availableMaterials[0]))
			setTempItem((prev) => ({ ...prev, material: availableMaterials[0] }));
	}, [availableMaterials]);
	useEffect(() => {
		const spec = availableSpecs[0] || "";
		if (availableSpecs.length === 1 && isHyphen(spec))
			setTempItem((prev) => ({ ...prev, gramatura: spec }));
	}, [availableSpecs]);
	useEffect(() => {
		if (availableSizes.length === 1 && isHyphen(availableSizes[0]))
			setTempItem((prev) => ({ ...prev, tamanho: availableSizes[0] }));
	}, [availableSizes]);
	useEffect(() => {
		if (availableColors.length === 1 && isHyphen(availableColors[0]))
			setTempItem((prev) => ({ ...prev, cor: availableColors[0] }));
	}, [availableColors]);

	const handleAddItem = () => {
		// CORREÇÃO PONTO 1: Adicionado tempItem.tamanho (Papel) na chamada
		// para diferenciar A3 de A4 e buscar o preço correto.
		const pricing = Utils.calculatePrice(
			priceTable,
			tempItem.servico,
			tempItem.material,
			tempItem.cor,
			Number(tempItem.quantidade),
			tempItem.gramatura,
			tempItem.tamanho // <--- Item Faltante adicionado aqui
		);
		const selectedMachine = machinesList.find(
			(m) => m.id == tempItem.maquina_id
		);
		const newItem: OrderItemWithMachine = {
			id: Date.now(),
			servico: tempItem.servico,
			material: tempItem.material,
			cor: tempItem.cor,
			quantidade: Number(tempItem.quantidade),
			unitPrice: pricing.unit,
			total: pricing.total,
			ruleApplied: pricing.rule || "N/A", // Regra aplicada
			gramatura: tempItem.gramatura,
			tamanho: tempItem.tamanho, // Salva o tamanho
			is_double_sided: tempItem.is_double_sided,
			maquina_id: Number(tempItem.maquina_id),
			maquina_nome: selectedMachine?.nome,
		};
		setFormData((prev) => ({
			...prev,
			items: [...(prev.items || []), newItem],
		}));
		setTempItem((prev) => ({ ...prev, quantidade: 0 }));
	};

	const handleSave = async () => {
		const items = formData.items || [];
		const subtotal =
			(formData.items?.reduce((acc, i) => acc + i.total, 0) || 0) *
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
			setIsModalOpen(false);
			setEditingOrder(null);
			setFilesToUpload([]);
			setFormData({
				cliente_id: 0,
				descricao: "",
				items: [],
				anexos: [],
				status_pagamento: "NAO_PAGO",
				forma_pagamento: "",
				taxa_extra: 0,
				desconto_pontual: 0,
				data: new Date().toISOString(),
			});
		} catch (err) {
			console.error(err);
			alert("Erro ao salvar ordem");
		} finally {
			loading.hide();
		}
	};

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
			alert("Erro ao atualizar status");
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
			alert("Taxa salva com sucesso!");
			setIsConfigModalOpen(false);
		} catch (err) {
			alert("Erro ao salvar configuração.");
		}
	};

	// SALVAR NOVO CLIENTE RÁPIDO
	const handleQuickClientSave = async () => {
		if (!quickClientData.nome) return alert("Nome é obrigatório");
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
			alert("Erro ao criar cliente");
		}
	};

	const openModal = (order?: Order) => {
		if (order) {
			setEditingOrder(order);
			setFormData({
				...order,
				items:
					typeof order.items === "string"
						? JSON.parse(order.items)
						: order.items || [],
				anexos:
					typeof order.anexos === "string"
						? JSON.parse(order.anexos)
						: order.anexos || [],
				taxa_extra: order.taxa_extra || 0,
			});
		} else {
			setEditingOrder(null);
			setFilesToUpload([]);
			setFormData({
				items: [],
				anexos: [],
				status_pagamento: "NAO_PAGO",
				forma_pagamento: "",
				taxa_extra: 0,
				desconto_pontual: 0,
				data: new Date().toISOString(),
			});
		}
		setIsModalOpen(true);
	};

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
						<h3 className='text-xl sm:text-2xl font-bold text-slate-800 mt-1'>
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
						<h3 className='text-xl sm:text-2xl font-bold text-slate-800 mt-1'>
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
						<h3 className='text-xl sm:text-2xl font-bold text-slate-800 mt-1'>
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
						<h3 className='text-lg sm:text-xl font-bold text-slate-800 mt-1'>
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
				</div>
			</div>

			{/* 4. TABELA */}
			<div className='bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'>
				<div className='overflow-x-auto min-h-[300px]'>
					<table className='w-full text-left text-sm text-slate-600'>
						<thead className='bg-slate-50 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200'>
							<tr>
								<th className='p-2 sm:p-4 w-14 sm:w-20'>ID</th>
								<th className='p-2 sm:p-4'>Cliente</th>
								<th className='p-2 sm:p-4 hidden lg:table-cell'>Criação</th>
								<th className='p-2 sm:p-4 hidden xl:table-cell'>Conclusão</th>
								<th className='p-2 sm:p-4 hidden md:table-cell'>Serviços</th>
								<th className='p-2 sm:p-4'>Total</th>
								<th className='p-2 sm:p-4 hidden sm:table-cell'>Pagamento</th>
								<th className='p-2 sm:p-4 hidden sm:table-cell'>Status</th>
								<th className='p-2 sm:p-4 text-right'>Ações</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-slate-100/60'>
							{paginatedOrders.length > 0 ? (
								paginatedOrders.map((order) => {
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
													#{order.id}
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
													title={order.items.map((i) => i.servico).join(", ")}
												>
													{order.items.length > 0 ? (
														<div className='flex gap-1 overflow-hidden'>
															{order.items.slice(0, 2).map((i, idx) => (
																<span
																	key={idx}
																	className='inline-flex items-center px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] text-slate-600 whitespace-nowrap'
																>
																	{i.servico}
																</span>
															))}
														</div>
													) : (
														"Sem itens"
													)}
												</td>
												<td className='p-2 sm:p-4 font-bold text-slate-800 text-xs sm:text-sm'>
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
																					{item.servico} - {item.material}{" "}
																					{item.gramatura
																						? `(${item.gramatura})`
																						: ""}
																					<span className='text-slate-400 text-[10px] ml-1'>
																						({item.cor})
																					</span>
																				</span>
																				<span className='font-bold text-slate-600'>
																					{Utils.formatCurrency(item.total)}
																				</span>
																			</li>
																		))}
																	</ul>
																	{(order.taxa_extra || 0) > 0 && (
																		<div className='flex justify-end mt-2 pt-2 border-t border-slate-100 text-[10px] text-red-500 font-bold'>
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
																			<span className='font-bold text-indigo-600'>
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
								})
							) : (
								<tr>
									<td colSpan={9} className='p-8 sm:p-12 text-center text-slate-400 text-sm'>
										Nenhuma ordem encontrada.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>
				{/* Paginação + contagem de linhas */}
				<div className='flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200/60 bg-slate-50/50'>
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
				onClose={() => setIsModalOpen(false)}
				title={editingOrder ? "Editar Ordem" : "Nova Ordem"}
				size='lg'
			>
				<div className='space-y-6'>
					<div className='grid grid-cols-1 md:grid-cols-12 gap-5'>
						<div className='md:col-span-8 flex gap-2 items-end'>
							<div className='flex-1'>
								<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
									Cliente *
								</label>
								<SearchableSelect
									options={clientOptionsForForm}
									value={formData.cliente_id || 0}
									onChange={(val) =>
										setFormData({ ...formData, cliente_id: val })
									}
									placeholder='Busque nome ou telefone...'
									fullClients={clients}
								/>
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

					<div className='bg-slate-50 p-4 rounded-[10px] border border-slate-200'>
						<h5 className='text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2'>
							<CreditCard className='w-4 h-4' /> Financeiro
						</h5>
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

					{/* ÁREA DE INSERÇÃO DE ITENS */}
					<div className='bg-slate-50 p-5 rounded-[10px] border border-slate-200 shadow-inner'>
						<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end'>
							{/* 1. Serviço */}
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

							{/* 2. Material */}
							{!shouldHideField(availableMaterials) && (
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
							)}

							{/* 3. Especificação / Gramatura */}
							{!shouldHideField(availableSpecs) && (
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
							)}

							{/* 4. Tamanho */}
							{!shouldHideField(availableSizes) && (
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
							)}

							{/* 5. Cor */}
							{!shouldHideField(availableColors) && (
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
							)}

							{/* 6. Maquinário */}
							<div className='md:col-span-4'>
								<label className='text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1'>
									<Printer className='w-3 h-3' /> Maquinário (Estoque)
								</label>
								<select
									className='w-full text-sm border border-slate-200 p-2 rounded-[10px] bg-white'
									value={tempItem.maquina_id || 0}
									onChange={(e) =>
										setTempItem({
											...tempItem,
											maquina_id: Number(e.target.value),
										})
									}
								>
									<option value='0'>Nenhum / Manual</option>
									{machinesList.map((m) => (
										<option key={m.id} value={m.id}>
											{m.nome}
										</option>
									))}
								</select>
							</div>

							{/* 7. Quantidade */}
							<div className='md:col-span-2'>
								<label className='text-[10px] font-bold text-slate-400 uppercase mb-1 block'>
									Qtd
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

							{/* 8. Frente e Verso */}
							<div className='md:col-span-8 flex items-center h-full pb-2'>
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

							{/* Botão Adicionar */}
							<div className='md:col-span-4'>
								<button
									onClick={handleAddItem}
									disabled={!tempItem.quantidade}
									className='w-full bg-slate-800 text-white text-sm py-2 rounded-[10px] hover:bg-slate-900 transition h-[38px] mt-auto'
								>
									Adicionar Item
								</button>
							</div>
						</div>
					</div>

					{/* LISTA DE ITENS ADICIONADOS (PONTO 2: MAIS DETALHES) */}
					<div className='space-y-2 max-h-40 overflow-y-auto custom-scrollbar bg-white rounded-[10px] border border-slate-100 p-1'>
						{formData.items?.map((item: any, idx) => (
							<div
								key={idx}
								className='flex justify-between items-center p-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition'
							>
								<div className='flex-1 pr-2'>
									<p className='font-bold text-xs text-slate-800'>
										{item.servico} - {item.material}
									</p>
									<div className='flex flex-wrap gap-2 text-[10px] text-slate-500 mt-0.5'>
										<span>Qtd: {item.quantidade}</span>
										{item.tamanho && <span>| {item.tamanho}</span>}
										{item.gramatura && <span>| {item.gramatura}</span>}
										{item.cor && <span>| {item.cor}</span>}
									</div>
									{item.ruleApplied && item.ruleApplied !== "N/A" && (
										<p className='text-[9px] text-indigo-500 mt-0.5'>
											Regra: {item.ruleApplied}
										</p>
									)}
								</div>
								<div className='flex items-center gap-3 pl-2 border-l border-slate-100'>
									<span className='font-bold text-xs text-slate-700 whitespace-nowrap'>
										{Utils.formatCurrency(item.total)}
									</span>
									<button
										onClick={() =>
											setFormData((prev) => ({
												...prev,
												items: prev.items?.filter((_, i) => i !== idx),
											}))
										}
										className='text-slate-300 hover:text-red-500 transition'
									>
										<Trash2 className='w-3.5 h-3.5' />
									</button>
								</div>
							</div>
						))}
					</div>

					<div className='pt-5 border-t border-slate-100 flex justify-between items-center'>
						<div className='flex items-center gap-3'>
							<label className='text-xs font-bold text-slate-500 uppercase'>
								Desconto (%)
							</label>
							<input
								type='number'
								className='w-16 border border-slate-200 rounded-[8px] p-2 text-sm text-center font-bold text-slate-700 outline-none'
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
							<p className='text-2xl font-bold text-indigo-600 tracking-tight'>
								{Utils.formatCurrency(
									(formData.items?.reduce((acc, i) => acc + i.total, 0) || 0) *
										(1 - (formData.desconto_pontual || 0) / 100) +
										(formData.taxa_extra || 0)
								)}
							</p>
						</div>
					</div>
					<div className='flex justify-end gap-3'>
						<button
							onClick={() => setIsModalOpen(false)}
							className='text-slate-500 hover:text-slate-700 font-medium px-4 text-sm'
						>
							Cancelar
						</button>
						<button
							onClick={handleSave}
							className='bg-indigo-600 text-white px-6 py-2.5 rounded-[10px] hover:bg-indigo-700 font-bold shadow-md text-sm'
						>
							Salvar Ordem
						</button>
					</div>
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
