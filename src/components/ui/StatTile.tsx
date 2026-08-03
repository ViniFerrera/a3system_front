import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

export const StatTile = ({
	label,
	value,
	sub,
	icon,
	accent = "from-primary-500 to-violet-600",
	trend,
}: {
	label: string;
	value: string;
	sub?: string;
	icon?: React.ReactNode;
	/** Gradiente da linha de acento no topo do card. */
	accent?: string;
	/** Variação percentual vs. período anterior. */
	trend?: number;
}) => (
	<div className="relative bg-white border border-slate-200/70 rounded-2xl shadow-card hover:shadow-card-hover transition-shadow duration-200 p-4 overflow-hidden">
		<div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
		<div className="flex items-start justify-between gap-2">
			<div className="min-w-0">
				<p className="text-2xs font-bold text-ink-muted uppercase tracking-wide truncate">{label}</p>
				<p className="num text-lg font-bold text-ink mt-1 leading-tight break-words">{value}</p>
			</div>
			{icon && <div className="text-ink-faint flex-shrink-0">{icon}</div>}
		</div>
		<div className="flex items-center gap-2 mt-1.5">
			{typeof trend === "number" && isFinite(trend) && (
				<span
					className={`num inline-flex items-center gap-0.5 text-2xs font-bold ${
						trend >= 0 ? "text-success-600" : "text-danger-600"
					}`}
				>
					{trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
					{Math.abs(trend).toFixed(1)}%
				</span>
			)}
			{sub && <span className="text-2xs text-ink-faint truncate">{sub}</span>}
		</div>
	</div>
);
