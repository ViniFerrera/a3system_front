import React from "react";
import { Trash2 } from "lucide-react";
import { OrcamentoVersao } from "@/types";
import { Utils } from "@/utils";

interface OrcamentoVersionCardProps {
	versao: OrcamentoVersao;
	prevTotal?: number;
	isSelected: boolean;
	canDelete: boolean;
	onClick: () => void;
	onDelete: () => void;
}

export const OrcamentoVersionCard = React.memo(function OrcamentoVersionCard({
	versao,
	prevTotal,
	isSelected,
	canDelete,
	onClick,
	onDelete,
}: OrcamentoVersionCardProps) {
	const delta = prevTotal !== undefined ? versao.total - prevTotal : null;

	return (
		<div
			onClick={onClick}
			className={`relative cursor-pointer rounded-xl border p-3 transition-all ${
				isSelected
					? "border-violet-400 bg-violet-50 ring-2 ring-violet-200"
					: "border-slate-200 bg-white hover:border-violet-200 hover:bg-violet-50/30"
			}`}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex items-center gap-2">
					<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-2xs font-bold flex-shrink-0">
						{versao.versao}
					</span>
					<div>
						<p className="text-xs font-semibold text-ink">Versão {versao.versao}</p>
						<p className="text-2xs text-ink-faint">{Utils.formatDateTime(versao.data_criacao)}</p>
					</div>
				</div>
				{canDelete && (
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onDelete();
						}}
						className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
						title="Excluir versão"
					>
						<Trash2 className="w-3.5 h-3.5" />
					</button>
				)}
			</div>

			<div className="mt-2 flex items-center justify-between">
				<p className="num text-base font-bold text-ink">{Utils.formatCurrency(versao.total)}</p>
				{delta !== null && delta !== 0 && (
					<span
						className={`text-2xs font-bold px-1.5 py-0.5 rounded-md ${
							delta > 0
								? "bg-emerald-50 text-emerald-600"
								: "bg-red-50 text-red-600"
						}`}
					>
						{delta > 0 ? "+" : ""}
						{Utils.formatCurrency(delta)}
					</span>
				)}
			</div>

			{versao.itens && versao.itens.length > 0 && (
				<div className="mt-1.5 flex flex-wrap gap-1">
					{versao.itens.slice(0, 2).map((item, idx) => (
						<span
							key={idx}
							className="text-2xs bg-slate-100 text-ink-muted px-1.5 py-0.5 rounded"
						>
							{Utils.displayName(item.servico)}
						</span>
					))}
					{versao.itens.length > 2 && (
						<span className="text-2xs text-ink-faint">
							+{versao.itens.length - 2}
						</span>
					)}
				</div>
			)}
		</div>
	);
});
