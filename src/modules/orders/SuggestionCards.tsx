import React, { useMemo, useState } from "react";
import { Sparkles, Settings2, ChevronDown, History } from "lucide-react";
import { Utils } from "@/utils";
import { OrderPreset, RecentItem } from "./presetTypes";

/** "Impressao · Comum · A4 · Colorido", sem os prefixos numéricos da taxonomia. */
const descreveItem = (item: any) =>
	[item.servico, item.material, item.gramatura, item.tamanho, item.cor]
		.map((v) => Utils.displayName(v))
		.filter(Boolean)
		.join(" · ");

const CartaoPreset = ({ preset, onAdd }: { preset: OrderPreset; onAdd: () => void }) => (
	<button
		type="button"
		onClick={onAdd}
		className="text-left p-2.5 rounded-xl border border-slate-200 bg-white hover:border-primary-400 hover:shadow-sm transition group"
	>
		<p className="text-xs font-bold text-ink group-hover:text-primary-600 transition truncate">
			{preset.nome}
		</p>
		<div className="mt-1 space-y-0.5">
			{preset.itens.slice(0, 2).map((item, idx) => (
				<p key={idx} className="text-2xs text-ink-muted leading-snug truncate">
					{descreveItem(item)}
				</p>
			))}
		</div>
		<p className="num text-2xs text-ink-faint mt-1.5">
			{preset.itens.length} {preset.itens.length === 1 ? "item" : "itens"}
		</p>
	</button>
);

/**
 * Sugestões da seção Material: as favoritas em destaque, o resto atrás de
 * "Ver todas", e o histórico do cliente logo abaixo.
 */
export const SuggestionCards = ({
	presets,
	recentes,
	clienteNome,
	onAddItems,
	onManage,
}: {
	presets: OrderPreset[];
	recentes: RecentItem[];
	clienteNome?: string;
	onAddItems: (itens: any[]) => void;
	onManage: () => void;
}) => {
	const [expandido, setExpandido] = useState(false);

	const favoritas = useMemo(() => presets.filter((p) => p.favorito), [presets]);
	// Sem nenhuma favorita, mostra as primeiras por posição para a seção não
	// nascer vazia — com um aviso de como favoritar.
	const semFavorita = favoritas.length === 0;
	const destaque = (semFavorita ? presets : favoritas).slice(0, 4);
	const restante = presets.filter((p) => !destaque.some((d) => d.id === p.id));

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<label className="text-2xs font-bold text-ink-muted uppercase tracking-wide flex items-center gap-1.5">
					<Sparkles className="w-3.5 h-3.5 text-primary-500" />
					Sugestões
				</label>
				<div className="flex items-center gap-3">
					{restante.length > 0 && (
						<button
							type="button"
							onClick={() => setExpandido((v) => !v)}
							className="flex items-center gap-1 text-2xs font-semibold text-ink-muted hover:text-primary-600 transition"
						>
							<ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandido ? "rotate-180" : ""}`} />
							{expandido ? "Ver menos" : `Ver todas (${restante.length})`}
						</button>
					)}
					<button
						type="button"
						onClick={onManage}
						className="flex items-center gap-1 text-2xs font-semibold text-ink-muted hover:text-primary-600 transition"
					>
						<Settings2 className="w-3.5 h-3.5" /> Gerenciar
					</button>
				</div>
			</div>

			{presets.length === 0 ? (
				<p className="text-xs text-ink-faint italic">Nenhuma pré-definição cadastrada.</p>
			) : (
				<>
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
						{destaque.map((p) => (
							<CartaoPreset key={p.id} preset={p} onAdd={() => onAddItems(p.itens)} />
						))}
					</div>
					{semFavorita && (
						<p className="text-2xs text-ink-faint">
							Marque suas favoritas em <b>Gerenciar</b> para elas aparecerem aqui.
						</p>
					)}
					{expandido && restante.length > 0 && (
						<div className="grid grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
							{restante.map((p) => (
								<CartaoPreset key={p.id} preset={p} onAdd={() => onAddItems(p.itens)} />
							))}
						</div>
					)}
				</>
			)}

			{recentes.length > 0 && (
				<div className="pt-2 border-t border-slate-100">
					<label className="text-2xs font-bold text-ink-muted uppercase tracking-wide flex items-center gap-1.5 mb-2">
						<History className="w-3.5 h-3.5 text-success-500" />
						{clienteNome ? `${clienteNome} costuma pedir` : "Costuma pedir"}
					</label>
					<div className="flex flex-wrap gap-2">
						{recentes.map((item, idx) => (
							<button
								key={idx}
								type="button"
								onClick={() => onAddItems([item])}
								className="px-3 py-1.5 rounded-full border border-success-200 bg-success-50/50 text-2xs text-ink hover:border-success-500 hover:bg-success-50 transition"
							>
								{descreveItem(item)}
								<span className="num text-ink-faint ml-1.5">
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
