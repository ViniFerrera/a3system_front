import React, { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowLeft, Plus, MessageSquare, ShoppingCart } from "lucide-react";
import { Orcamento, OrcamentoVersao, Client, PriceRule, Order } from "@/types";
import { Utils } from "@/utils";
import { api } from "@/services/api";
import { useLoading } from "@/components/ui/LoadingOverlay";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input, Textarea } from "@/components/ui/Field";
import { ItemGrid } from "./ItemGrid";
import { SearchableSelect } from "./SearchableSelect";
import { SuggestionCards } from "./SuggestionCards";
import { OrcamentoVersionCard } from "./OrcamentoVersionCard";
import { EditableItem, toEditableItem, createEmptyItem } from "./itemOptions";
import { OrderPreset, RecentItem } from "./presetTypes";

interface Machine {
	id: number;
	nome: string;
	tipo: string;
}

interface OrcamentoFormPageProps {
	editingOrcamento: Orcamento | null;
	clients: Client[];
	priceTable: PriceRule[];
	machines: Machine[];
	presets: OrderPreset[];
	onCancel: () => void;
	onSaved: (orc: Orcamento, modo: "criado" | "editado") => void;
	onConverted: (novaOrdem: Order, orcamentoId: number) => void;
}

export const OrcamentoFormPage = ({
	editingOrcamento,
	clients,
	priceTable,
	machines,
	presets,
	onCancel,
	onSaved,
	onConverted,
}: OrcamentoFormPageProps) => {
	const loading = useLoading();
	const toast = useToast();
	const confirm = useConfirm();

	// Estado interno do orçamento — null enquanto ainda não foi salvo (criação)
	const [orcamento, setOrcamento] = useState<Orcamento | null>(null);
	const [isLoadingFull, setIsLoadingFull] = useState(false);
	const [selectedVersaoId, setSelectedVersaoId] = useState<number | null>(null);

	// Campos do formulário
	const [formData, setFormData] = useState({
		cliente_id: editingOrcamento?.cliente_id ?? 0,
		descricao: editingOrcamento?.descricao ?? "",
		data: editingOrcamento?.data
			? editingOrcamento.data.split("T")[0]
			: new Date().toISOString().split("T")[0],
	});

	const [gridItems, setGridItems] = useState<EditableItem[]>([createEmptyItem()]);
	const [isSaving, setIsSaving] = useState(false);
	const [formErrors, setFormErrors] = useState<{ cliente?: string }>({});
	const [recentes, setRecentes] = useState<RecentItem[]>([]);

	// Carrega histórico completo quando editando um orçamento existente
	useEffect(() => {
		if (!editingOrcamento?.id) return;
		setIsLoadingFull(true);
		api
			.get(`/orcamentos/${editingOrcamento.id}`)
			.then((res) => {
				setOrcamento(res.data);
				const versoes: OrcamentoVersao[] = res.data.versoes ?? [];
				const newest = [...versoes].sort((a, b) => b.versao - a.versao)[0];
				if (newest?.id) setSelectedVersaoId(newest.id);
			})
			.catch(() => toast.error("Erro ao carregar orçamento."))
			.finally(() => setIsLoadingFull(false));
	}, [editingOrcamento?.id]);

	// Sincroniza grid com a versão selecionada
	useEffect(() => {
		if (!orcamento || !selectedVersaoId) return;
		const versao = (orcamento.versoes ?? []).find((v) => v.id === selectedVersaoId);
		if (!versao) return;
		const itens = versao.itens ?? [];
		setGridItems(
			itens.length > 0
				? itens.map((i) => toEditableItem(i, priceTable))
				: [createEmptyItem()]
		);
	}, [selectedVersaoId, orcamento?.id]);

	// Itens recentes do cliente selecionado
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

	const gridSubtotal = useMemo(
		() => gridItems.reduce((acc, i) => acc + (i.total || 0), 0),
		[gridItems]
	);

	const clientOptions = useMemo(
		() => clients.map((c) => ({ id: Number(c.id), label: c.nome })),
		[clients]
	);

	const clienteAtual = useMemo(
		() => clients.find((c) => Number(c.id) === formData.cliente_id),
		[clients, formData.cliente_id]
	);

	const versoesCrono = useMemo(
		() => [...(orcamento?.versoes ?? [])].sort((a, b) => b.versao - a.versao),
		[orcamento?.versoes]
	);

	const totalByVersaoNum = useMemo(() => {
		const m = new Map<number, number>();
		for (const v of orcamento?.versoes ?? []) m.set(v.versao, v.total);
		return m;
	}, [orcamento?.versoes]);

	const isConvertido = orcamento?.status === "CONVERTIDO";

	const itensPayload = () =>
		gridItems
			.filter((i) => i.servico)
			.map(({ _key, ...item }) => item);

	const handleAddItems = useCallback(
		(novos: any[]) => {
			const convertidos = novos.map((raw) => toEditableItem(raw, priceTable));
			setGridItems((prev) => [...prev, ...convertidos]);
		},
		[priceTable]
	);

	const formatWhatsApp = useCallback(() => {
		const dataFmt = formData.data
			? Utils.formatDate(formData.data)
			: Utils.formatDate(new Date().toISOString().split("T")[0]);
		const itensValidos = gridItems.filter((i) => i.servico);
		const linhas = itensValidos
			.map(
				(i) =>
					`• ${Utils.displayName(i.servico)} - ${Utils.displayName(i.material)} (${i.quantidade} unid.) — ${Utils.formatCurrency(i.total)}`
			)
			.join("\n");
		return `🖨️ *Orçamento A3 System*\nCliente: ${clienteAtual?.nome ?? "—"}\nData: ${dataFmt}\n\n📋 *Serviços:*\n${linhas}\n\n💰 *Total: ${Utils.formatCurrency(gridSubtotal)}*`;
	}, [clienteAtual, formData.data, gridItems, gridSubtotal]);

	const handleCopiarWhatsApp = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(formatWhatsApp());
			toast.success("Copiado para o clipboard!");
		} catch {
			toast.error("Não foi possível copiar.");
		}
	}, [formatWhatsApp, toast]);

	// CRIAR novo orçamento (primeira versão)
	const handleCriar = async () => {
		if (!formData.cliente_id) {
			setFormErrors({ cliente: "Selecione um cliente" });
			toast.error("Selecione um cliente antes de salvar.");
			return;
		}
		setFormErrors({});
		setIsSaving(true);
		loading.show("Criando orçamento...");
		try {
			const res = await api.post("/orcamentos", {
				cliente_id: formData.cliente_id,
				cliente_nome: clienteAtual?.nome ?? "Desconhecido",
				descricao: formData.descricao,
				itens: JSON.stringify(itensPayload()),
				total: gridSubtotal,
			});
			const criado: Orcamento = res.data;
			setOrcamento(criado);
			const primeiraVersao = (criado.versoes ?? [])[0];
			if (primeiraVersao?.id) setSelectedVersaoId(primeiraVersao.id);
			onSaved(criado, "criado");
			toast.success(`Orçamento #${criado.id} criado.`);
		} catch {
			toast.error("Erro ao criar o orçamento.");
		} finally {
			setIsSaving(false);
			loading.hide();
		}
	};

	// NOVA VERSÃO
	const handleNovaVersao = async () => {
		if (!orcamento?.id) return;
		setIsSaving(true);
		loading.show("Criando nova versão...");
		try {
			const res = await api.post(`/orcamentos/${orcamento.id}/versoes`, {
				itens: JSON.stringify(itensPayload()),
				total: gridSubtotal,
			});
			const novaVersao: OrcamentoVersao = res.data;
			const updated: Orcamento = {
				...orcamento,
				versoes: [...(orcamento.versoes ?? []), novaVersao],
				versao_count: (orcamento.versao_count ?? 1) + 1,
				total_atual: novaVersao.total,
			};
			setOrcamento(updated);
			onSaved(updated, "editado");
			setSelectedVersaoId(novaVersao.id ?? null);
			toast.success(`Versão ${novaVersao.versao} criada.`);
		} catch {
			toast.error("Erro ao criar nova versão.");
		} finally {
			setIsSaving(false);
			loading.hide();
		}
	};

	// ATUALIZAR versão atual in-place
	const handleAtualizarVersao = async () => {
		if (!orcamento?.id || !selectedVersaoId) return;
		setIsSaving(true);
		loading.show("Atualizando versão...");
		try {
			const res = await api.put(
				`/orcamentos/${orcamento.id}/versoes/${selectedVersaoId}`,
				{ itens: JSON.stringify(itensPayload()), total: gridSubtotal }
			);
			const updated: Orcamento = {
				...orcamento,
				versoes: (orcamento.versoes ?? []).map((v) =>
					v.id === selectedVersaoId ? { ...res.data } : v
				),
				total_atual: gridSubtotal,
			};
			setOrcamento(updated);
			onSaved(updated, "editado");
			toast.success("Versão atualizada.");
		} catch {
			toast.error("Erro ao atualizar versão.");
		} finally {
			setIsSaving(false);
			loading.hide();
		}
	};

	// EXCLUIR versão
	const handleExcluirVersao = async (versaoId: number) => {
		if (!orcamento?.id) return;
		const ok = await confirm({
			title: "Excluir esta versão?",
			message: "Esta ação não pode ser desfeita.",
			confirmLabel: "Excluir",
			danger: true,
		});
		if (!ok) return;
		try {
			await api.delete(`/orcamentos/${orcamento.id}/versoes/${versaoId}`);
			const versoesRestantes = (orcamento.versoes ?? []).filter(
				(v) => v.id !== versaoId
			);
			const sorted = [...versoesRestantes].sort((a, b) => b.versao - a.versao);
			const updated: Orcamento = {
				...orcamento,
				versoes: versoesRestantes,
				versao_count: versoesRestantes.length,
				total_atual: sorted[0]?.total ?? 0,
			};
			setOrcamento(updated);
			onSaved(updated, "editado");
			setSelectedVersaoId(sorted[0]?.id ?? null);
			toast.success("Versão excluída.");
		} catch (e: any) {
			toast.error(e?.response?.data?.error ?? "Erro ao excluir versão.");
		}
	};

	// CONVERTER em ordem
	const handleConverter = async () => {
		if (!orcamento?.id) return;
		const ok = await confirm({
			title: "Converter orçamento em ordem?",
			message:
				"Uma nova ordem será criada com os itens da versão mais recente. O orçamento ficará marcado como CONVERTIDO.",
			confirmLabel: "Criar Ordem",
		});
		if (!ok) return;
		loading.show("Convertendo orçamento...");
		try {
			const res = await api.post(`/orcamentos/${orcamento.id}/converter`);
			onConverted(res.data, orcamento.id!);
			toast.success(`Ordem #${res.data.id} criada com sucesso.`);
		} catch (e: any) {
			toast.error(e?.response?.data?.error ?? "Erro ao converter orçamento.");
		} finally {
			loading.hide();
		}
	};

	const secao = "bg-white border border-slate-200/70 rounded-xl shadow-card p-4";
	const rotulo = "block text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5";

	if (isLoadingFull) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="w-8 h-8 rounded-full border-[3px] border-violet-500/30 border-t-violet-500 animate-spin" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 lg:sticky lg:top-4 lg:h-[calc(100dvh_-_6.5rem)] lg:-mb-8">
			{/* CABEÇALHO */}
			<div className="flex items-center gap-3 flex-shrink-0 flex-wrap">
				<Button
					variant="ghost"
					size="sm"
					icon={<ArrowLeft className="w-4 h-4" />}
					onClick={onCancel}
				>
					Voltar
				</Button>
				<h2 className="text-base font-bold text-ink">
					{orcamento
						? `Orçamento #${orcamento.id} — ${orcamento.cliente_nome}`
						: "Novo Orçamento"}
				</h2>
				{orcamento && <Badge status={orcamento.status} />}
				{isConvertido && orcamento?.ordem_id && (
					<span className="text-xs text-ink-muted">→ Ordem #{orcamento.ordem_id}</span>
				)}
			</div>

			{/* CORPO: painel esquerdo (histórico) + painel direito (formulário) */}
			<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 flex-1 lg:min-h-0">

				{/* ESQUERDA: histórico de versões */}
				<div className="flex flex-col gap-2 lg:overflow-y-auto lg:min-h-0 lg:pr-1">
					{!orcamento ? (
						/* Card placeholder enquanto o orçamento ainda não foi salvo */
						<div className="rounded-xl border-2 border-dashed border-violet-300 bg-violet-50/50 p-3">
							<div className="flex items-center gap-2 mb-2">
								<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-200 text-violet-700 text-2xs font-bold flex-shrink-0">
									1
								</span>
								<div>
									<p className="text-xs font-semibold text-violet-700">Novo — Orçamento v1</p>
									<p className="text-2xs text-ink-faint">Preencha o formulário ao lado</p>
								</div>
							</div>
							<p className="num text-base font-bold text-ink">
								{Utils.formatCurrency(gridSubtotal)}
							</p>
							{gridItems.filter((i) => i.servico).length > 0 && (
								<div className="mt-1.5 flex flex-wrap gap-1">
									{gridItems
										.filter((i) => i.servico)
										.slice(0, 2)
										.map((i, idx) => (
											<span
												key={idx}
												className="text-2xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded"
											>
												{Utils.displayName(i.servico)}
											</span>
										))}
									{gridItems.filter((i) => i.servico).length > 2 && (
										<span className="text-2xs text-ink-faint">
											+{gridItems.filter((i) => i.servico).length - 2}
										</span>
									)}
								</div>
							)}
						</div>
					) : (
						<>
							{!isConvertido && (
								<button
									onClick={handleNovaVersao}
									disabled={isSaving}
									className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-violet-600 border border-dashed border-violet-300 rounded-xl hover:bg-violet-50 transition w-full justify-center disabled:opacity-50"
								>
									<Plus className="w-3.5 h-3.5" /> Nova versão
								</button>
							)}
							{versoesCrono.map((v) => {
								const prevTotal = totalByVersaoNum.get(v.versao - 1);
								return (
									<OrcamentoVersionCard
										key={v.id}
										versao={v}
										prevTotal={prevTotal}
										isSelected={v.id === selectedVersaoId}
										canDelete={(orcamento.versoes?.length ?? 1) > 1 && !isConvertido}
										onClick={() => setSelectedVersaoId(v.id ?? null)}
										onDelete={() => handleExcluirVersao(v.id!)}
									/>
								);
							})}
						</>
					)}
				</div>

				{/* DIREITA: formulário */}
				<div className="flex flex-col gap-3 lg:overflow-y-auto lg:min-h-0 lg:pr-1">
					{/* Cliente + Data */}
					{!orcamento && (
						<section className={secao}>
							<div className="grid grid-cols-1 md:grid-cols-12 gap-3">
								<div className="md:col-span-8">
									<label className={rotulo}>
										Cliente <span className="text-danger-500">*</span>
									</label>
									<SearchableSelect
										options={clientOptions}
										value={formData.cliente_id}
										onChange={(val) => {
											setFormData({ ...formData, cliente_id: val });
											setFormErrors({});
										}}
										placeholder="Busque nome ou telefone..."
										fullClients={clients}
										autoFocus
									/>
									{formErrors.cliente && (
										<p className="text-2xs text-danger-600 mt-1 font-medium">
											{formErrors.cliente}
										</p>
									)}
								</div>
								<div className="md:col-span-4">
									<label className={rotulo}>Data</label>
									<Input
										type="date"
										value={formData.data}
										onChange={(e) =>
											setFormData({ ...formData, data: e.target.value })
										}
									/>
								</div>
							</div>
						</section>
					)}

					{/* Info do cliente (quando já salvo) */}
					{orcamento && (
						<section className={`${secao} flex items-center gap-3`}>
							<div className="flex-1">
								<p className="text-2xs text-ink-faint uppercase font-bold tracking-wide">Cliente</p>
								<p className="text-sm font-semibold text-ink">{orcamento.cliente_nome}</p>
							</div>
							<div>
								<p className="text-2xs text-ink-faint uppercase font-bold tracking-wide">Data</p>
								<p className="text-sm text-ink">{Utils.formatDateTime(orcamento.data)}</p>
							</div>
						</section>
					)}

					{/* Descrição */}
					<section className={secao}>
						<label className={rotulo}>
							Descrição
							<span className="ml-1.5 font-normal normal-case tracking-normal text-ink-faint">
								opcional
							</span>
						</label>
						<Textarea
							rows={2}
							placeholder="Observações, prazo combinado..."
							value={formData.descricao}
							onChange={(e) =>
								setFormData({ ...formData, descricao: e.target.value })
							}
						/>
					</section>

					{/* Atalhos de criação + grade de itens */}
					<section className={`${secao} space-y-3`}>
						<SuggestionCards
							presets={presets}
							recentes={recentes}
							clienteNome={clienteAtual?.nome}
							onAddItems={handleAddItems}
							onManage={() => {}}
						/>
						<ItemGrid
							items={gridItems}
							priceTable={priceTable}
							machines={machines}
							onChange={isConvertido ? () => {} : setGridItems}
						/>
					</section>
				</div>
			</div>

			{/* RODAPÉ */}
			<div className="flex-shrink-0 sticky bottom-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-2.5 bg-white/95 backdrop-blur border-t border-slate-200">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<p className="text-2xs text-ink-faint font-bold uppercase">Total</p>
						<p className="num text-lg font-bold text-violet-600">
							{Utils.formatCurrency(gridSubtotal)}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2 justify-end">
						<Button variant="ghost" onClick={onCancel}>
							Voltar
						</Button>
						<Button variant="secondary" onClick={handleCopiarWhatsApp}>
							<MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
						</Button>

						{/* Ações dependem do estado */}
						{!orcamento ? (
							<Button onClick={handleCriar} loading={isSaving}>
								Salvar Orçamento
							</Button>
						) : !isConvertido ? (
							<>
								<Button
									variant="secondary"
									onClick={handleAtualizarVersao}
									loading={isSaving}
								>
									Atualizar versão
								</Button>
								<Button onClick={handleNovaVersao} loading={isSaving}>
									Nova versão
								</Button>
								<Button
									onClick={handleConverter}
									className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
								>
									<ShoppingCart className="w-3.5 h-3.5 mr-1" /> Gerar ordem
								</Button>
							</>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
};
