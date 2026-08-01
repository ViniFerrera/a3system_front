import React from "react";
import { UserPlus, Repeat, Clock } from "lucide-react";
import { Utils } from "@/utils";
import { SkeletonTile } from "@/components/ui/Skeleton";
import { DashboardMetrics } from "@/services/dashboardMetrics";

export const RetentionCard = ({ metrics }: { metrics: DashboardMetrics | null }) => {
	if (!metrics) return <SkeletonTile />;

	const { novos, recorrentes, pctPedidoUnico, sumidos } = metrics.retencao;
	// Atenção: esta soma é a receita dos clientes IDENTIFICADOS, não o
	// faturamento do período — a rota deixa as vendas de balcão de fora.
	const receitaIdentificada = novos.receita + recorrentes.receita;
	const pctRecorrente = receitaIdentificada > 0 ? (recorrentes.receita / receitaIdentificada) * 100 : 0;
	const ticketNovo = novos.pedidos > 0 ? novos.receita / novos.pedidos : 0;
	const ticketRecorrente = recorrentes.pedidos > 0 ? recorrentes.receita / recorrentes.pedidos : 0;

	return (
		<div className="bg-white border border-slate-200/70 rounded-2xl shadow-card p-5">
			<h4 className="text-base font-bold text-ink">Retenção de clientes</h4>
			<p className="text-xs text-ink-faint mt-0.5 mb-4">
				Novos contra recorrentes — receita e volume no período
			</p>

			<div className="grid grid-cols-2 gap-3">
				<div className="bg-surface-sunken rounded-xl p-3 border border-slate-100">
					<p className="text-2xs font-bold text-ink-muted uppercase flex items-center gap-1.5">
						<UserPlus className="w-3.5 h-3.5 text-info-500" /> Novos
					</p>
					<p className="num text-lg font-bold text-ink mt-1">{Utils.formatCurrency(novos.receita)}</p>
					<p className="num text-2xs text-ink-faint mt-0.5">
						{novos.clientes} clientes · {novos.pedidos} OS · ticket {Utils.formatCurrency(ticketNovo)}
					</p>
				</div>
				<div className="bg-surface-sunken rounded-xl p-3 border border-slate-100">
					<p className="text-2xs font-bold text-ink-muted uppercase flex items-center gap-1.5">
						<Repeat className="w-3.5 h-3.5 text-success-500" /> Recorrentes
					</p>
					<p className="num text-lg font-bold text-ink mt-1">{Utils.formatCurrency(recorrentes.receita)}</p>
					<p className="num text-2xs text-ink-faint mt-0.5">
						{recorrentes.clientes} clientes · {recorrentes.pedidos} OS · ticket {Utils.formatCurrency(ticketRecorrente)}
					</p>
				</div>
			</div>

			<div className="flex items-center gap-4 mt-4 text-xs">
				<div className="flex-1">
					<div className="flex justify-between mb-1">
						<span className="text-ink-muted font-semibold">Receita de recorrentes</span>
						<span className="num font-bold text-ink">{pctRecorrente.toFixed(0)}%</span>
					</div>
					<div className="h-2 bg-slate-100 rounded-full overflow-hidden">
						<div className="h-full bg-gradient-to-r from-success-500 to-emerald-600 rounded-full" style={{ width: `${pctRecorrente}%` }} />
					</div>
				</div>
			</div>

			{/* O denominador de `pctPedidoUnico` é todo cliente desde o piso de dados
			    reais — dizer só "dos clientes" faria parecer que responde ao período. */}
			<p className="num text-2xs text-ink-faint mt-2">
				{pctPedidoUnico.toFixed(0)}% dos clientes compraram uma única vez desde dez/2025
				(histórico completo, não afetado pelo período selecionado).
			</p>

			{sumidos.length > 0 && (
				<div className="mt-4 pt-3 border-t border-slate-100">
					<p className="text-2xs font-bold text-ink-muted uppercase flex items-center gap-1.5 mb-2">
						<Clock className="w-3.5 h-3.5 text-warning-500" /> Clientes sem pedido há mais de 60 dias
					</p>
					<div className="space-y-1.5 max-h-44 overflow-y-auto custom-scrollbar pr-1">
						{/* Índice na chave: a rota agrupa por `cliente_id` e nomes repetem. */}
						{sumidos.map((s, i) => (
							<div key={`${i}-${s.nome}`} className="flex items-center gap-2 text-xs">
								<span className="font-semibold text-ink-muted flex-1 truncate">{s.nome}</span>
								<span className="num text-2xs text-ink-faint">{s.diasSem}d</span>
								<span className="num text-xs font-bold text-ink">{Utils.formatCurrency(s.receitaHistorica)}</span>
							</div>
						))}
					</div>
				</div>
			)}

			<p className="text-2xs text-ink-faint mt-3 pt-3 border-t border-slate-100 leading-relaxed">
				Novos e recorrentes somam apenas os clientes identificados
				({Utils.formatCurrency(receitaIdentificada)}) — as vendas de balcão ficam de fora,
				então esta soma não é o faturamento do período mostrado no KPI de Receita.
			</p>
		</div>
	);
};
