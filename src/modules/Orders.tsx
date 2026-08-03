import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Modal } from "@/components/ui/Modal";
import { Utils } from "@/utils";
import { Order, Client, PriceRule } from "@/types";
import { OrderFilterPayload } from "@/components/shortcuts/shortcutTypes";
import { api } from "@/services/api";
import { useLoading } from "@/components/ui/LoadingOverlay";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { OrderPreset } from "./orders/presetTypes";
import { PresetManagerModal } from "./orders/PresetManagerModal";
import { OrdersList } from "./orders/OrdersList";
import {
	OrderFormPage,
	RascunhoState,
	temRascunho,
	sanitizeOrderResponse,
} from "./orders/OrderFormPage";

interface Machine {
	id: number;
	nome: string;
	tipo: string;
}

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
}) => {
	// Vista atual do módulo. O formulário é página, não modal — foi assim que a
	// digitação parou de re-renderizar a lista inteira.
	const [view, setView] = useState<"list" | "form">("list");
	const [editingOrder, setEditingOrder] = useState<Order | null>(null);
	// Nonce de montagem: cada abertura recria o `OrderFormPage` do zero, para o
	// estado interno nascer limpo mesmo quando já estávamos na página.
	const [formNonce, setFormNonce] = useState(0);

	const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
	const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
	const [isPresetManagerOpen, setIsPresetManagerOpen] = useState(false);
	const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
	const [machinesList, setMachinesList] = useState<Machine[]>(machinery);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [presets, setPresets] = useState<OrderPreset[]>([]);

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
	// Cliente recém-criado no modal rápido. O nonce faz o formulário reagir
	// mesmo quando o mesmo cliente é criado duas vezes seguidas.
	const [clienteRapidoCriado, setClienteRapidoCriado] = useState<{
		id: number;
		nonce: number;
	} | null>(null);

	// Filtros de Data — últimos 30 dias por padrão.
	const [filterStart, setFilterStart] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() - 30);
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
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

	// --- FUNÇÃO DE REFRESH MANUAL (PONTO 3) ---
	const handleRefreshOrders = useCallback(async () => {
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
	}, [loading, setOrders, toast]);

	const filteredOrders = useMemo(() => {
		return orders.filter((o) => {
			// Data efetiva: se PAGO, a data do pagamento; senão, a de criação.
			// Extrai YYYY-MM-DD direto da string (hora local, sem converter para UTC).
			const effective = Utils.effectiveOrderDate(o);
			const orderDateString = effective ? effective.split("T")[0] : "";
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

		return {
			totalOrders,
			openOrdersSnapshot,
			completedOrdersSnapshot,
			avgTimeDisplay,
		};
	}, [filteredOrders]);

	const uniqueServices = useMemo(
		() => [...new Set(priceTable.map((p) => p.Servico))].sort(),
		[priceTable]
	);

	const reloadPresets = useCallback(() => {
		api
			.get("/order-presets")
			.then((res) => setPresets(Array.isArray(res.data) ? res.data : []))
			.catch(console.error);
	}, []);

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
			// Idem para data_pagamento: só grava ao ENTRAR em PAGO; ao sair,
			// limpa para não reaproveitar uma data velha num pagamento futuro.
			// O `undefined` aqui não é cosmético: `order` (com o data_pagamento
			// antigo) é espalhado no body do PUT abaixo ANTES de finalUpdates. Sem
			// isto, esse valor velho seria reenviado como valor explícito, e o
			// backend o aceita com prioridade sobre o próprio fallback de
			// "saiu de PAGO" — ou seja, removê-la reintroduziria o bug de datas
			// obsoletas que essa coluna existe para evitar.
			if (updates.status_pagamento === "PAGO" && order.status_pagamento !== "PAGO") {
				finalUpdates.data_pagamento = Utils.localIsoNow();
			} else if (updates.status_pagamento && updates.status_pagamento !== "PAGO" && order.status_pagamento === "PAGO") {
				finalUpdates.data_pagamento = undefined;
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
			// O formulário vive na página; o id do cliente novo chega por prop.
			setClienteRapidoCriado({ id: res.data.id, nonce: Date.now() });
			setIsQuickClientOpen(false);
			setQuickClientData({ nome: "", telefone: "", email: "" });
		} catch (e) {
			toast.error("Erro ao criar o cliente.");
		}
	};

	// Abre a página de formulário. Sem `order`, é criação.
	const abrirFormulario = useCallback((order?: Order) => {
		setEditingOrder(order || null);
		// Zera o cliente rápido: sem isso, a próxima abertura montaria já com o
		// cliente criado na sessão anterior do formulário.
		setClienteRapidoCriado(null);
		setFormNonce((n) => n + 1);
		setView("form");
	}, []);

	// "Nova Ordem" na barra de filtros — abre o formulário sem ordem em edição.
	const handleNewOrder = useCallback(() => abrirFormulario(), [abrirFormulario]);
	const handleOpenConfig = useCallback(() => setIsConfigModalOpen(true), []);
	const handleQuickClient = useCallback(() => setIsQuickClientOpen(true), []);
	const handleManagePresets = useCallback(() => setIsPresetManagerOpen(true), []);

	// Salvar volta para a lista; os filtros e a página atual continuam
	// no estado deste componente e por isso sobrevivem à ida e à volta.
	const aoSalvar = useCallback((salva: Order, modo: "criado" | "editado") => {
		setOrders((prev: Order[]) =>
			modo === "criado" ? [salva, ...prev] : prev.map((o) => (o.id === salva.id ? salva : o))
		);
		setEditingOrder(null);
		setView("list");
		toast.success(modo === "criado" ? `Ordem #${salva.id} criada.` : `Ordem #${salva.id} atualizada.`);
	}, [setOrders, toast]);

	// "Salvar e nova": grava e permanece na página, já pronta para a próxima.
	const aoSalvarENova = useCallback((salva: Order) => {
		setOrders((prev: Order[]) => [salva, ...prev]);
		toast.success(`Ordem #${salva.id} criada.`);
	}, [setOrders, toast]);

	const aoCancelarFormulario = useCallback(() => {
		setEditingOrder(null);
		setView("list");
	}, []);

	// Espelho do estado do formulário, escrito pela própria página. Existe para
	// o efeito do `newOrderSignal` saber se há trabalho a perder sem depender do
	// conteúdo digitado — se dependesse, re-rodaria a cada tecla e perguntaria
	// sozinho no meio do preenchimento.
	const rascunhoRef = useRef<RascunhoState | null>(null);
	const formStateRef = useRef({ view, editingOrder });
	useEffect(() => {
		formStateRef.current = { view, editingOrder };
	});

	// Abre o formulário quando a topbar/paleta/atalho pede "nova ordem".
	// Ignora o valor inicial 0 para não abrir sozinho no primeiro render.
	//
	// Com a página aberta e algo em jogo — rascunho novo ou edição de uma ordem
	// existente —, pergunta antes: remontar a página faz o reset completo e não
	// há como voltar atrás depois dele. Recusando, nada é tocado.
	useEffect(() => {
		if (newOrderSignal <= 0) return;
		// Um sinal mais novo (ou uma recusa) não pode abrir o formulário depois
		// que este efeito já foi substituído — o módulo nunca desmonta.
		let cancelado = false;
		const pedirNovaOrdem = async () => {
			const atual = formStateRef.current;
			const rascunho = rascunhoRef.current;
			const emJogo =
				atual.view === "form" &&
				(!!atual.editingOrder || (!!rascunho && temRascunho(rascunho)));
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
			abrirFormulario();
		};
		pedirNovaOrdem();
		return () => {
			cancelado = true;
		};
		// Depende só do sinal, de propósito: `confirm` é estável e o resto do
		// estado é lido pelos refs.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [newOrderSignal]);

	// Aplica o filtro que veio de um atalho. Volta para a lista, porque o filtro
	// só faz sentido lá — e voltar desmonta o formulário, então passa pela mesma
	// régua de descarte dos outros caminhos: edição aberta ou rascunho com
	// conteúdo pergunta antes. Recusando, o filtro NÃO é aplicado e o formulário
	// fica intacto.
	//
	// Depende do nonce: o App zera `pendingOrderFilter` no callback, então o
	// mesmo atalho clicado duas vezes seguidas volta a passar por aqui.
	useEffect(() => {
		if (!pendingOrderFilter) return;
		// Congela o payload: o efeito é assíncrono e `pendingOrderFilter` pode
		// ser zerado pelo App antes de chegarmos aos setters.
		const filtro = pendingOrderFilter;
		let cancelado = false;

		const aplicarFiltro = async () => {
			const atual = formStateRef.current;
			const rascunho = rascunhoRef.current;
			const emJogo =
				atual.view === "form" &&
				(!!atual.editingOrder || (!!rascunho && temRascunho(rascunho)));
			if (emJogo) {
				const ok = await confirm({
					title: "Descartar e aplicar o filtro salvo?",
					message: atual.editingOrder
						? `As alterações da ordem #${atual.editingOrder.id} serão perdidas.`
						: "O que você preencheu será perdido.",
					confirmLabel: "Aplicar filtro",
					cancelLabel: "Continuar editando",
					danger: true,
				});
				if (!ok) {
					// Mesmo recusando, o pendente precisa ser consumido: senão o
					// atalho fica pendurado no App e dispara sozinho depois.
					onPendingFilterApplied?.();
					return;
				}
			}
			if (cancelado) return;
			setFilterStart(filtro.filterStart);
			setFilterEnd(filtro.filterEnd);
			setFilterClient(filtro.filterClient);
			setFilterServices(filtro.filterServices);
			setFilterPaymentStatus(filtro.filterPaymentStatus);
			setFilterOrderStatus(filtro.filterOrderStatus);
			setFilterNF(filtro.filterNF);
			setCurrentPage(1);
			setView("list");
			onPendingFilterApplied?.();
		};
		aplicarFiltro();
		return () => {
			cancelado = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [pendingOrderFilter?.nonce]);

	// Os três diálogos auxiliares abrem POR CIMA da página; enquanto um deles
	// estiver aberto, os atalhos do formulário ficam congelados.
	const atalhosBloqueados =
		isQuickClientOpen || isPresetManagerOpen || isConfigModalOpen;

	return (
		<div className='flex flex-col space-y-4 sm:space-y-6 pb-12'>
			{view === "form" ? (
				/* PÁGINA DE FORMULÁRIO — `key` força estado limpo a cada abertura. */
				<OrderFormPage
					key={`${editingOrder ? editingOrder.id : "novo"}-${formNonce}`}
					editingOrder={editingOrder}
					clients={clients}
					priceTable={priceTable}
					machines={machinesList}
					presets={presets}
					debitTaxPercent={debitTaxPercent}
					onCancel={aoCancelarFormulario}
					onSaved={aoSalvar}
					onSavedAndNew={aoSalvarENova}
					onQuickClient={handleQuickClient}
					onManagePresets={handleManagePresets}
					atalhosBloqueados={atalhosBloqueados}
					rascunhoRef={rascunhoRef}
					clienteRapidoCriado={clienteRapidoCriado}
				/>
			) : (
				/* VISTA DE LISTA — os estados de filtro e paginação continuam aqui e
				   descem por prop, para sobreviverem à ida e à volta do formulário. */
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
					onEditOrder={abrirFormulario}
					onDelete={handleDelete}
					onUpdateStatus={updateStatus}
					onRefresh={handleRefreshOrders}
					onOpenConfig={handleOpenConfig}
					onedriveConfig={onedriveConfig}
					isRefreshing={isRefreshing}
				/>
			)}

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
