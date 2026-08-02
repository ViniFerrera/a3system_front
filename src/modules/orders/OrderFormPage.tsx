import React, { useState, useMemo, useEffect, useRef } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { Order, Client, PriceRule } from "@/types";
import { Utils } from "@/utils";
import { api } from "@/services/api";
import { useLoading } from "@/components/ui/LoadingOverlay";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ItemGrid } from "./ItemGrid";
import { SearchableSelect } from "./SearchableSelect";
import { SuggestionCards } from "./SuggestionCards";
import { ProgressRail, Etapa, EtapaId } from "./ProgressRail";
import { OrderPreset, RecentItem } from "./presetTypes";
import { EditableItem, toEditableItem, createEmptyItem } from "./itemOptions";

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
export interface RascunhoState {
	formData: Partial<Order>;
	gridItems: EditableItem[];
	filesToUpload: File[];
}

// Rascunho é qualquer coisa que o usuário já tenha preenchido. Fica fora do
// componente para os dois caminhos de descarte (sair da página e "nova ordem"
// vinda da topbar/paleta) usarem exatamente a mesma régua.
export const temRascunho = (estado: RascunhoState) =>
	!!estado.formData.cliente_id ||
	!!estado.formData.descricao ||
	estado.gridItems.some((i) => i.servico) ||
	estado.filesToUpload.length > 0;

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

/**
 * Normaliza a resposta do servidor para o formato que a lista consome.
 * Vive aqui porque quem grava a ordem é esta página; `Orders.tsx` importa a
 * mesma função para o refresh manual e para a troca de status.
 */
export const sanitizeOrderResponse = (data: any): Order => {
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

/** Itens da ordem podem chegar como JSON string do banco. */
const parseItens = (order: Order): any[] =>
	typeof order.items === "string" ? JSON.parse(order.items) : order.items || [];

const parseAnexos = (order: Order): any[] =>
	typeof order.anexos === "string" ? JSON.parse(order.anexos) : order.anexos || [];

interface OrderFormPageProps {
	/** Ordem em edição; ausente significa criação. */
	editingOrder: Order | null;
	clients: Client[];
	priceTable: PriceRule[];
	machines: Machine[];
	presets: OrderPreset[];
	debitTaxPercent: number;
	onCancel: () => void;
	/** Grava e sai para a lista. */
	onSaved: (order: Order, modo: "criado" | "editado") => void;
	/** Grava e permanece na página, com formulário limpo. */
	onSavedAndNew: (order: Order) => void;
	onQuickClient: () => void;
	onManagePresets: () => void;
	/**
	 * True enquanto um dos modais auxiliares (cliente rápido, pré-definições,
	 * taxa) está por cima. Congela os atalhos: sem isso, um Ctrl+Enter digitado
	 * dentro deles gravava a ordem por baixo e deixava o diálogo órfão.
	 */
	atalhosBloqueados?: boolean;
	/**
	 * Espelho do rascunho para o pai consultar antes de descartar a página
	 * (o sinal de "nova ordem" da topbar/paleta). Escrito por efeito a cada
	 * render, para não obrigar o pai a re-renderizar por tecla digitada.
	 */
	rascunhoRef?: React.MutableRefObject<RascunhoState | null>;
	/** Cliente recém-criado no modal rápido; o nonce reaplica o mesmo id. */
	clienteRapidoCriado?: { id: number; nonce: number } | null;
}

/**
 * Formulário de ordem em página própria — criação e edição.
 *
 * `formData`, `gridItems`, `filesToUpload`, `isSaving` e `formErrors` vivem
 * aqui de propósito: enquanto moravam no módulo junto da lista, cada tecla
 * digitada reconstruía as até 100 linhas da tabela.
 */
export const OrderFormPage = ({
	editingOrder,
	clients,
	priceTable,
	machines,
	presets,
	debitTaxPercent,
	onCancel,
	onSaved,
	onSavedAndNew,
	onQuickClient,
	onManagePresets,
	atalhosBloqueados = false,
	rascunhoRef,
	clienteRapidoCriado = null,
}: OrderFormPageProps) => {
	const loading = useLoading();
	const toast = useToast();
	const confirm = useConfirm();

	// --- FORM STATE ---
	// Data em hora local (sem sufixo Z): o banco guarda hora local e
	// toISOString() faria a ordem criada após as 21h nascer com a data de amanhã.
	const [formData, setFormData] = useState<Partial<Order>>(() =>
		editingOrder
			? {
					...editingOrder,
					items: parseItens(editingOrder),
					anexos: parseAnexos(editingOrder),
					taxa_extra: editingOrder.taxa_extra || 0,
			  }
			: { ...DEFAULT_NEW_ORDER, data: Utils.localIsoNow() }
	);

	// Itens da ordem em edição. Fonte única da grade — substitui o antigo par
	// "tempItem + formData.items só-leitura".
	//
	// Ordem nova nasce com uma linha: poupa um clique em toda ordem — e ordens
	// de item único são 61,9% do histórico. Linha em branco não vira item:
	// handleSave filtra por `i.servico`.
	const [gridItems, setGridItems] = useState<EditableItem[]>(() =>
		editingOrder
			? parseItens(editingOrder).map((i: any) => toEditableItem(i, priceTable))
			: [createEmptyItem()]
	);

	const [filesToUpload, setFilesToUpload] = useState<File[]>([]);

	// Trava de gravação: impede o segundo clique enquanto o POST está em voo.
	const [isSaving, setIsSaving] = useState(false);
	const [formErrors, setFormErrors] = useState<{ cliente?: string }>({});

	const [recentes, setRecentes] = useState<RecentItem[]>([]);

	// Subtotal dos itens da grade, antes de desconto e taxa.
	const gridSubtotal = useMemo(
		() => gridItems.reduce((acc, i) => acc + (i.total || 0), 0),
		[gridItems]
	);

	// Cliente criado no modal rápido entra no formulário sem o usuário procurar.
	useEffect(() => {
		if (!clienteRapidoCriado) return;
		setFormData((prev) => ({ ...prev, cliente_id: clienteRapidoCriado.id }));
		setFormErrors({});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clienteRapidoCriado?.nonce]);

	// Sugestões do histórico do cliente. Refaz a cada troca de cliente e
	// cancela a resposta anterior, para não sobrescrever com dados velhos.
	useEffect(() => {
		if (!formData.cliente_id) {
			setRecentes([]);
			return;
		}
		let cancelado = false;
		api
			.get(`/clients/${formData.cliente_id}/recent-items?limit=3`)
			.then((res) => {
				if (!cancelado) setRecentes(Array.isArray(res.data) ? res.data : []);
			})
			.catch(() => {
				if (!cancelado) setRecentes([]);
			});
		return () => {
			cancelado = true;
		};
	}, [formData.cliente_id]);

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

	// Espelha o rascunho para o pai. Fora das dependências de propósito: o pai
	// só lê no momento em que precisa decidir se pergunta antes de descartar.
	useEffect(() => {
		if (!rascunhoRef) return;
		rascunhoRef.current = { formData, gridItems, filesToUpload };
	});
	useEffect(() => {
		return () => {
			if (rascunhoRef) rascunhoRef.current = null;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

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
	// Sem `<input type="file">` no formulário hoje, a função fica sem chamador.
	// É a fiação pronta para quando o campo de anexo voltar — não apagar.
	void handleFileUpload;

	// Acrescenta itens de um preset ou de uma sugestão do cliente à grade.
	// Acrescenta em vez de substituir, para permitir empilhar pré-definições.
	const handleAddItems = (novos: any[]) => {
		const convertidos = novos.map((raw) => toEditableItem(raw, priceTable));
		setGridItems((prev) => [...prev, ...convertidos]);
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
			} else {
				const res = await api.post("/orders", dataPayload);
				const mergedData = {
					...formData,
					cliente_nome: client?.nome,
					total,
					...res.data,
				};
				savedOrder = sanitizeOrderResponse(mergedData);
			}
			if (keepOpen) {
				// Fica na página e já pronta para a próxima ordem do balcão.
				setFilesToUpload([]);
				setFormData({
					...DEFAULT_NEW_ORDER,
					data: Utils.localIsoNow(),
				});
				setGridItems([createEmptyItem()]);
				setFormErrors({});
				onSavedAndNew(savedOrder);
			} else {
				// Sai para a lista; o pai grava a ordem e avisa.
				onSaved(savedOrder, editingOrder ? "editado" : "criado");
			}
		} catch (err) {
			console.error(err);
			toast.error("Erro ao salvar a ordem. Nada foi gravado — tente novamente.");
		} finally {
			setIsSaving(false);
			loading.hide();
		}
	};

	// Sair com dados preenchidos pede confirmação — o preenchimento não pode
	// evaporar sem aviso.
	const aoCancelar = async () => {
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
		onCancel();
	};

	// Atalhos válidos só enquanto nenhum diálogo auxiliar está por cima.
	useEffect(() => {
		if (atalhosBloqueados) return;
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
		atalhosBloqueados,
		formData,
		gridItems,
		filesToUpload,
		isSaving,
		editingOrder,
		clients,
	]);

	const clientOptionsForForm = useMemo(
		() => clients.map((c) => ({ id: Number(c.id), label: c.nome })),
		[clients]
	);

	const clienteAtual = useMemo(
		() => clients.find((c) => c.id == formData.cliente_id),
		[clients, formData.cliente_id]
	);

	// A trilha é informativa. A única exigência real para salvar continua sendo
	// o cliente — "Descrição" cinza não pode sugerir que trava o salvamento.
	const etapas: Etapa[] = useMemo(() => {
		const itensValidos = gridItems.filter((i) => i.servico && (i.total || 0) > 0);
		return [
			{
				id: "cliente",
				label: "Cliente",
				completa: !!formData.cliente_id,
				resumo: clienteAtual?.nome,
			},
			{
				id: "pagamento",
				label: "Pagamento",
				completa: !!formData.status_pagamento && !!formData.forma_pagamento,
				resumo: [formData.status_pagamento, formData.forma_pagamento].filter(Boolean).join(" · "),
			},
			{
				id: "descricao",
				label: "Descrição",
				completa: !!formData.descricao?.trim(),
				opcional: true,
			},
			{
				id: "material",
				label: "Material",
				completa: itensValidos.length > 0,
				resumo: itensValidos.length > 0 ? `${itensValidos.length} item(ns)` : undefined,
			},
		];
	}, [
		formData.cliente_id,
		formData.status_pagamento,
		formData.forma_pagamento,
		formData.descricao,
		gridItems,
		clienteAtual,
	]);

	const refCliente = useRef<HTMLElement>(null);
	const refPagamento = useRef<HTMLElement>(null);
	const refDescricao = useRef<HTMLElement>(null);
	const refMaterial = useRef<HTMLElement>(null);

	const irParaSecao = (id: EtapaId) => {
		const alvo = {
			cliente: refCliente,
			pagamento: refPagamento,
			descricao: refDescricao,
			material: refMaterial,
		}[id];
		alvo.current?.scrollIntoView({ behavior: "smooth", block: "start" });
	};

	const secao = "bg-white border border-slate-200/70 rounded-2xl shadow-card p-5";

	return (
		<div className='flex flex-col gap-4'>
			<div className='flex items-center gap-3'>
				<Button
					variant='ghost'
					size='sm'
					icon={<ArrowLeft className='w-4 h-4' />}
					onClick={aoCancelar}
				>
					Voltar
				</Button>
				<h2 className='text-lg font-bold text-ink'>
					{editingOrder ? `Editar ordem #${editingOrder.id}` : "Nova ordem"}
				</h2>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-5 items-start'>
				<div className='lg:sticky lg:top-20'>
					<ProgressRail etapas={etapas} onIr={irParaSecao} />
				</div>

				<div className='space-y-5'>
					{/* CLIENTE E DATA */}
					<section ref={refCliente} className={secao}>
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
									onClick={onQuickClient}
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
					</section>

					{/* PAGAMENTO — sem colapso: na página há espaço para tudo à vista. */}
					<section ref={refPagamento} className={secao}>
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
					</section>

					{/* DESCRIÇÃO */}
					<section ref={refDescricao} className={secao}>
						<label className='block text-xs font-bold text-slate-500 uppercase mb-1.5'>
							Descrição Detalhada
						</label>
						<textarea
							rows={3}
							className='w-full border border-slate-200 rounded-[10px] p-3 text-sm'
							value={formData.descricao}
							onChange={(e) =>
								setFormData({ ...formData, descricao: e.target.value })
							}
						/>
					</section>

					{/* MATERIAL: sugestões + grade editável de itens */}
					<section ref={refMaterial} className={`${secao} space-y-4`}>
						<SuggestionCards
							presets={presets}
							recentes={recentes}
							clienteNome={clienteAtual?.nome}
							onAddItems={handleAddItems}
							onManage={onManagePresets}
						/>
						<ItemGrid
							items={gridItems}
							priceTable={priceTable}
							machines={machines}
							onChange={setGridItems}
						/>
					</section>
				</div>
			</div>

			{/* RODAPÉ GRUDADO: desconto, total e ações.
			    `sticky` em vez de `fixed`: a barra acompanha a coluna de conteúdo
			    sozinha. A versão anterior partia de `lg:left-[220px]`, a largura
			    da sidebar aberta — com o menu recolhido (64px) sobrava uma faixa
			    de conteúdo rolando a descoberto à esquerda da barra.
			    As margens negativas cancelam o padding do <main> para a barra
			    sangrar de ponta a ponta da área de conteúdo. */}
			<div className='sticky bottom-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-3 bg-white/95 backdrop-blur border-t border-slate-200'>
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
						<Button variant='ghost' onClick={aoCancelar}>
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
			</div>
		</div>
	);
};
