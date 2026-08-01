import React, { useState } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/services/api";
import { PriceRule } from "@/types";
import { ItemGrid } from "./ItemGrid";
import { OrderPreset } from "./PresetBar";
import {
	EditableItem,
	createEmptyItem,
	toEditableItem,
} from "./itemOptions";

interface Machine {
	id: number;
	nome: string;
	tipo: string;
}

/** CRUD das pré-definições, reaproveitando a mesma grade do formulário de ordem. */
export const PresetManagerModal = ({
	isOpen,
	onClose,
	presets,
	priceTable,
	machines,
	onChanged,
}: {
	isOpen: boolean;
	onClose: () => void;
	presets: OrderPreset[];
	priceTable: PriceRule[];
	machines: Machine[];
	onChanged: () => void;
}) => {
	const [editandoId, setEditandoId] = useState<number | "novo" | null>(null);
	const [nome, setNome] = useState("");
	const [itens, setItens] = useState<EditableItem[]>([]);
	const [salvando, setSalvando] = useState(false);

	const fecharEdicao = () => {
		setEditandoId(null);
		setNome("");
		setItens([]);
	};

	const abrirNovo = () => {
		setEditandoId("novo");
		setNome("");
		setItens([createEmptyItem()]);
	};

	const abrirEdicao = (preset: OrderPreset) => {
		setEditandoId(preset.id);
		setNome(preset.nome);
		setItens(preset.itens.map((i) => toEditableItem(i, priceTable)));
	};

	const salvar = async () => {
		if (!nome.trim()) return alert("Dê um nome à pré-definição.");
		const validos = itens.filter((i) => i.servico);
		if (validos.length === 0)
			return alert("Adicione ao menos um item com serviço definido.");

		// Só os campos que definem o item — preço é recalculado ao aplicar.
		const payload = validos.map((i) => ({
			servico: i.servico,
			material: i.material,
			gramatura: i.gramatura || "-",
			tamanho: i.tamanho || "-",
			cor: i.cor || "-",
			quantidade: Number(i.quantidade) || 1,
			is_double_sided: !!i.is_double_sided,
		}));

		setSalvando(true);
		try {
			if (editandoId === "novo") {
				await api.post("/order-presets", {
					nome: nome.trim(),
					itens: payload,
					posicao: presets.length + 1,
				});
			} else {
				await api.put(`/order-presets/${editandoId}`, {
					nome: nome.trim(),
					itens: payload,
				});
			}
			onChanged();
			fecharEdicao();
		} catch (e: any) {
			alert(e?.response?.data?.error || "Erro ao salvar pré-definição.");
		} finally {
			setSalvando(false);
		}
	};

	const remover = async (preset: OrderPreset) => {
		if (!confirm(`Apagar a pré-definição "${preset.nome}"?`)) return;
		try {
			await api.delete(`/order-presets/${preset.id}`);
			onChanged();
			if (editandoId === preset.id) fecharEdicao();
		} catch {
			alert("Erro ao apagar pré-definição.");
		}
	};

	return (
		<Modal
			isOpen={isOpen}
			onClose={() => {
				fecharEdicao();
				onClose();
			}}
			title="Gerenciar Pré-definições"
			size="xl"
		>
			<div className="space-y-4">
				{editandoId === null ? (
					<>
						<div className="flex justify-end">
							<button
								type="button"
								onClick={abrirNovo}
								className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-[10px] hover:bg-indigo-700 font-bold text-sm transition"
							>
								<Plus className="w-4 h-4" /> Nova pré-definição
							</button>
						</div>

						<div className="space-y-2">
							{presets.length === 0 && (
								<p className="text-sm text-slate-400 text-center py-8">
									Nenhuma pré-definição cadastrada.
								</p>
							)}
							{presets.map((preset) => (
								<div
									key={preset.id}
									className="flex items-center justify-between gap-3 p-3 rounded-[10px] border border-slate-200 bg-white"
								>
									<div className="min-w-0">
										<p className="text-sm font-bold text-slate-800">
											{preset.nome}
										</p>
										<p className="text-2xs text-slate-500 mt-0.5">
											{preset.itens.length}{" "}
											{preset.itens.length === 1 ? "item" : "itens"}
										</p>
									</div>
									<div className="flex items-center gap-1 flex-shrink-0">
										<button
											type="button"
											onClick={() => abrirEdicao(preset)}
											className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[8px] transition"
											title="Editar"
										>
											<Edit2 className="w-4 h-4" />
										</button>
										<button
											type="button"
											onClick={() => remover(preset)}
											className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[8px] transition"
											title="Apagar"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								</div>
							))}
						</div>
					</>
				) : (
					<>
						<div>
							<label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
								Nome
							</label>
							<input
								type="text"
								className="w-full border border-slate-200 rounded-[10px] p-2.5 text-sm outline-none focus:border-indigo-400"
								value={nome}
								onChange={(e) => setNome(e.target.value)}
								placeholder="Ex.: Adesivo + Silhouette"
							/>
						</div>

						<div>
							<label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
								Itens
							</label>
							<ItemGrid
								items={itens}
								priceTable={priceTable}
								machines={machines}
								onChange={setItens}
							/>
						</div>

						<div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
							<button
								type="button"
								onClick={fecharEdicao}
								className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 font-medium px-4 text-sm"
							>
								<X className="w-4 h-4" /> Cancelar
							</button>
							<button
								type="button"
								onClick={salvar}
								disabled={salvando}
								className="flex items-center gap-1.5 bg-indigo-600 text-white px-5 py-2.5 rounded-[10px] hover:bg-indigo-700 font-bold text-sm disabled:opacity-50 transition"
							>
								<Save className="w-4 h-4" /> Salvar
							</button>
						</div>
					</>
				)}
			</div>
		</Modal>
	);
};
