import React from "react";
import { Utils } from "@/utils";
import { SkeletonTile } from "@/components/ui/Skeleton";
import { DashboardMetrics } from "@/services/dashboardMetrics";

export const TicketBandsCard = ({ metrics }: { metrics: DashboardMetrics | null }) => {
	if (!metrics) return <SkeletonTile />;

	const faixas = metrics.faixasTicket;
	const totalPedidos = faixas.reduce((a, f) => a + f.pedidos, 0);
	const maxPedidos = Math.max(...faixas.map((f) => f.pedidos), 1);

	return (
		<div className="bg-white border border-slate-200/70 rounded-2xl shadow-card p-5">
			<h4 className="text-base font-bold text-ink">Faixas de ticket</h4>
			<p className="text-xs text-ink-faint mt-0.5 mb-4">
				Quantos pedidos e quanta receita em cada faixa de valor
			</p>
			{totalPedidos === 0 ? (
				<p className="text-sm text-ink-faint text-center py-6">Sem pedidos no período</p>
			) : (
				<div className="space-y-2.5">
					{faixas.map((f) => {
						const pct = (f.pedidos / totalPedidos) * 100;
						return (
							<div key={f.faixa}>
								<div className="flex items-center justify-between text-xs mb-1">
									<span className="font-semibold text-ink-muted">{f.faixa}</span>
									<span className="num text-ink-faint">
										{f.pedidos} ({pct.toFixed(0)}%) · {Utils.formatCurrency(f.receita)}
									</span>
								</div>
								<div className="h-2 bg-slate-100 rounded-full overflow-hidden">
									<div
										className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500"
										style={{ width: `${(f.pedidos / maxPedidos) * 100}%` }}
									/>
								</div>
							</div>
						);
					})}
				</div>
			)}
			<p className="text-2xs text-ink-faint mt-4 pt-3 border-t border-slate-100 leading-relaxed">
				Considera todos os pedidos não cancelados do período, vendas de balcão incluídas.
				Os filtros de serviço, pagamento e status desta tela não se aplicam a este bloco.
			</p>
		</div>
	);
};
