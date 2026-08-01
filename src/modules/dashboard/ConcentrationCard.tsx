import React from "react";
import { Users } from "lucide-react";
import { Utils } from "@/utils";
import { SkeletonTile } from "@/components/ui/Skeleton";
import { DashboardMetrics } from "@/services/dashboardMetrics";

export const ConcentrationCard = ({ metrics }: { metrics: DashboardMetrics | null }) => {
	if (!metrics) return <SkeletonTile />;

	const { top5, top5Pct, receitaTotal } = metrics.concentracao;

	return (
		<div className="bg-white border border-slate-200/70 rounded-2xl shadow-card p-5">
			<div className="flex items-start justify-between gap-3">
				<div>
					<h4 className="text-base font-bold text-ink flex items-center gap-2">
						<Users className="w-4 h-4 text-primary-500" /> Concentração
					</h4>
					<p className="text-xs text-ink-faint mt-0.5">
						Peso dos cinco maiores na receita de clientes identificados
					</p>
				</div>
				<span className="num text-xl font-bold text-primary-600">{top5Pct.toFixed(0)}%</span>
			</div>

			<div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mt-4">
				<div
					className="h-full bg-gradient-to-r from-primary-500 to-violet-500 rounded-full transition-all duration-500"
					style={{ width: `${Math.min(top5Pct, 100)}%` }}
				/>
			</div>

			<div className="space-y-2 mt-4">
				{top5.map((c, i) => (
					<div key={c.nome} className="flex items-center gap-2.5">
						<span className="num text-2xs font-bold text-ink-faint w-4">{i + 1}</span>
						<span className="text-xs font-semibold text-ink-muted flex-1 truncate">{c.nome}</span>
						<span className="num text-2xs text-ink-faint">{c.pedidos} OS</span>
						<span className="num text-xs font-bold text-ink">{Utils.formatCurrency(c.receita)}</span>
					</div>
				))}
			</div>

			{/*
				NÃO rotular como "receita total do período": a rota exclui o "Cliente
				Balcão" das análises de cliente, então este valor é menor que o KPI de
				Receita da mesma tela. Rótulo ambíguo aqui vira decisão errada.
			*/}
			<p className="text-2xs text-ink-faint mt-3 pt-3 border-t border-slate-100 leading-relaxed">
				Receita de clientes identificados: <span className="num font-semibold">{Utils.formatCurrency(receitaTotal)}</span>.
				As vendas de balcão ficam de fora deste bloco — elas entram no KPI de Receita, que por isso é maior.
			</p>
		</div>
	);
};
