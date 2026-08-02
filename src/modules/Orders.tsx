import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Utils } from "@/utils";
import { Order, Client, PriceRule } from "@/types";
import { Plus, ChevronDown, CreditCard } from "lucide-react";
import { OrderFilterPayload } from "@/components/shortcuts/shortcutTypes";
import { api } from "@/services/api";
import { useLoading } from "@/components/ui/LoadingOverlay";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Input } from "@/components/ui/Field";
import { ItemGrid } from "./orders/ItemGrid";
import { PresetBar, OrderPreset } from "./orders/PresetBar";
import { PresetManagerModal } from "./orders/PresetManagerModal";
import { EditableItem, toEditableItem, createEmptyItem } from "./orders/itemOptions";
import { SearchableSelect } from "./orders/SearchableSelect";
import { OrdersList } from "./orders/OrdersList";

interface Machine {
	id: number;
	nome: string;
	tipo: string;
}

// Limite por arquivo. O servidor recusa acima disso; validar aqui evita
// esperar um upload de 40MB só para receber erro.
const MAX_FILE_MB = 25;
const EXT_PERMITIDAS = [
	"pdf", "jpg", "jpeg", "png", "gif", "webp", "svg", "ai", "cdr", "psd", "eps",
	"doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip", "rar",
];

/** Estado do formulário que decide se há algo a perder ao trocar de ordem. */
interface RascunhoState {
	formData: Partial<Order>;
	gridItems: EditableItem[];
	filesToUpload: File[];
}

// Rascunho é qualquer coisa que o usuário já tenha preenchido. Fica fora do
// componente para os dois caminhos de descarte (fechar o modal e "nova ordem"
// vinda da topbar/paleta) usarem exatamente a mesma régua.
const temRascunho = (estado: RascunhoState) =>
	!!estado.formData.cliente_id ||
	!!estado.formData.descricao ||
	estado.gridItems.some((i) => i.servico) ||
	estado.filesToUpload.length > 0;

// Defaults de ordem nova: 99,5% das ordens são PAGO e 63,2% em PIX.
// Aplicam-se só à criação — edição preserva o que está gravado.
// Fica fora do componente para ter identidade estável nas dependências dos
// `useCallback` que reabrem o formulário.
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

export const OrderModule = ({
	clients,
	priceTable,
	orders,
	setOrders,
	onStockUpdate,
	machinery = [],
	setClients,
	newOrderSignal = 0,
	pendingOrderFilter = null,
	onPendingFilterApplied,
	onSaveFilterAsShortcut,
}: {
	clients: Client[];
	priceTable: PriceRule[];
	orders: Order[];
	setOrders: Function;
	onStockUpdate: Function;
	machinery?: Machine[];
	setClients: Function;
	newOrderSignal?: number;
	/** Filtro congelado num atalho, entregue pelo App com um nonce novo a cada clique. */
	pendingOrderFilter?: (OrderFilterPayload & { nonce: number }) | null;
	onPendingFilterApplied?: () => void;
	onSaveFilterAsShortcut?: (p: OrderFilterPayload) => void;
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

	// Os quatro handlers abaixo descem até `OrderRow`, que é memoizado: sem
	// identidade estável, memoizar a linha não serviria de nada.
	const handleDelete = useCallback(async (id: number) => {
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
	}, [confirm, setOrders, toast]);

	// Alterna a linha expandida. A regra é a mesma de antes — clicar na linha
	// já aberta fecha —, só que resolvida pelo estado anterior.
	const handleToggleExpand = useCallback((id: number) => {
		setExpandedOrderId((prev) => (prev === id ? null : id));
	}, []);

	const updateStatus = useCallback(async (order: Order, updates: Partial<Order>) => {
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
	}, [confirm, loading, toast, setOrders, onStockUpdate]);

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

	const openModal = useCallback((order?: Order) => {
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
	}, [priceTable]);

	// "Nova Ordem" na barra de filtros — abre o formulário sem ordem em edição.
	const handleNewOrder = useCallback(() => openModal(), [openModal]);
	const handleOpenConfig = useCallback(() => setIsConfigModalOpen(true), []);

	// Fechar com dados preenchidos pede confirmação — hoje o preenchimento
	// evapora sem aviso.
	const handleCloseModal = async () => {
		const temConteudo = temRascunho({ formData, gridItems, filesToUpload });
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

	// Espelho do formulário para o efeito abaixo consultar sem depender dele.
	// Se `formData`/`gridItems` entrassem nas dependências, o efeito re-rodaria
	// a cada tecla digitada e perguntaria sozinho no meio do preenchimento.
	const formStateRef = useRef({
		isModalOpen,
		editingOrder,
		formData,
		gridItems,
		filesToUpload,
	});
	useEffect(() => {
		formStateRef.current = {
			isModalOpen,
			editingOrder,
			formData,
			gridItems,
			filesToUpload,
		};
	});

	// Abre o formulário quando a topbar/paleta/atalho pede "nova ordem".
	// Ignora o valor inicial 0 para não abrir sozinho no primeiro render.
	//
	// Com o formulário aberto e algo em jogo — rascunho novo ou edição de uma
	// ordem existente —, pergunta antes: `openModal()` faz o reset completo e
	// não há como voltar atrás depois dele. Recusando, nada é tocado.
	useEffect(() => {
		if (newOrderSignal <= 0) return;
		// Um sinal mais novo (ou uma recusa) não pode abrir o formulário depois
		// que este efeito já foi substituído — o módulo nunca desmonta.
		let cancelado = false;
		const pedirNovaOrdem = async () => {
			const atual = formStateRef.current;
			const emJogo =
				atual.isModalOpen && (!!atual.editingOrder || temRascunho(atual));
			if (emJogo) {
				const ok = await confirm({
					title: "Descartar e começar uma ordem nova?",
					message: atual.editingOrder
						? `As alterações da ordem #${atual.editingOrder.id} serão perdidas.`
						: "O que você preencheu será perdido.",
					confirmLabel: "Começar nova",
					cancelLabel: "Continuar editando",
					danger: true,
				});
				if (!ok) return;
			}
			if (cancelado) return;
			openModal();
		};
		pedirNovaOrdem();
		return () => {
			cancelado = true;
		};
		// Depende só do sinal, de propósito: `confirm` é estável e o resto do
		// estado é lido pelo ref.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [newOrderSignal]);

	// Aplica o filtro que veio de um atalho. Mexe só nos estados de filtro e na
	// paginação — nada aqui toca no formulário, então clicar num atalho salvo
	// nunca dispara a pergunta de descartar rascunho acima.
	//
	// Depende do nonce: o App zera `pendingOrderFilter` no callback, então o
	// mesmo atalho clicado duas vezes seguidas volta a passar por aqui.
	useEffect(() => {
		if (!pendingOrderFilter) return;
		setFilterStart(pendingOrderFilter.filterStart);
		setFilterEnd(pendingOrderFilter.filterEnd);
		setFilterClient(pendingOrderFilter.filterClient);
		setFilterServices(pendingOrderFilter.filterServices);
		setFilterPaymentStatus(pendingOrderFilter.filterPaymentStatus);
		setFilterOrderStatus(pendingOrderFilter.filterOrderStatus);
		setFilterNF(pendingOrderFilter.filterNF);
		setCurrentPage(1);
		onPendingFilterApplied?.();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pendingOrderFilter?.nonce]);

	const clientOptionsForForm = useMemo(
		() => clients.map((c) => ({ id: Number(c.id), label: c.nome })),
		[clients]
	);

	return (
		<div className='flex flex-col space-y-4 sm:space-y-6 pb-12'>
			{/* VISTA DE LISTA — os estados de filtro e paginação continuam aqui e
			    descem por prop, para sobreviverem à ida e à volta do formulário. */}
			<OrdersList
				orders={orders}
				clients={clients}
				filteredOrders={filteredOrders}
				paginatedOrders={paginatedOrders}
				summary={summary}
				uniqueServices={uniqueServices}
				filterStart={filterStart}
				setFilterStart={setFilterStart}
				filterEnd={filterEnd}
				setFilterEnd={setFilterEnd}
				filterClient={filterClient}
				setFilterClient={setFilterClient}
				filterServices={filterServices}
				setFilterServices={setFilterServices}
				filterPaymentStatus={filterPaymentStatus}
				setFilterPaymentStatus={setFilterPaymentStatus}
				filterOrderStatus={filterOrderStatus}
				setFilterOrderStatus={setFilterOrderStatus}
				filterNF={filterNF}
				setFilterNF={setFilterNF}
				currentPage={currentPage}
				setCurrentPage={setCurrentPage}
				pageSize={pageSize}
				setPageSize={setPageSize}
				expandedOrderId={expandedOrderId}
				onToggleExpand={handleToggleExpand}
				onNewOrder={handleNewOrder}
				onEditOrder={openModal}
				onDelete={handleDelete}
				onUpdateStatus={updateStatus}
				onRefresh={handleRefreshOrders}
				onOpenConfig={handleOpenConfig}
				onSaveFilterAsShortcut={onSaveFilterAsShortcut}
				onedriveConfig={onedriveConfig}
				isRefreshing={isRefreshing}
			/>

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
						<p className='text-2xs text-slate-400 mt-1'>
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
