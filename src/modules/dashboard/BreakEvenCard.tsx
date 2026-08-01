import React from "react";
import { Target, TrendingUp, AlertTriangle } from "lucide-react";
import { Utils } from "@/utils";
import { SkeletonTile } from "@/components/ui/Skeleton";
import { DashboardMetrics } from "@/services/dashboardMetrics";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const rotuloMes = (mes: string) => {
	const [y, m] = mes.split("-");
	return `${MESES[Number(m) - 1]}/${y.slice(2)}`;
};

export const BreakEvenCard = ({ metrics }: { metrics: DashboardMetrics | null }) => {
	if (!metrics) return <SkeletonTile />;

	const { receita, custo, faltam, pctAtingido, projecaoFechamento, mes } = metrics.breakEven;
	const atingiu = faltam <= 0;
	const pctBarra = Math.min(pctAtingido, 100);
	const pctProjecao = custo > 0 ? Math.min((projecaoFechamento / custo) * 100, 100) : 0;

	return (
		<div className="bg-white border border-slate-200/70 rounded-2xl shadow-card p-5">
			<div className="flex items-start justify-between gap-3 mb-4">
				<div>
					<h4 className="text-base font-bold text-ink flex items-center gap-2">
						<Target className="w-4 h-4 text-primary-500" /> Ponto de equilíbrio — {rotuloMes(mes)}
					</h4>
					<p className="text-xs text-ink-faint mt-0.5">
						Receita do mês contra o custo lançado no mês
					</p>
				</div>
				<span
					className={`num text-xs font-bold px-2.5 py-1 rounded-full ${
						atingiu ? "bg-success-50 text-success-700" : "bg-warning-50 text-warning-700"
					}`}
				>
					{pctAtingido.toFixed(0)}%
				</span>
			</div>

			<div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
				<div
					className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${
						atingiu ? "bg-gradient-to-r from-success-500 to-success-600" : "bg-gradient-to-r from-warning-500 to-danger-500"
					}`}
					style={{ width: `${pctBarra}%` }}
				/>
				{/* Marca onde o mês deve fechar no ritmo atual */}
				{!atingiu && pctProjecao > pctBarra && (
					<div
						className="absolute inset-y-0 w-0.5 bg-primary-500"
						style={{ left: `${pctProjecao}%` }}
						title="Projeção de fechamento no ritmo atual"
					/>
				)}
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
				<div>
					<p className="text-2xs text-ink-faint font-bold uppercase">Receita do mês</p>
					<p className="num text-sm font-bold text-ink mt-0.5">{Utils.formatCurrency(receita)}</p>
				</div>
				<div>
					{/* Não é o KPI "Despesas" desta tela: aqui entram pagas + pendentes. */}
					<p className="text-2xs text-ink-faint font-bold uppercase">Custo lançado no mês</p>
					<p className="num text-sm font-bold text-ink mt-0.5">{Utils.formatCurrency(custo)}</p>
				</div>
				<div>
					<p className="text-2xs text-ink-faint font-bold uppercase">
						{atingiu ? "Sobra" : "Faltam"}
					</p>
					<p className={`num text-sm font-bold mt-0.5 ${atingiu ? "text-success-600" : "text-danger-600"}`}>
						{Utils.formatCurrency(atingiu ? receita - custo : faltam)}
					</p>
				</div>
				<div>
					<p className="text-2xs text-ink-faint font-bold uppercase">Projeção</p>
					<p className="num text-sm font-bold text-primary-600 mt-0.5">
						{Utils.formatCurrency(projecaoFechamento)}
					</p>
				</div>
			</div>

			<p className="text-2xs text-ink-faint mt-3 flex items-start gap-1.5">
				{atingiu ? (
					<><TrendingUp className="w-3.5 h-3.5 text-success-500 flex-shrink-0 mt-px" /> O mês já cobriu o custo lançado.</>
				) : (
					<><AlertTriangle className="w-3.5 h-3.5 text-warning-500 flex-shrink-0 mt-px" /> No ritmo atual, o mês fecha {projecaoFechamento >= custo ? "acima" : "abaixo"} do equilíbrio.</>
				)}
			</p>

			<p className="text-2xs text-ink-faint mt-2 pt-2 border-t border-slate-100 leading-relaxed">
				O custo lançado no mês soma as despesas <strong className="font-semibold">pagas e pendentes</strong> com
				vencimento no mês — por isso costuma ser maior que o KPI “Despesas” acima, que conta só as pagas.
				A receita e o custo são sempre do mês inteiro, independentes do período filtrado.
			</p>
		</div>
	);
};
