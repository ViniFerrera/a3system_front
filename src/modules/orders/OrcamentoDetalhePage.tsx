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
import { ItemGrid } from "./ItemGrid";
import { OrcamentoVersionCard } from "./OrcamentoVersionCard";
import { EditableItem, toEditableItem, createEmptyItem } from "./itemOptions";

interface Machine {
	id: number;
	nome: string;
	tipo: string;
}

interface OrcamentoDetalhePageProps {
	orcamento: Orcamento;
	clients: Client[];
	priceTable: PriceRule[];
	machines: Machine[];
	onCancel: () => void;
	onUpdated: (orc: Orcamento) => void;
	onConverted: (novaOrdem: Order, orcamentoId: number) => void;
}

export const OrcamentoDetalhePage = ({
	orcamento: orcamentoInicial,
	clients,
	priceTable,
	machines,
	onCancel,
	onUpdated,
	onConverted,
}: OrcamentoDetalhePageProps) => {
	const loading = useLoading();
	const toast = useToast();
	const confirm = useConfirm();

	const [orcamento, setOrcamento] = useState<Orcamento>(orcamentoInicial);
	const [isLoadingFull, setIsLoadingFull] = useState(true);

	useEffect(() => {
		let cancelled = false;
		api
			.get(`/orcamentos/${orcamentoInicial.id}`)
			.then((res) => {
				if (!cancelled) setOrcamento(res.data);
			})
			.catch(() => toast.error("Erro ao carregar detalhes do orçamento."))
			.finally(() => {
				if (!cancelled) setIsLoadingFull(false);
			});
		return () => {
			cancelled = true;
		};
	}, [orcamentoInicial.id]);

	const versoesCrono = useMemo(
		() => [...(orcamento.versoes ?? [])].sort((a, b) => b.versao - a.versao),
		[orcamento.versoes]
	);

	const [selectedVersaoId, setSelectedVersaoId] = useState<number | null>(null);

	useEffect(() => {
		if (versoesCrono.length > 0 && selectedVersaoId === null) {
			setSelectedVersaoId(versoesCrono[0].id ?? null);
		}
	}, [versoesCrono]);

	const selectedVersao = useMemo(
		() => (orcamento.versoes ?? []).find((v) => v.id === selectedVersaoId) ?? null,
		[orcamento.versoes, selectedVersaoId]
	);

	const [gridItems, setGridItems] = useState<EditableItem[]>([]);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (!selectedVersao) return;
		const itens = selectedVersao.itens ?? [];
		setGridItems(
			itens.length > 0
				? itens.map((i) => toEditableItem(i, priceTable))
				: [createEmptyItem()]
		);
	}, [selectedVersaoId]);

	const gridSubtotal = useMemo(
		() => gridItems.reduce((acc, i) => acc + (i.total || 0), 0),
		[gridItems]
	);

	const formatWhatsApp = useCallback(() => {
		const itensValidos = gridItems.filter((i) => i.servico);
		const dataFmt = orcamento.data
			? Utils.formatDate(orcamento.data.split("T")[0])
			: "";
		const linhas = itensValidos
			.map(
				(i) =>
					`• ${Utils.displayName(i.servico)} - ${Utils.displayName(i.material)} (${i.quantidade} unid.) — ${Utils.formatCurrency(i.total)}`
			)
			.join("\n");
		return `🖨️ *Orçamento A3 System*\nCliente: ${orcamento.cliente_nome}\nData: ${dataFmt}\n\n📋 *Serviços:*\n${linhas}\n\n💰 *Total: ${Utils.formatCurrency(gridSubtotal)}*`;
	}, [orcamento, gridItems, gridSubtotal]);

	const handleCopiarWhatsApp = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(formatWhatsApp());
			toast.success("Copiado para o clipboard!");
		} catch {
			toast.error("Não foi possível copiar.");
		}
	}, [formatWhatsApp, toast]);

	const itensPayload = () =>
		gridItems
			.filter((i) => i.servico)
			.map(({ _key, ...item }) => item);

	const handleNovaVersao = async () => {
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
			onUpdated(updated);
			setSelectedVersaoId(novaVersao.id ?? null);
			toast.success(`Versão ${novaVersao.versao} criada.`);
		} catch {
			toast.error("Erro ao criar nova versão.");
		} finally {
			setIsSaving(false);
			loading.hide();
		}
	};

	const handleAtualizarVersao = async () => {
		if (!selectedVersao?.id) return;
		setIsSaving(true);
		loading.show("Atualizando versão...");
		try {
			const res = await api.put(
				`/orcamentos/${orcamento.id}/versoes/${selectedVersao.id}`,
				{ itens: JSON.stringify(itensPayload()), total: gridSubtotal }
			);
			const updated: Orcamento = {
				...orcamento,
				versoes: (orcamento.versoes ?? []).map((v) =>
					v.id === selectedVersao.id ? { ...res.data } : v
				),
				total_atual: gridSubtotal,
			};
			setOrcamento(updated);
			onUpdated(updated);
			toast.success("Versão atualizada.");
		} catch {
			toast.error("Erro ao atualizar versão.");
		} finally {
			setIsSaving(false);
			loading.hide();
		}
	};

	const handleExcluirVersao = async (versaoId: number) => {
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
			onUpdated(updated);
			setSelectedVersaoId(sorted[0]?.id ?? null);
			toast.success("Versão excluída.");
		} catch (e: any) {
			toast.error(e?.response?.data?.error ?? "Erro ao excluir versão.");
		}
	};

	const handleConverter = async () => {
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

	const isConvertido = orcamento.status === "CONVERTIDO";

	const totalByVersaoNum = useMemo(() => {
		const m = new Map<number, number>();
		for (const v of orcamento.versoes ?? []) m.set(v.versao, v.total);
		return m;
	}, [orcamento.versoes]);

	if (isLoadingFull) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="w-8 h-8 rounded-full border-[3px] border-violet-500/30 border-t-violet-500 animate-spin" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3 lg:sticky lg:top-4 lg:h-[calc(100dvh_-_6.5rem)] lg:-mb-8">
			{/* Header */}
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
					Orçamento #{orcamento.id} — {orcamento.cliente_nome}
				</h2>
				<Badge status={orcamento.status} />
				{isConvertido && orcamento.ordem_id && (
					<span className="text-xs text-ink-muted">
						→ Ordem #{orcamento.ordem_id}
					</span>
				)}
			</div>

			{/* Corpo split */}
			<div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 flex-1 lg:min-h-0">
				{/* ESQUERDA: histórico de versões */}
				<div className="flex flex-col gap-2 lg:overflow-y-auto lg:min-h-0 lg:pr-1">
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
				</div>

				{/* DIREITA: conteúdo da versão selecionada */}
				<div className="flex flex-col gap-3 lg:overflow-y-auto lg:min-h-0">
					{selectedVersao ? (
						<>
							<div className="bg-white border border-slate-200/70 rounded-xl shadow-card p-3">
								<div className="flex items-center justify-between mb-2">
									<h3 className="text-sm font-bold text-ink">
										Versão {selectedVersao.versao}
										<span className="ml-2 text-xs font-normal text-ink-muted">
											{Utils.formatDateTime(selectedVersao.data_criacao)}
										</span>
									</h3>
								</div>
								<ItemGrid
									items={gridItems}
									priceTable={priceTable}
									machines={machines}
									onChange={isConvertido ? () => {} : setGridItems}
								/>
							</div>

							{/* Footer do painel direito */}
							<div className="flex flex-wrap gap-2 justify-between items-center bg-white border border-slate-200/70 rounded-xl p-3">
								<div>
									<p className="text-2xs text-ink-faint font-bold uppercase">Total</p>
									<p className="num text-lg font-bold text-violet-600">
										{Utils.formatCurrency(gridSubtotal)}
									</p>
								</div>
								<div className="flex flex-wrap gap-2">
									<Button variant="secondary" size="sm" onClick={handleCopiarWhatsApp}>
										<MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
									</Button>
									{!isConvertido && (
										<>
											<Button
												variant="secondary"
												size="sm"
												onClick={handleAtualizarVersao}
												loading={isSaving}
											>
												Atualizar versão
											</Button>
											<Button size="sm" onClick={handleNovaVersao} loading={isSaving}>
												Salvar como nova versão
											</Button>
											<Button
												size="sm"
												onClick={handleConverter}
												className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200"
											>
												<ShoppingCart className="w-3.5 h-3.5 mr-1" /> Gerar ordem
											</Button>
										</>
									)}
								</div>
							</div>
						</>
					) : (
						<div className="flex items-center justify-center h-32 text-ink-faint text-sm">
							Selecione uma versão à esquerda.
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
