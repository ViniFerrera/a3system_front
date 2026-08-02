import React from "react";
import { Users } from "lucide-react";
import { Utils } from "@/utils";
import { SkeletonTile } from "@/components/ui/Skeleton";
import { DashboardMetrics } from "@/services/dashboardMetrics";

export const ConcentrationCard = ({ metrics }: { metrics: DashboardMetrics | null }) => {
	if (!metrics) return <SkeletonTile />;

	// Tolerância à janela de deploy: backend e frontend publicam em serviços
	// diferentes, então o frontend novo pode receber o JSON antigo (top5/top5Pct).
	const { receitaTotal } = metrics.concentracao;
	const top = metrics.concentracao.top ?? [];
	const topPct = metrics.concentracao.topPct ?? 0;

	return (
		<div className="bg-white border border-slate-200/70 rounded-2xl shadow-card p-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h4 className="text-base font-bold text-ink flex items-center gap-2">
						<Users className="w-4 h-4 text-primary-500" /> Concentração
					</h4>
					<p className="text-xs text-ink-faint mt-0.5">Peso dos dez maiores na receita do período</p>
				</div>
				<span className="num text-xl font-bold text-primary-600">{topPct.toFixed(0)}%</span>
			</div>

			<div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mt-4">
				<div
					className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full transition-all duration-500"
					style={{ width: `${Math.min(topPct, 100)}%` }}
				/>
			</div>

			<div className="space-y-2 mt-4 max-h-64 overflow-y-auto custom-scrollbar pr-1">
				{/* A chave leva o índice: a rota agrupa por `cliente_id` e dois ids
				    distintos podem carregar o mesmo nome. */}
				{top.map((c, i) => (
					<div key={`${i}-${c.nome}`} className="flex items-center gap-2.5">
						<span className="num text-2xs font-bold text-ink-faint w-4">{i + 1}</span>
						<span className="text-xs font-semibold text-ink-muted flex-1 truncate">{c.nome}</span>
						<span className="num text-2xs text-ink-faint">{c.pedidos} OS</span>
						<span className="num text-xs font-bold text-ink">{Utils.formatCurrency(c.receita)}</span>
					</div>
				))}
			</div>

			<p className="text-2xs text-ink-faint mt-3 pt-3 border-t border-slate-100 leading-relaxed">
				Receita total do período: <span className="num font-semibold">{Utils.formatCurrency(receitaTotal)}</span>.
			</p>
		</div>
	);
};
