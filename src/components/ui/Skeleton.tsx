import React from "react";

export const Skeleton = ({ className = "" }: { className?: string }) => (
	<div className={`animate-pulse bg-slate-200/70 rounded-lg ${className}`} />
);

/** Placeholder de card de métrica, usado enquanto os dados carregam. */
export const SkeletonTile = () => (
	<div className="bg-white border border-slate-200/70 rounded-2xl p-4 space-y-3">
		<Skeleton className="h-3 w-24" />
		<Skeleton className="h-6 w-32" />
		<Skeleton className="h-3 w-20" />
	</div>
);
