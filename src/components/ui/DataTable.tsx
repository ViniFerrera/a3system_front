import React from "react";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

export const DataTable = ({
	children,
	isEmpty = false,
	isLoading = false,
	emptyTitle = "Nenhum registro encontrado",
	emptyDescription,
	emptyIcon,
	maxHeight,
	className = "",
}: {
	children: React.ReactNode;
	isEmpty?: boolean;
	isLoading?: boolean;
	emptyTitle?: string;
	emptyDescription?: string;
	emptyIcon?: React.ReactNode;
	/** Ex.: "60vh" — ativa rolagem vertical com cabeçalho fixo. */
	maxHeight?: string;
	className?: string;
}) => (
	// `flex flex-col`: quando o chamador passa `lg:flex-1 lg:min-h-0` no
	// `className` (ver OrdersList), é este flex column que deixa a área rolável
	// abaixo esticar até preencher a altura disponível em vez de crescer com o
	// conteúdo. Sem `min-h-0` num container flex-1, a coluna que rola nunca
	// encolhe abaixo do próprio conteúdo — e o `overflow-y-auto` não entra em
	// ação. Para quem não passa essas classes (a maioria dos usos), o
	// comportamento continua idêntico ao de antes.
	<div className={`bg-white border border-slate-200/70 rounded-2xl shadow-card overflow-hidden flex flex-col ${className}`}>
		{isLoading ? (
			<div className="p-4 space-y-2">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-10 w-full" />
				))}
			</div>
		) : isEmpty ? (
			<EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />
		) : (
			<div
				className="flex-1 min-h-0 overflow-x-auto overflow-y-auto custom-scrollbar scroll-shadow-x"
				style={maxHeight ? { maxHeight } : undefined}
			>
				<table className="w-full text-sm border-collapse">{children}</table>
			</div>
		)}
	</div>
);

/** `<thead>` com fundo próprio e posição grudenta — usar junto do DataTable. */
export const TableHead = ({ children }: { children: React.ReactNode }) => (
	<thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm">
		{children}
	</thead>
);

/** `<th>` padronizado. */
export const Th = ({
	children,
	align = "left",
	className = "",
}: {
	children?: React.ReactNode;
	align?: "left" | "right" | "center";
	className?: string;
}) => (
	<th
		className={`px-3 py-2.5 text-2xs font-bold text-ink-muted uppercase tracking-wide border-b border-slate-200 text-${align} ${className}`}
	>
		{children}
	</th>
);
