import React, { useEffect, useState } from "react";
import { Settings2, Sparkles, History } from "lucide-react";
import { api } from "@/services/api";
import { Utils } from "@/utils";

export interface OrderPreset {
	id: number;
	nome: string;
	itens: any[];
	posicao: number;
	ativo: boolean;
}

export interface RecentItem {
	servico: string;
	material: string;
	gramatura?: string;
	tamanho?: string;
	cor?: string;
	is_double_sided?: boolean;
	quantidade: number;
	vezes: number;
}

/** "1_Impressao · 1_Comum · A4 · Colorido" com os prefixos numéricos removidos. */
const descreveItem = (item: any) =>
	[item.servico, item.material, item.gramatura, item.tamanho, item.cor]
		.map((v) => Utils.displayName(v))
		.filter(Boolean)
		.join(" · ");

/**
 * Pré-definições de ordem e sugestões baseadas no histórico do cliente.
 *
 * Clicar acrescenta linhas à grade (não substitui), então dá para empilhar
 * mais de um preset numa mesma ordem.
 */
export const PresetBar = ({
	clienteId,
	clienteNome,
	onAddItems,
	onManage,
	presets,
}: {
	clienteId?: number;
	clienteNome?: string;
	onAddItems: (itens: any[]) => void;
	onManage: () => void;
	presets: OrderPreset[];
}) => {
	const [recentes, setRecentes] = useState<RecentItem[]>([]);

	useEffect(() => {
		if (!clienteId) {
			setRecentes([]);
			return;
		}
		let cancelado = false;
		api
			.get(`/clients/${clienteId}/recent-items?limit=3`)
			.then((res) => {
				if (!cancelado) setRecentes(Array.isArray(res.data) ? res.data : []);
			})
			.catch(() => {
				if (!cancelado) setRecentes([]);
			});
		return () => {
			cancelado = true;
		};
	}, [clienteId]);

	return (
		<div className="space-y-3">
			<div>
				<div className="flex items-center justify-between mb-2">
					<label className="text-2xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
						<Sparkles className="w-3.5 h-3.5 text-indigo-500" />
						Pré-definições
					</label>
					<button
						type="button"
						onClick={onManage}
						className="flex items-center gap-1 text-2xs font-semibold text-slate-500 hover:text-indigo-600 transition"
					>
						<Settings2 className="w-3.5 h-3.5" /> Gerenciar
					</button>
				</div>

				{presets.length === 0 ? (
					<p className="text-xs text-slate-400 italic">
						Nenhuma pré-definição cadastrada.
					</p>
				) : (
					<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
						{presets.map((preset) => (
							<button
								key={preset.id}
								type="button"
								onClick={() => onAddItems(preset.itens)}
								className="text-left p-2.5 rounded-[10px] border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-sm transition group"
							>
								<p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition">
									{preset.nome}
								</p>
								<div className="mt-1 space-y-0.5">
									{preset.itens.map((item, idx) => (
										<p key={idx} className="text-2xs text-slate-500 leading-snug">
											{descreveItem(item)}
										</p>
									))}
								</div>
								<p className="text-[9px] text-slate-400 mt-1.5">
									{preset.itens.length}{" "}
									{preset.itens.length === 1 ? "item" : "itens"}
								</p>
							</button>
						))}
					</div>
				)}
			</div>

			{recentes.length > 0 && (
				<div>
					<label className="text-2xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mb-2">
						<History className="w-3.5 h-3.5 text-emerald-500" />
						{clienteNome ? `${clienteNome} costuma pedir` : "Costuma pedir"}
					</label>
					<div className="flex flex-wrap gap-2">
						{recentes.map((item, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => onAddItems([item])}
								className="px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50/50 text-2xs text-slate-700 hover:border-emerald-400 hover:bg-emerald-50 transition"
							>
								{descreveItem(item)}
								<span className="text-slate-400 ml-1.5">
									· qtd {item.quantidade} · {item.vezes}x
								</span>
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
