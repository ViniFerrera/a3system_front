import React from "react";
import {
	ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Utils } from "@/utils";

export interface VolumePoint {
	name: string;
	receita: number;
	volume: number;
}

export const VolumeRevenueChart = ({ data }: { data: VolumePoint[] }) => (
	<div className="bg-white border border-slate-200/70 rounded-2xl shadow-card p-5">
		<h4 className="text-base font-bold text-ink">Volume × Receita</h4>
		<p className="text-xs text-ink-faint mt-0.5 mb-4">
			Quando as linhas se descolam, o ticket médio mudou
		</p>
		<ResponsiveContainer width="100%" height={230}>
			<ComposedChart data={data} margin={{ left: -5, right: 5 }}>
				<CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
				<XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
				{/* Escalas separadas: sem `yAxisId` explícito o Recharts mistura pedidos com reais. */}
				<YAxis yAxisId="vol" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} />
				<YAxis yAxisId="rec" orientation="right" axisLine={false} tickLine={false}
					tick={{ fill: "#94a3b8", fontSize: 11 }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
				<Tooltip
					formatter={(value: number, name: string) =>
						name === "Receita" ? Utils.formatCurrency(value) : `${value} pedidos`
					}
					contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,.1)", fontSize: "12px" }}
				/>
				<Legend wrapperStyle={{ fontSize: "11px" }} />
				<Bar yAxisId="vol" dataKey="volume" name="Pedidos" fill="#c7d2fe" radius={[5, 5, 0, 0]} barSize={18} />
				<Line yAxisId="rec" type="monotone" dataKey="receita" name="Receita" stroke="#10b981" strokeWidth={2.5}
					dot={{ r: 3, fill: "#10b981", strokeWidth: 0 }} />
			</ComposedChart>
		</ResponsiveContainer>
	</div>
);
