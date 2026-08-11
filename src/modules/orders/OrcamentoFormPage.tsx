import React, { useState, useMemo, useCallback } from "react";
import { ArrowLeft } from "lucide-react";
import { Orcamento, Client, PriceRule } from "@/types";
import { Utils } from "@/utils";
import { api } from "@/services/api";
import { useLoading } from "@/components/ui/LoadingOverlay";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { ItemGrid } from "./ItemGrid";
import { SearchableSelect } from "./SearchableSelect";
import { EditableItem, createEmptyItem } from "./itemOptions";

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
	onCancel: () => void;
	onSaved: (orc: Orcamento, modo: "criado" | "editado") => void;
}

export const OrcamentoFormPage = ({
	editingOrcamento,
	clients,
	priceTable,
	machines,
	onCancel,
	onSaved,
}: OrcamentoFormPageProps) => {
	const loading = useLoading();
	const toast = useToast();

	const [formData, setFormData] = useState({
		cliente_id: editingOrcamento?.cliente_id ?? 0,
		descricao: editingOrcamento?.descricao ?? "",
		data: editingOrcamento?.data ?? Utils.localIsoNow(),
	});

	const [gridItems, setGridItems] = useState<EditableItem[]>([createEmptyItem()]);
	const [isSaving, setIsSaving] = useState(false);
	const [formErrors, setFormErrors] = useState<{ cliente?: string }>({});

	const gridSubtotal = useMemo(
		() => gridItems.reduce((acc, i) => acc + (i.total || 0), 0),
		[gridItems]
	);

	const clientOptions = useMemo(
		() => clients.map((c) => ({ id: Number(c.id), label: c.nome })),
		[clients]
	);

	const formatWhatsApp = useCallback(() => {
		const client = clients.find((c) => Number(c.id) === formData.cliente_id);
		const itensValidos = gridItems.filter((i) => i.servico);
		const dataFmt = formData.data
			? Utils.formatDate(formData.data.split("T")[0])
			: Utils.formatDate(new Date().toISOString().split("T")[0]);
		const linhas = itensValidos
			.map(
				(i) =>
					`• ${Utils.displayName(i.servico)} - ${Utils.displayName(i.material)} (${i.quantidade} unid.) — ${Utils.formatCurrency(i.total)}`
			)
			.join("\n");
		return `🖨️ *Orçamento A3 System*\nCliente: ${client?.nome ?? "—"}\nData: ${dataFmt}\n\n📋 *Serviços:*\n${linhas}\n\n💰 *Total: ${Utils.formatCurrency(gridSubtotal)}*`;
	}, [clients, formData, gridItems, gridSubtotal]);

	const handleCopiarWhatsApp = useCallback(async () => {
		const texto = formatWhatsApp();
		try {
			await navigator.clipboard.writeText(texto);
			toast.success("Copiado para o clipboard!");
		} catch {
			toast.error("Não foi possível copiar. Use Ctrl+C manualmente.");
		}
	}, [formatWhatsApp, toast]);

	const handleSave = async () => {
		if (!formData.cliente_id) {
			setFormErrors({ cliente: "Selecione um cliente" });
			toast.error("Selecione um cliente antes de salvar.");
			return;
		}
		setFormErrors({});
		const itensValidos = gridItems
			.filter((i) => i.servico)
			.map(({ _key, ...item }) => item);
		const client = clients.find((c) => Number(c.id) === formData.cliente_id);

		setIsSaving(true);
		loading.show("Criando orçamento...");
		try {
			const payload = {
				cliente_id: formData.cliente_id,
				cliente_nome: client?.nome ?? "Desconhecido",
				descricao: formData.descricao,
				itens: JSON.stringify(itensValidos),
				total: gridSubtotal,
			};
			const res = await api.post("/orcamentos", payload);
			onSaved(res.data, "criado");
		} catch {
			toast.error("Erro ao criar o orçamento. Tente novamente.");
		} finally {
			setIsSaving(false);
			loading.hide();
		}
	};

	const secao = "bg-white border border-slate-200/70 rounded-xl shadow-card p-4";
	const rotulo = "block text-2xs font-bold text-ink-muted uppercase tracking-wide mb-1.5";

	return (
		<div className="flex flex-col gap-3 lg:sticky lg:top-4 lg:h-[calc(100dvh_-_6.5rem)] lg:-mb-8">
			<div className="flex items-center gap-2 flex-shrink-0">
				<Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={onCancel}>
					Voltar
				</Button>
				<h2 className="text-base font-bold text-ink">
					{editingOrcamento ? `Orçamento #${editingOrcamento.id}` : "Novo Orçamento"}
				</h2>
			</div>

			<div className="space-y-3 lg:overflow-y-auto lg:min-h-0 lg:pr-1 flex-1">
				{/* Cliente + Data */}
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
								value={formData.data ? formData.data.split("T")[0] : ""}
								onChange={(e) =>
									setFormData({ ...formData, data: e.target.value })
								}
							/>
						</div>
					</div>
				</section>

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

				{/* Itens */}
				<section className={`${secao} space-y-3`}>
					<ItemGrid
						items={gridItems}
						priceTable={priceTable}
						machines={machines}
						onChange={setGridItems}
					/>
				</section>
			</div>

			{/* Footer */}
			<div className="flex-shrink-0 sticky bottom-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-2.5 bg-white/95 backdrop-blur border-t border-slate-200">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<div className="flex items-center gap-3">
						<p className="text-2xs text-ink-faint font-bold uppercase">Total</p>
						<p className="num text-lg font-bold text-violet-600">
							{Utils.formatCurrency(gridSubtotal)}
						</p>
					</div>
					<div className="flex items-center gap-2 justify-end">
						<Button variant="ghost" onClick={onCancel}>
							Cancelar
						</Button>
						<Button variant="secondary" onClick={handleCopiarWhatsApp}>
							Copiar WhatsApp
						</Button>
						<Button onClick={handleSave} loading={isSaving}>
							Salvar Orçamento
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
