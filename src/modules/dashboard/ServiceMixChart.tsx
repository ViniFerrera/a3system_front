import React from "react";
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Utils } from "@/utils";
import { EmptyState } from "@/components/ui/EmptyState";

export interface ServiceMixPoint {
	name: string;
	revenue: number;
	/** Nº de OS que contêm o serviço — não a quantidade de itens. */
	volume: number;
	ticket: number;
}

export const ServiceMixChart = ({ data }: { data: ServiceMixPoint[] }) => (
	<div className="bg-white border border-slate-200/70 rounded-2xl shadow-card p-5">
		<h4 className="text-base font-bold text-ink">Mix por serviço</h4>
		{/* Os dois eixos de valor estão ocultos e têm escalas diferentes — sem
		    dizer isso, comparar o comprimento das duas barras induz a erro. */}
		<p className="text-xs text-ink-faint mt-0.5 mb-4">
			Receita, pedidos e ticket médio por tipo — as barras usam escalas próprias
			(reais e nº de OS); compare cada cor com ela mesma
		</p>
		{data.length === 0 ? (
			<EmptyState title="Sem dados no período" />
		) : (
			<>
				<ResponsiveContainer width="100%" height={230}>
					<ComposedChart data={data} layout="vertical" margin={{ left: 0, right: 10 }}>
						<CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
						{/* Duas escalas de valor: reais e contagem de OS não cabem no mesmo eixo —
						    com um eixo só, a barra de pedidos vira um fio invisível. */}
						<XAxis xAxisId="rec" type="number" hide />
						<XAxis xAxisId="vol" type="number" hide />
						<YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100}
							tick={{ fill: "#475569", fontSize: 11, fontWeight: 600 }} />
						<Tooltip
							formatter={(value: number, name: string) =>
								name === "Receita" ? Utils.formatCurrency(value) : `${value} pedidos`
							}
							contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: "12px" }}
						/>
						<Legend wrapperStyle={{ fontSize: "11px" }} />
						<Bar xAxisId="rec" dataKey="revenue" name="Receita" fill="#6366f1" radius={[0, 6, 6, 0]} barSize={11} />
						<Bar xAxisId="vol" dataKey="volume" name="Pedidos" fill="#c7d2fe" radius={[0, 6, 6, 0]} barSize={11} />
					</ComposedChart>
				</ResponsiveContainer>
				<div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
					{data.slice(0, 3).map((s) => (
						<div key={s.name} className="flex items-center justify-between text-xs">
							<span className="text-ink-muted font-medium truncate pr-2">{s.name}</span>
							<span className="num text-ink-faint">
								ticket {Utils.formatCurrency(s.ticket)}
							</span>
						</div>
					))}
				</div>
			</>
		)}
	</div>
);
